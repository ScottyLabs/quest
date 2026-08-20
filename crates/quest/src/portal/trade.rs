use std::collections::HashMap;

use sea_orm::prelude::{Date, Uuid};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, FromQueryResult, Statement};
use serde::Serialize;
use utoipa::ToSchema;

use super::{PortalError, db_down, sql_failed};
use crate::auth::AuthError;
use crate::items::options;

const LEDGER_CAP: u64 = 500;

const LEDGER: &str = r#"
SELECT p."purchase_id",
       u."id"                AS "user_id",
       u."andrew_id",
       i."id"                AS "item_id",
       i."name"              AS "item",
       p."unit_cost"         AS "cost",
       p."quantity",
       p."received_item_date"
FROM "purchases" p
JOIN "users" u ON u."id" = p."user_id"
JOIN "items" i ON i."id" = p."item_id"
WHERE ($1::text IS NULL OR u."andrew_id" = $1)
  AND ($2::bool IS NULL OR (p."received_item_date" IS NOT NULL) = $2)
ORDER BY p."purchase_id" DESC
LIMIT $3
"#;

const SALES_TOTALS: &str = r#"
SELECT
    i."id" AS "item_id",
    i."name" AS "item",
    COALESCE(SUM(p."quantity"), 0)::BIGINT AS "sold"
FROM "items" i
LEFT JOIN "purchases" p ON p."item_id" = i."id"
GROUP BY i."id", i."name"
ORDER BY i."name"
"#;

const SALES_OPTIONS: &str = r#"
SELECT
    p."item_id" AS "item_id",
    po."label" AS "label",
    po."value" AS "value",
    SUM(p."quantity")::BIGINT AS "sold"
FROM "purchases" p
JOIN "purchase_option" po
    ON po."purchase_id" = p."purchase_id"
GROUP BY
    p."item_id",
    po."label",
    po."value"
ORDER BY
    p."item_id",
    po."label",
    po."value"
"#;

const HOLDER: &str = r#"
SELECT u."id",
       u."andrew_id",
       u."dorm",
       COALESCE(w."name", u."andrew_id") AS "name"
FROM "users" u
LEFT JOIN "wallet_pass" w ON w."user_id" = u."id"
WHERE u."andrew_id" = $1
"#;

const FULFIL: &str = r#"
UPDATE "purchases"
SET "received_item_date" = CASE WHEN $2 THEN current_date ELSE NULL END
WHERE "purchase_id" = $1
RETURNING "received_item_date"
"#;

#[derive(Debug, FromQueryResult)]
struct OrderRow {
    pub purchase_id: i64,
    pub user_id: Uuid,
    pub andrew_id: String,
    pub item_id: Uuid,
    pub item: String,
    pub cost: i64,
    pub quantity: i64,
    pub received_item_date: Option<Date>,
}

#[derive(Debug, FromQueryResult)]
struct SalesTotalRow {
    item_id: Uuid,
    item: String,
    sold: i64,
}

