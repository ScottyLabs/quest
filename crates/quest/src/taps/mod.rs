pub mod routes;

use std::sync::Arc;

use entity::geography::Point;
use entity::{challenge, challenge_card, failed_taps, tap_events};
use quest::crypto::{VerifyError, verify_tap};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, DbErr, EntityTrait,
    PaginatorTrait, QueryFilter, QuerySelect, Statement, TransactionTrait,
};

use crate::auth::AuthError;

#[derive(Clone)]
pub struct Taps {
    db: DatabaseConnection,
    master: Arc<[u8; 32]>,
}

pub struct Read {
    pub card_id: String,
    pub counter: i64,
}

pub struct Recorded {
    pub first: bool,
    pub place: i64,
}

#[derive(Copy, Clone, Debug)]
pub struct Fix {
    pub at: Point,
    pub accuracy: Option<f32>,
}

pub enum Proximity {
    Accept,
    #[allow(dead_code)]
    Reject(Option<&'static str>),
}

pub fn proximity(_challenge: Option<Point>, _tapped: Option<Point>) -> Proximity {
    //TODO: IMPLEMENT PROXIMIMITY CHECKING
    Proximity::Accept
}

// The board hides locked quests, but a poster tag still reads in the background.
pub fn locked(challenge: &challenge::Model) -> bool {
    challenge.open_from > chrono::Utc::now()
}

const REASONS: [&str; 9] = [
    "tap_body_invalid",
    "tap_url_malformed",
    "tap_signature",
    "card_unassigned",
    "card_retired",
    "card_locked",
    "challenge_row_missing",
    "tap_out_of_range",
    "tap_replayed",
];

const URL_LIMIT: usize = 512;

#[derive(Default)]
pub struct Attempt {
    pub user_id: Option<Uuid>,
    pub device_key: Option<String>,
    pub url: Option<String>,
    pub card_id: Option<String>,
    pub challenge_id: Option<Uuid>,
    pub counter: Option<i64>,
    pub fix: Option<Fix>,
}

impl Taps {
    pub fn new(db: DatabaseConnection, master: Arc<[u8; 32]>) -> Self {
        Self { db, master }
    }

    pub fn read(&self, url: &str) -> Result<Read, AuthError> {
        let malformed = AuthError::BadRequest("tap_url_malformed");

        let query = url.split_once('?').map(|(_, q)| q).ok_or(malformed)?;
        let e = param(query, "e").ok_or(malformed)?;
        let c = param(query, "c").ok_or(malformed)?;

        let picc: [u8; 16] = hex::decode(e)
            .map_err(|_| malformed)?
            .try_into()
            .map_err(|_| malformed)?;
        let mac: [u8; 8] = hex::decode(c)
            .map_err(|_| malformed)?
            .try_into()
            .map_err(|_| malformed)?;

        match verify_tap(&self.master, &picc, &mac) {
            Ok(found) => Ok(Read {
                card_id: hex::encode_upper(found.uid),
                counter: i64::from(found.counter),
            }),
            Err(VerifyError::InvalidSignature) => Err(AuthError::Unauthorized("tap_signature")),
        }
    }

    pub async fn challenge_for(&self, card_id: &str) -> Result<challenge::Model, AuthError> {
        let (card, found) = challenge_card::Entity::find_by_id(card_id)
            .find_also_related(challenge::Entity)
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::NotFound("card_unassigned"))?;

        if card.retired_at.is_some() {
            return Err(AuthError::NotFound("card_retired"));
        }

        found.ok_or(AuthError::Upstream("challenge_row_missing"))
    }

