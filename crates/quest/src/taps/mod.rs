pub mod routes;

use std::sync::Arc;

use entity::geography::Point;
use entity::{challenge, tap_events};
use quest::crypto::{VerifyError, verify_tap};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, DbErr, EntityTrait,
    QueryFilter, QuerySelect, Statement, TransactionTrait,
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

pub enum Proximity {
    Accept,
    #[allow(dead_code)]
    Reject(Option<&'static str>),
}

pub fn proximity(_challenge: Option<Point>, _tapped: Option<Point>) -> Proximity {
    //TODO: IMPLEMENT PROXIMIMITY CHECKING
    Proximity::Accept
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
        challenge::Entity::find()
            .filter(challenge::Column::CardId.eq(card_id))
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::NotFound("card_unassigned"))
    }

    pub async fn record(
        &self,
        card_id: &str,
        counter: i64,
        user: Uuid,
        at: Option<Point>,
    ) -> Result<bool, AuthError> {
        let txn = self.db.begin().await.map_err(db_down)?;

        txn.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_advisory_xact_lock(hashtext($1))",
            [card_id.into()],
        ))
        .await
        .map_err(db_down)?;

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
            let verdict = owner_matches(&txn, card_id, counter, user).await;
            txn.rollback().await.ok();
            return verdict;
        }

        let fresh = tap_events::ActiveModel {
            card_id: ActiveValue::Set(card_id.to_owned()),
            counter: ActiveValue::Set(counter),
            time: ActiveValue::Set(now()),
            location: ActiveValue::Set(at),
            user_id: ActiveValue::Set(user),
            ..Default::default()
        };

        tap_events::Entity::insert(fresh)
            .exec_without_returning(&txn)
            .await
            .map_err(db_down)?;

        txn.commit().await.map_err(db_down)?;
        Ok(true)
    }
}

async fn owner_matches<C: ConnectionTrait>(
    db: &C,
    card_id: &str,
    counter: i64,
    user: Uuid,
) -> Result<bool, AuthError> {
    let existing = tap_events::Entity::find()
        .filter(tap_events::Column::CardId.eq(card_id))
        .filter(tap_events::Column::Counter.eq(counter))
        .one(db)
        .await
        .map_err(db_down)?;

    match existing {
        Some(row) if row.user_id == user => Ok(false),
        _ => Err(AuthError::Conflict("tap_replayed")),
    }
}

fn param<'q>(query: &'q str, key: &str) -> Option<&'q str> {
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(name, value)| (name == key).then_some(value))
}

fn now() -> i64 {
    tower_sessions::cookie::time::OffsetDateTime::now_utc().unix_timestamp()
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("taps: {err}");
    AuthError::Upstream("database_unavailable")
}
