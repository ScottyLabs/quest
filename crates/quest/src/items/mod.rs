pub mod options;
pub mod routes;

use std::collections::HashMap;

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
    "items"."image_url"      AS "image_url",
    "items"."background_url" AS "background_url",
    "items"."icon_shade"     AS "icon_shade",
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

const LEDGER: &str = r#"
SELECT
    "purchases"."purchase_id"                    AS "purchase_id",
    "purchases"."item_id"                        AS "item_id",
    "items"."name"                               AS "name",
    "purchases"."quantity"                       AS "quantity",
    "purchases"."unit_cost"                      AS "cost",
    "items"."image_url"                          AS "image_url",
    "purchases"."received_item_date" IS NOT NULL AS "delivered"
FROM "purchases"
JOIN "items" ON "items"."id" = "purchases"."item_id"
WHERE "purchases"."user_id" = $1
ORDER BY "purchases"."purchase_id" DESC
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
    pub background_url: Option<String>,
    pub icon_shade: Option<String>,
    pub stock: i64,
}

#[derive(Debug, FromQueryResult)]
struct Sold {
    sold: i64,
}

pub struct Chose {
    pub label: String,
    pub value: String,
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
    pub chosen: Vec<Chose>,
}

#[derive(Debug, FromQueryResult)]
pub struct Ledger {
    pub purchase_id: i64,
    pub item_id: Uuid,
    pub name: String,
    pub quantity: i64,
    pub cost: i64,
    pub image_url: Option<String>,
    pub delivered: bool,
}

pub struct Refunded {
    pub refunded: i64,
    pub scottycoins: i64,
}

impl Items {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn scottycoins(&self, user: Uuid) -> Result<i64, AuthError> {
        Ok(balances_of(&self.db, user, Scope::Lifetime)
            .await?
            .scottycoins)
    }
    pub async fn list(&self) -> Result<Vec<Stocked>, AuthError> {
        let mut stocked =
            Stocked::find_by_statement(Statement::from_string(DbBackend::Postgres, IN_STOCK))
                .all(&self.db)
                .await
                .map_err(db_down)?;

        let ids: Vec<Uuid> = stocked.iter().map(|item| item.id).collect();
        let defined = self.options_of(&ids).await?;

        for item in &mut stocked {
            if let Some(stock) = defined
                .get(&item.id)
                .and_then(|defined| options::managed_stock(defined))
            {
                item.stock = stock;
            }
        }

        Ok(stocked)
    }