    pub async fn record(
        &self,
        challenge_id: Uuid,
        card_id: &str,
        counter: i64,
        user: Uuid,
        fix: Option<Fix>,
    ) -> Result<Recorded, AuthError> {
        let txn = self.db.begin().await.map_err(db_down)?;

        txn.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_advisory_xact_lock(hashtext($1))",
            [card_id.into()],
        ))
        .await
        .map_err(db_down)?;

        let mine = tap_events::Entity::find()
            .filter(tap_events::Column::ChallengeId.eq(challenge_id))
            .filter(tap_events::Column::UserId.eq(user))
            .one(&txn)
            .await
            .map_err(db_down)?;

        if let Some(row) = mine {
            let before = tap_events::Entity::find()
                .filter(tap_events::Column::ChallengeId.eq(challenge_id))
                .filter(tap_events::Column::Time.lt(row.time))
                .count(&txn)
                .await
                .map_err(db_down)?;

            txn.rollback().await.ok();
            return Ok(Recorded {
                first: false,
                place: before as i64 + 1,
            });
        }

        let highest: Option<i64> = tap_events::Entity::find()
            .select_only()
            .column_as(tap_events::Column::Counter.max(), "max")
            .filter(tap_events::Column::CardId.eq(card_id))
            .into_tuple::<Option<i64>>()
            .one(&txn)
            .await
            .map_err(db_down)?
            .flatten();

        if highest.is_some_and(|max| counter <= max) {
            txn.rollback().await.ok();
            return Err(AuthError::Conflict("tap_replayed"));
        }

        let before = tap_events::Entity::find()
            .filter(tap_events::Column::ChallengeId.eq(challenge_id))
            .count(&txn)
            .await
            .map_err(db_down)?;

        let fresh = tap_events::ActiveModel {
            challenge_id: ActiveValue::Set(challenge_id),
            card_id: ActiveValue::Set(card_id.to_owned()),
            counter: ActiveValue::Set(counter),
            time: ActiveValue::Set(now()),
            location: ActiveValue::Set(fix.map(|fix| fix.at)),
            accuracy: ActiveValue::Set(fix.and_then(|fix| fix.accuracy)),
            user_id: ActiveValue::Set(user),
            ..Default::default()
        };

        tap_events::Entity::insert(fresh)
            .exec_without_returning(&txn)
            .await
            .map_err(db_down)?;

        txn.commit().await.map_err(db_down)?;
        Ok(Recorded {
            first: true,
            place: before as i64 + 1,
        })
    }

    /// Records a rejected stage and passes the result through unchanged.
    pub async fn audited<T>(
        &self,
        attempt: &Attempt,
        result: Result<T, AuthError>,
    ) -> Result<T, AuthError> {
        match result {
            Ok(value) => Ok(value),
            Err(error) => Err(self.rejected(attempt, error).await),
        }
    }

    /// Deliberately on the pool, not a caller transaction: the replay branch
    /// rolls back, which would take the audit row with it. Insert failures are
    /// logged and swallowed so a lost row can't turn a 4xx into a 502.
    pub async fn rejected(&self, attempt: &Attempt, error: AuthError) -> AuthError {
        let reason = error.code();
        if !REASONS.contains(&reason) {
            return error;
        }

        let row = failed_taps::ActiveModel {
            reason: ActiveValue::Set(reason.to_owned()),
            user_id: ActiveValue::Set(attempt.user_id),
            device_key: ActiveValue::Set(attempt.device_key.clone()),
            card_id: ActiveValue::Set(attempt.card_id.clone()),
            challenge_id: ActiveValue::Set(attempt.challenge_id),
            counter: ActiveValue::Set(attempt.counter),
            url: ActiveValue::Set(attempt.url.as_deref().map(clamp)),
            location: ActiveValue::Set(attempt.fix.map(|fix| fix.at)),
            accuracy: ActiveValue::Set(attempt.fix.and_then(|fix| fix.accuracy)),
            ..Default::default()
        };

        if let Err(err) = failed_taps::Entity::insert(row)
            .exec_without_returning(&self.db)
            .await
        {
            eprintln!("taps: failed_taps insert ({reason}): {err}");
        }

        error
    }
}

fn param<'q>(query: &'q str, key: &str) -> Option<&'q str> {
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(name, value)| (name == key).then_some(value))
}

// Characters, not bytes: the CHECK uses char_length.
fn clamp(url: &str) -> String {
    match url.char_indices().nth(URL_LIMIT) {
        Some((end, _)) => url[..end].to_owned(),
        None => url.to_owned(),
    }
}

fn now() -> i64 {
    tower_sessions::cookie::time::OffsetDateTime::now_utc().unix_timestamp()
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("taps: {err}");
    AuthError::Upstream("database_unavailable")
}