#[derive(Debug, FromQueryResult)]
struct SalesOptionRow {
    item_id: Uuid,
    label: String,
    value: String,
    sold: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SalesOptionView {
    pub label: String,
    pub value: String,
    pub sold: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SalesItemView {
    pub item_id: Uuid,
    pub item: String,
    pub sold: i64,
    pub options: Vec<SalesOptionView>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DeskPickView {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OrderView {
    pub purchase_id: i64,
    pub user_id: Uuid,
    pub andrew_id: String,
    pub item_id: Uuid,
    pub item: String,
    pub cost: i64,
    pub quantity: i64,
    pub received_item_date: Option<Date>,
    pub options: Vec<DeskPickView>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Fulfilled {
    pub purchase_id: i64,
    pub received_item_date: Option<Date>,
}

#[derive(Clone)]
pub struct Desk {
    db: DatabaseConnection,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PassHolder {
    pub user_id: Uuid,
    pub andrew_id: String,
    pub name: String,
    pub dorm: Option<String>,
    pub verified: bool,
    pub issued_at: Option<i64>,
    pub scottycoins: i64,
    pub thistlestones: i64,
    pub orders: Vec<OrderView>,
}

impl Desk {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn orders(
        &self,
        andrew_id: Option<&str>,
        delivered: Option<bool>,
        limit: Option<u64>,
    ) -> Result<Vec<OrderView>, PortalError> {
        let limit = limit.unwrap_or(100).clamp(1, LEDGER_CAP) as i64;

        let rows = OrderRow::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            LEDGER,
            [
                andrew_id.map(str::to_owned).into(),
                delivered.into(),
                limit.into(),
            ],
        ))
        .all(&self.db)
        .await
        .map_err(sql_failed)?;

        let ids: Vec<i64> = rows.iter().map(|row| row.purchase_id).collect();

        let mut picked: HashMap<i64, Vec<DeskPickView>> = HashMap::new();
        for pick in options::of_purchases(&self.db, &ids)
            .await
            .map_err(PortalError::Auth)?
        {
            picked
                .entry(pick.purchase_id)
                .or_default()
                .push(DeskPickView {
                    label: pick.label,
                    value: pick.value,
                });
        }

        Ok(rows
            .into_iter()
            .map(|row| OrderView {
                options: picked.remove(&row.purchase_id).unwrap_or_default(),
                purchase_id: row.purchase_id,
                user_id: row.user_id,
                andrew_id: row.andrew_id,
                item_id: row.item_id,
                item: row.item,
                cost: row.cost,
                quantity: row.quantity,
                received_item_date: row.received_item_date,
            })
            .collect())
    }

    pub async fn fulfil(&self, purchase: i64, delivered: bool) -> Result<Fulfilled, PortalError> {
        let found = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                FULFIL,
                [purchase.into(), delivered.into()],
            ))
            .await
            .map_err(sql_failed)?
            .ok_or(PortalError::Auth(AuthError::NotFound("purchase_unknown")))?;

        Ok(Fulfilled {
            purchase_id: purchase,
            received_item_date: found.try_get("", "received_item_date").map_err(db_down)?,
        })
    }

    pub async fn holder(
        &self,
        andrew_id: &str,
        issued_at: Option<i64>,
    ) -> Result<PassHolder, PortalError> {
        let found = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                HOLDER,
                [andrew_id.into()],
            ))
            .await
            .map_err(sql_failed)?
            .ok_or(PortalError::Auth(AuthError::NotFound("user_unknown")))?;

        let user_id: Uuid = found.try_get("", "id").map_err(db_down)?;
        let balances =
            crate::tokens::balances_of(&self.db, user_id, crate::tokens::Scope::Lifetime)
                .await
                .map_err(PortalError::Auth)?;

        Ok(PassHolder {
            andrew_id: found.try_get("", "andrew_id").map_err(db_down)?,
            name: found.try_get("", "name").map_err(db_down)?,
            dorm: found.try_get("", "dorm").map_err(db_down)?,
            user_id,
            verified: issued_at.is_some(),
            issued_at,
            scottycoins: balances.scottycoins,
            thistlestones: balances.thistlestones,
            orders: self.orders(Some(andrew_id), None, Some(LEDGER_CAP)).await?,
        })
    }
    pub async fn sales(&self) -> Result<Vec<SalesItemView>, PortalError> {
        let totals = SalesTotalRow::find_by_statement(Statement::from_string(
            DbBackend::Postgres,
            SALES_TOTALS,
        ))
        .all(&self.db)
        .await
        .map_err(sql_failed)?;

        let option_rows = SalesOptionRow::find_by_statement(Statement::from_string(
            DbBackend::Postgres,
            SALES_OPTIONS,
        ))
        .all(&self.db)
        .await
        .map_err(sql_failed)?;

        let mut options: HashMap<Uuid, Vec<SalesOptionView>> = HashMap::new();

        for row in option_rows {
            options
                .entry(row.item_id)
                .or_default()
                .push(SalesOptionView {
                    label: row.label,
                    value: row.value,
                    sold: row.sold,
                });
        }

        Ok(totals
            .into_iter()
            .map(|row| SalesItemView {
                item_id: row.item_id,
                item: row.item,
                sold: row.sold,
                options: options.remove(&row.item_id).unwrap_or_default(),
            })
            .collect())
    }
}