    pub async fn options_of(
        &self,
        items: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<entity::item_option::Model>>, AuthError> {
        let mut grouped: HashMap<Uuid, Vec<entity::item_option::Model>> = HashMap::new();

        for row in options::of_items(&self.db, items).await? {
            grouped.entry(row.item_id).or_default().push(row);
        }

        Ok(grouped)
    }

    pub async fn set_options(
        &self,
        item: Uuid,
        specs: Vec<options::Spec>,
    ) -> Result<Vec<entity::item_option::Model>, AuthError> {
        options::replace(&self.db, item, specs).await
    }

    pub async fn picks_of(
        &self,
        purchases: &[i64],
    ) -> Result<HashMap<i64, Vec<entity::purchase_option::Model>>, AuthError> {
        let mut grouped: HashMap<i64, Vec<entity::purchase_option::Model>> = HashMap::new();

        for row in options::of_purchases(&self.db, purchases).await? {
            grouped.entry(row.purchase_id).or_default().push(row);
        }

        Ok(grouped)
    }

    pub async fn purchase(
        &self,
        user: Uuid,
        item: Uuid,
        quantity: i64,
        chosen: &[options::Choice],
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

        let defined = options::of_item(&txn, item).await?;
        let picked = options::resolve(&defined, chosen)?;

        let stock = if let Some(stock) = options::managed_stock(&defined) {
            stock
        } else {
            let sold = Sold::find_by_statement(Statement::from_sql_and_values(
                DbBackend::Postgres,
                SOLD,
                [item.into()],
            ))
            .one(&txn)
            .await
            .map_err(db_down)?
            .map_or(0, |count| count.sold);

            (row.quantity_available - sold).max(0)
        };

        if quantity > stock {
            return Err(AuthError::Conflict("out_of_stock"));
        }

        let unit_cost = picked.iter().find_map(|pick| pick.cost).unwrap_or(row.cost);

        if unit_cost < 0 {
            return Err(AuthError::BadRequest("option_price_invalid"));
        }

        let spent = unit_cost
            .checked_mul(quantity)
            .ok_or(AuthError::BadRequest("quantity_invalid"))?;

        let balance = balances_of(&txn, user, Scope::Lifetime).await?;

        if spent > balance.scottycoins {
            return Err(AuthError::Conflict("insufficient_coins"));
        }
        options::take_stock(&txn, &defined, &picked, quantity).await?;

        let saved = purchases::ActiveModel {
            user_id: ActiveValue::Set(user),
            item_id: ActiveValue::Set(item),
            quantity: ActiveValue::Set(quantity),
            unit_cost: ActiveValue::Set(unit_cost),
            ..Default::default()
        }
        .insert(&txn)
        .await
        .map_err(db_down)?;

        let chosen: Vec<Chose> = picked
            .iter()
            .map(|pick| Chose {
                label: pick.label.clone(),
                value: pick.value.clone(),
            })
            .collect();

        options::attach(&txn, saved.purchase_id, picked).await?;

        txn.commit().await.map_err(db_down)?;

        Ok(Receipt {
            purchase_id: saved.purchase_id,
            item: row.id,
            name: row.name,
            cost: unit_cost,
            quantity,
            spent,
            stock: stock - quantity,
            scottycoins: balance.scottycoins - spent,
            chosen,
        })
    }

    pub async fn purchases(&self, user: Uuid) -> Result<Vec<Ledger>, AuthError> {
        Ledger::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            LEDGER,
            [user.into()],
        ))
        .all(&self.db)
        .await
        .map_err(db_down)
    }

    pub async fn refund(
        &self,
        user: Uuid,
        purchase: i64,
        quantity: i64,
    ) -> Result<Refunded, AuthError> {
        if quantity < 1 {
            return Err(AuthError::BadRequest("refund_quantity_invalid"));
        }

        let txn = self.db.begin().await.map_err(db_down)?;

        let found = purchases::Entity::find_by_id(purchase)
            .lock_exclusive()
            .one(&txn)
            .await
            .map_err(db_down)?;

        let Some(row) = found.filter(|row| row.user_id == user) else {
            txn.rollback().await.ok();
            return Err(AuthError::NotFound("purchase_unknown"));
        };

        if row.received_item_date.is_some() {
            txn.rollback().await.ok();
            return Err(AuthError::Conflict("purchase_delivered"));
        }

        if quantity > row.quantity {
            txn.rollback().await.ok();
            return Err(AuthError::Conflict("refund_too_large"));
        }

        let item = items::Entity::find_by_id(row.item_id)
            .lock_exclusive()
            .one(&txn)
            .await
            .map_err(db_down)?;

        let Some(_item) = item else {
            txn.rollback().await.ok();
            return Err(AuthError::NotFound("item_unknown"));
        };

        let refunded = row
            .unit_cost
            .checked_mul(quantity)
            .ok_or(AuthError::BadRequest("refund_quantity_invalid"))?;

        options::restore_stock(&txn, row.item_id, row.purchase_id, quantity).await?;

        let remaining = row.quantity - quantity;
        if remaining == 0 {
            purchases::Entity::delete_by_id(row.purchase_id)
                .exec(&txn)
                .await
                .map_err(db_down)?;
        } else {
            purchases::ActiveModel {
                purchase_id: ActiveValue::Unchanged(row.purchase_id),
                quantity: ActiveValue::Set(remaining),
                ..Default::default()
            }
            .update(&txn)
            .await
            .map_err(db_down)?;
        }

        let balance = balances_of(&txn, user, Scope::Lifetime).await?;

        txn.commit().await.map_err(db_down)?;

        Ok(Refunded {
            refunded,
            scottycoins: balance.scottycoins,
        })
    }
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("items: {err}");
    AuthError::Upstream("database_unavailable")
}
