pub mod routes;

use entity::challenge;
use sea_orm::prelude::{Date, DateTimeWithTimeZone, Uuid};
use sea_orm::{
    ConnectionTrait, DatabaseConnection, DbBackend, DbErr, EntityTrait, FromQueryResult, Statement,
    TransactionTrait,
};

use crate::auth::AuthError;
use crate::day::GEM_DAY;

const POOL: &str = r#"
SELECT "challenge"."id" AS "id"
FROM "challenge"
WHERE "challenge"."open_from" <= $2
  AND EXISTS (
      SELECT 1 FROM "challenge_card"
      WHERE "challenge_card"."challenge_id" = "challenge"."id"
        AND "challenge_card"."retired_at" IS NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM "daily_challenge"
      WHERE "daily_challenge"."user_id" = $1
        AND "daily_challenge"."challenge_id" = "challenge"."id"
  )
  AND NOT EXISTS (
      SELECT 1 FROM "tap_events"
      WHERE "tap_events"."user_id" = $1
        AND "tap_events"."challenge_id" = "challenge"."id"
  )
ORDER BY random()
LIMIT 1
"#;

const STANDING: &str = r#"
SELECT "challenge_id" FROM "daily_challenge"
WHERE "user_id" = $1 AND "day" = $2
"#;

const CLAIM: &str = r#"
INSERT INTO "daily_challenge" ("user_id", "challenge_id", "day")
VALUES ($1, $2, $3)
ON CONFLICT ("user_id", "day") DO NOTHING
"#;

#[derive(Clone)]
pub struct Daily {
    db: DatabaseConnection,
}

#[derive(Clone, Copy)]
pub struct Moment {
    pub at: DateTimeWithTimeZone,
    pub day: Date,
}

pub struct Assignment {
    pub day: Date,
    pub challenge: Option<challenge::Model>,
}

#[derive(FromQueryResult)]
struct Row {
    challenge_id: Uuid,
}

#[derive(FromQueryResult)]
struct Pick {
    id: Uuid,
}

#[derive(FromQueryResult)]
struct Stamp {
    at: DateTimeWithTimeZone,
    day: Date,
}

impl Daily {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn today(&self, user: Uuid) -> Result<Assignment, AuthError> {
        let txn = self.db.begin().await.map_err(db_down)?;

        let when = moment(&txn).await?;

        let id = match standing(&txn, user, when.day).await? {
            Some(id) => Some(id),
            None => assign(&txn, user, when).await?,
        };

        let found = match id {
            Some(id) => Some(
                challenge::Entity::find_by_id(id)
                    .one(&txn)
                    .await
                    .map_err(db_down)?
                    .ok_or(AuthError::Upstream("challenge_row_missing"))?,
            ),
            None => None,
        };

        txn.commit().await.map_err(db_down)?;

        Ok(Assignment {
            day: when.day,
            challenge: found,
        })
    }
}

pub async fn moment<C: ConnectionTrait>(conn: &C) -> Result<Moment, AuthError> {
    let stamp = Stamp::find_by_statement(Statement::from_string(
        DbBackend::Postgres,
        format!(r#"SELECT now() AS "at", {GEM_DAY} AS "day""#),
    ))
    .one(conn)
    .await
    .map_err(db_down)?
    .ok_or(AuthError::Upstream("gem_day_missing"))?;

    Ok(Moment {
        at: stamp.at,
        day: stamp.day,
    })
}

pub async fn standing<C: ConnectionTrait>(
    conn: &C,
    user: Uuid,
    day: Date,
) -> Result<Option<Uuid>, AuthError> {
    let found = Row::find_by_statement(Statement::from_sql_and_values(
        DbBackend::Postgres,
        STANDING,
        [user.into(), day.into()],
    ))
    .one(conn)
    .await
    .map_err(db_down)?;

    Ok(found.map(|row| row.challenge_id))
}

pub async fn assign<C: ConnectionTrait>(
    conn: &C,
    user: Uuid,
    when: Moment,
) -> Result<Option<Uuid>, AuthError> {
    let Some(pick) = eligible(conn, user, when.at).await? else {
        return Ok(None);
    };

    conn.execute_raw(Statement::from_sql_and_values(
        DbBackend::Postgres,
        CLAIM,
        [user.into(), pick.into(), when.day.into()],
    ))
    .await
    .map_err(db_down)?;

    standing(conn, user, when.day).await
}

pub async fn eligible<C: ConnectionTrait>(
    conn: &C,
    user: Uuid,
    at: DateTimeWithTimeZone,
) -> Result<Option<Uuid>, AuthError> {
    let found = Pick::find_by_statement(Statement::from_sql_and_values(
        DbBackend::Postgres,
        POOL,
        [user.into(), at.into()],
    ))
    .one(conn)
    .await
    .map_err(db_down)?;

    Ok(found.map(|row| row.id))
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("daily: {err}");
    AuthError::Upstream("database_unavailable")
}
