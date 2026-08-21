use sea_orm::prelude::{Date, Uuid};
use sea_orm::{ConnectionTrait, DbBackend, FromQueryResult, Statement, TransactionTrait};
use serde::Serialize;
use utoipa::ToSchema;

use super::{Portal, PortalError, db_down};
use crate::auth::AuthError;
use crate::tokens::{Scope, balances_of};

const DAILY_TAPS: &str = r#"
SELECT
    (
        (
            to_timestamp(t."time")
            AT TIME ZONE 'America/New_York'
        ) - INTERVAL '12 hours'
    )::DATE AS "day",
    COUNT(*)::BIGINT AS "taps",
    COUNT(*) FILTER (WHERE NOT c."secret")::BIGINT AS "eligible_taps"
FROM "tap_events" t
JOIN "challenge" c
    ON c."id" = t."challenge_id"
WHERE t."user_id" = $1
GROUP BY 1
ORDER BY 1 DESC
"#;

const TAP_HISTORY: &str = r#"
SELECT
    t."id" AS "id",
    t."challenge_id" AS "challenge_id",
    c."name" AS "challenge",
    t."time" AS "time",
    to_char(
        to_timestamp(t."time") AT TIME ZONE 'America/New_York',
        'YYYY-MM-DD HH24:MI:SS'
    ) AS "local_time",
    (
        (
            to_timestamp(t."time")
            AT TIME ZONE 'America/New_York'
        ) - INTERVAL '12 hours'
    )::DATE AS "day",
    NOT c."secret" AS "gem_eligible",
    EXISTS (
        SELECT 1
        FROM "daily_challenge" dc
        WHERE dc."user_id" = t."user_id"
          AND dc."challenge_id" = t."challenge_id"
          AND dc."day" = (
              (
                  to_timestamp(t."time")
                  AT TIME ZONE 'America/New_York'
              ) - INTERVAL '12 hours'
          )::DATE
    ) AS "daily_bonus"
FROM "tap_events" t
JOIN "challenge" c
    ON c."id" = t."challenge_id"
WHERE t."user_id" = $1
ORDER BY t."time" ASC, t."id" ASC
"#;

const MOVE_TAP: &str = r#"
WITH current_tap AS (
    SELECT
        "id",
        to_timestamp("time")
            AT TIME ZONE 'America/New_York' AS "local_time"
    FROM "tap_events"
    WHERE "user_id" = $1
      AND "id" = $2
),
shifted AS (
    SELECT
        "id",
        $3::date::timestamp
            + INTERVAL '12 hours'
            + (
                "local_time"
                - (
                    (
                        (
                            "local_time" - INTERVAL '12 hours'
                        )::date
                    )::timestamp
                    + INTERVAL '12 hours'
                )
            ) AS "new_local_time"
    FROM current_tap
)
UPDATE "tap_events" AS t
SET "time" = EXTRACT(
    EPOCH FROM (
        shifted."new_local_time"
        AT TIME ZONE 'America/New_York'
    )
)::BIGINT
FROM shifted
WHERE t."id" = shifted."id"
"#;

#[derive(Debug, FromQueryResult)]
struct TapDay {
    day: Date,
    taps: i64,
    eligible_taps: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ActivityDay {
    pub day: Date,
    pub taps: i64,
    pub eligible_taps: i64,
    pub gemstones: i64,
}

#[derive(Debug, FromQueryResult, Serialize, ToSchema)]
pub struct ActivityTap {
    pub id: Uuid,
    pub challenge_id: Uuid,
    pub challenge: String,
    pub time: i64,
    pub local_time: String,
    pub day: Date,
    pub gem_eligible: bool,
    pub daily_bonus: bool,
}

impl Portal {
    pub async fn daily_activity(&self, user: Uuid) -> Result<Vec<ActivityDay>, PortalError> {
        let taps = TapDay::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            DAILY_TAPS,
            [user.into()],
        ))
        .all(&self.db)
        .await
        .map_err(db_down)?;

        let mut activity = Vec::with_capacity(taps.len());

        for tap in taps {
            let balances = balances_of(&self.db, user, Scope::On(tap.day)).await?;

            activity.push(ActivityDay {
                day: tap.day,
                taps: tap.taps,
                eligible_taps: tap.eligible_taps,
                gemstones: balances.thistlestones,
            });
        }

        Ok(activity)
    }

    pub async fn activity_taps(&self, user: Uuid) -> Result<Vec<ActivityTap>, PortalError> {
        ActivityTap::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            TAP_HISTORY,
            [user.into()],
        ))
        .all(&self.db)
        .await
        .map_err(db_down)
        .map_err(PortalError::from)
    }

    pub async fn move_taps_to_day(
        &self,
        user: Uuid,
        tap_ids: &[Uuid],
        day: Date,
    ) -> Result<u64, PortalError> {
        let mut tap_ids = tap_ids.to_vec();
        tap_ids.sort_unstable();
        tap_ids.dedup();

        if tap_ids.is_empty() {
            return Ok(0);
        }

        let txn = self.db.begin().await.map_err(db_down)?;

        for tap_id in &tap_ids {
            let statement = Statement::from_sql_and_values(
                DbBackend::Postgres,
                MOVE_TAP,
                [user.into(), (*tap_id).into(), day.into()],
            );

            let result = txn.execute_raw(statement).await.map_err(db_down)?;

            if result.rows_affected() != 1 {
                txn.rollback().await.ok();

                return Err(PortalError::Auth(AuthError::NotFound("tap_unknown")));
            }
        }

        txn.commit().await.map_err(db_down)?;

        Ok(tap_ids.len() as u64)
    }
}
