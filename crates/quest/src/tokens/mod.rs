pub mod routes;

use std::sync::LazyLock;

use sea_orm::prelude::{Date, Uuid};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::Serialize;
use utoipa::ToSchema;

use crate::auth::AuthError;
use crate::day::GEM_DAY;

const DAILY_CAP: i64 = 10;

const DAILY_BONUS: i64 = 5;

static BALANCES: LazyLock<String> = LazyLock::new(|| {
    format!(
        r#"
WITH target AS (
    SELECT CASE
        WHEN $5 THEN {GEM_DAY}
        ELSE $4
    END AS "day"
),
earned AS (
    SELECT tap."challenge_id", tap."coin_value", tap."day"
    FROM (
        SELECT
            "tap_events"."challenge_id" AS "challenge_id",
            "challenge"."coin_value" AS "coin_value",
            (
                (
                    to_timestamp("tap_events"."time")
                    AT TIME ZONE 'America/New_York'
                ) - INTERVAL '12 hours'
            )::DATE AS "day"
        FROM "tap_events"
        JOIN "challenge"
            ON "challenge"."id" = "tap_events"."challenge_id"
        WHERE "tap_events"."user_id" = $1
          AND NOT "challenge"."secret"
    ) tap
    CROSS JOIN target
    WHERE target."day" IS NULL
       OR target."day" = tap."day"
),
spent AS (
    SELECT
        COALESCE(
            SUM("purchases"."quantity" * "items"."cost"),
            0
        )::BIGINT AS "total"
    FROM "purchases"
    JOIN "items"
        ON "items"."id" = "purchases"."item_id"
    CROSS JOIN target
    WHERE "purchases"."user_id" = $1
      AND target."day" IS NULL
),
capped AS (
    SELECT
        "day",
        LEAST(COUNT(*), $2)::BIGINT AS "stones"
    FROM earned
    GROUP BY "day"
),
bonus AS (
    SELECT
        earned."day" AS "day",
        (COUNT(*) * $3)::BIGINT AS "stones"
    FROM "daily_challenge"
    JOIN earned
        ON earned."challenge_id" = "daily_challenge"."challenge_id"
        AND earned."day" = "daily_challenge"."day"
    WHERE "daily_challenge"."user_id" = $1
    GROUP BY earned."day"
),
corrections AS (
    SELECT
        correction."day" AS "day",
        correction."target"::BIGINT AS "stones"
    FROM "gemstone_correction" correction
    CROSS JOIN target
    WHERE correction."user_id" = $1
      AND (
          target."day" IS NULL
          OR target."day" = correction."day"
      )
),
gem_days AS (
    SELECT "day" FROM capped
    UNION
    SELECT "day" FROM bonus
    UNION
    SELECT "day" FROM corrections
),
effective AS (
    SELECT
        days."day",
        GREATEST(
            COALESCE(capped."stones", 0)
                + COALESCE(bonus."stones", 0),
            COALESCE(corrections."stones", 0)
        )::BIGINT AS "stones"
    FROM gem_days days
    LEFT JOIN capped
        ON capped."day" = days."day"
    LEFT JOIN bonus
        ON bonus."day" = days."day"
    LEFT JOIN corrections
        ON corrections."day" = days."day"
)
SELECT
    target."day"::TEXT AS "day",
    (
        COALESCE(
            (SELECT SUM("coin_value") FROM earned),
            0
        ) - spent."total"
    )::BIGINT AS "scottycoins",
    CASE
        WHEN COALESCE(
            (SELECT "player" FROM "users" WHERE "id" = $1),
            FALSE
        )
        THEN COALESCE(
            (SELECT SUM("stones") FROM effective),
            0
        )::BIGINT
        ELSE 0::BIGINT
    END AS "thistlestones"
FROM target, spent
"#
    )
});

pub enum Scope {
    Lifetime,
    Today,
    On(Date),
}

impl Scope {
    fn bind(self) -> (Option<Date>, bool) {
        match self {
            Self::Lifetime => (None, false),
            Self::Today => (None, true),
            Self::On(day) => (Some(day), false),
        }
    }
}

#[derive(Clone)]
pub struct Tokens {
    db: DatabaseConnection,
}

#[derive(Debug, FromQueryResult, Serialize, ToSchema)]
pub struct Balances {
    pub day: Option<String>,
    pub scottycoins: i64,
    pub thistlestones: i64,
}

impl Tokens {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn balances(&self, user: Uuid, scope: Scope) -> Result<Balances, AuthError> {
        balances_of(&self.db, user, scope).await
    }
}

pub async fn balances_of<C: ConnectionTrait>(
    conn: &C,
    user: Uuid,
    scope: Scope,
) -> Result<Balances, AuthError> {
    let (day, today) = scope.bind();

    Balances::find_by_statement(Statement::from_sql_and_values(
        DbBackend::Postgres,
        BALANCES.as_str(),
        [
            user.into(),
            DAILY_CAP.into(),
            DAILY_BONUS.into(),
            day.into(),
            today.into(),
        ],
    ))
    .one(conn)
    .await
    .map_err(db_down)?
    .ok_or(AuthError::Upstream("balances_missing"))
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("tokens: {err}");
    AuthError::Upstream("database_unavailable")
}
