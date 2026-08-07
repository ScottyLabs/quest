pub mod routes;

use entity::{items, purchases};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveModelTrait, ActiveValue, DatabaseConnection, DbBackend, DbErr, EntityTrait,
    FromQueryResult, QuerySelect, Statement, TransactionTrait,
};

use crate::auth::AuthError;
use crate::tokens::{Scope, balances_of};

const IN_STOCK: &str = r#"
SELECT
    "items"."id"          AS "id",
    "items"."name"        AS "name",
    "items"."description" AS "description",
    "items"."cost"        AS "cost",
    "items"."image_url"   AS "image_url",
    GREATEST(
        "items"."quantity_available" - COALESCE(SUM("purchases"."quantity"), 0),
        0
    )::BIGINT AS "stock"
FROM "items"
LEFT JOIN "purchases" ON "purchases"."item_id" = "items"."id"
GROUP BY "items"."id"
ORDER BY "items"."name"
"#;

const SOLD: &str = r#"
SELECT COALESCE(SUM("quantity"), 0)::BIGINT AS "sold"
FROM "purchases"
WHERE "item_id" = $1
"#;

#[derive(Clone)]
pub struct Items {
    db: DatabaseConnection,
}

#[derive(Debug, FromQueryResult)]
pub struct Stocked {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub cost: i64,
    pub image_url: Option<String>,
    pub stock: i64,
}

#[derive(Debug, FromQueryResult)]
struct Sold {
    sold: i64,
}

pub struct Receipt {
    pub purchase_id: i64,
    pub item: Uuid,
    pub name: String,
    pub cost: i64,
    pub quantity: i64,
    pub spent: i64,
    pub stock: i64,
    pub scottycoins: i64,
}

impl Items {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn list(&self) -> Result<Vec<Stocked>, AuthError> {
        Stocked::find_by_statement(Statement::from_string(DbBackend::Postgres, IN_STOCK))
            .all(&self.db)
            .await
            .map_err(db_down)
    }

    pub async fn purchase(
        &self,
        user: Uuid,
        item: Uuid,
        quantity: i64,
    ) -> Result<Receipt, AuthError> {
        if quantity < 1 {
            return Err(AuthError::BadRequest("quantity_invalid"));
        }

        let txn = self.db.begin().await.map_err(db_down)?;

        let row = items::Entity::find_by_id(item)
            .lock_exclusive()
            .one(&txn)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::NotFound("item_unknown"))?;

        let sold = Sold::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            SOLD,
            [item.into()],
        ))
        .one(&txn)
        .await
        .map_err(db_down)?
        .map_or(0, |count| count.sold);

        let stock = (row.quantity_available - sold).max(0);
        if quantity > stock {
            return Err(AuthError::Conflict("out_of_stock"));
        }

        let spent = row
            .cost
            .checked_mul(quantity)
            .ok_or(AuthError::BadRequest("quantity_invalid"))?;

        let balance = balances_of(&txn, user, Scope::Lifetime).await?;
        if spent > balance.scottycoins {
            return Err(AuthError::Conflict("insufficient_coins"));
        }

        let saved = purchases::ActiveModel {
            user_id: ActiveValue::Set(user),
            item_id: ActiveValue::Set(item),
            quantity: ActiveValue::Set(quantity),
            ..Default::default()
        }
        .insert(&txn)
        .await
        .map_err(db_down)?;

        txn.commit().await.map_err(db_down)?;

        Ok(Receipt {
            purchase_id: saved.purchase_id,
            item: row.id,
            name: row.name,
            cost: row.cost,
            quantity,
            spent,
            stock: stock - quantity,
            scottycoins: balance.scottycoins - spent,
        })
    }
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("items: {err}");
    AuthError::Upstream("database_unavailable")
}
