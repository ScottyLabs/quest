use sea_orm::prelude::{Date, Uuid};
use sea_orm::{DbBackend, FromQueryResult, Statement};
use serde::Serialize;
use utoipa::ToSchema;

use super::{Portal, PortalError, db_down};
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
}
