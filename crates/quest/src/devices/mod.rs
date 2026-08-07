pub mod key;
pub mod label;
pub mod proof;
pub mod routes;

use axum::extract::{Request, State};
use axum::http::Method;
use axum::http::request::Parts;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use entity::{devices, users};
use fred::prelude::{KeysInterface, Pool};
use fred::types::{Expiration, SetOptions};
use sea_orm::prelude::Uuid;
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, ModelTrait, QueryFilter, QueryOrder,
};

use crate::auth::AuthError;
use crate::auth::extract::session_binding;
use key::DeviceKey;
use proof::{PROOF_HEADER, request_url};

pub const NONCE_TTL_SECS: i64 = 120;

pub const TICKET_TTL_SECS: i64 = 600;

#[derive(Clone)]
pub struct Devices {
    db: DatabaseConnection,
    valkey: Pool,
}

fn nonce_key(nonce: &str) -> String {
    format!("quest:device:nonce:{nonce}")
}

fn ticket_key(ticket: &str) -> String {
    format!("quest:device:ticket:{ticket}")
}

fn jti_key(jti: &str) -> String {
    format!("quest:proof:jti:{jti}")
}

fn token() -> String {
    let mut bytes = [0u8; 16];
    rand::fill(&mut bytes);
    hex::encode(bytes)
}

fn is_token(value: &str) -> bool {
    value.len() == 32 && value.bytes().all(|b| b.is_ascii_hexdigit())
}

impl Devices {
    pub fn new(db: DatabaseConnection, valkey: Pool) -> Self {
        Self { db, valkey }
    }

    async fn put(&self, key: String, value: &str, ttl: i64) -> Result<(), AuthError> {
        self.valkey
            .set::<(), _, _>(key, value, Some(Expiration::EX(ttl)), None, false)
            .await
            .map_err(store_down)
    }

    async fn take(&self, key: String) -> Result<Option<String>, AuthError> {
        self.valkey.getdel(key).await.map_err(store_down)
    }

    pub async fn issue_nonce(&self) -> Result<String, AuthError> {
        let nonce = token();
        self.put(nonce_key(&nonce), "", NONCE_TTL_SECS).await?;
        Ok(nonce)
    }

    pub async fn issue_ticket(
        &self,
        nonce: &str,
        key: &DeviceKey,
        label: Option<String>,
    ) -> Result<String, AuthError> {
        if !is_token(nonce) {
            return Err(AuthError::Unauthorized("nonce_invalid"));
        }

        self.take(nonce_key(nonce))
            .await?
            .ok_or(AuthError::Unauthorized("nonce_invalid"))?;

        let ticket = token();
        let held = Held {
            public_key: key.hex().to_owned(),
            label,
        };
        let encoded = serde_json::to_string(&held).map_err(|_| AuthError::Upstream("encode"))?;

        self.put(ticket_key(&ticket), &encoded, TICKET_TTL_SECS)
            .await?;
        Ok(ticket)
    }

    pub async fn claim(&self, ticket: Option<&str>, owner: Uuid) -> Result<String, AuthError> {
        let unverified = AuthError::Unauthorized("device_unverified");
        let ticket = ticket.filter(|t| is_token(t)).ok_or(unverified)?;

        let held: Held = self
            .take(ticket_key(ticket))
            .await?
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .ok_or(unverified)?;

        let fresh = devices::ActiveModel {
            public_key: ActiveValue::Set(held.public_key.clone()),
            user_id: ActiveValue::Set(owner),
            label: ActiveValue::Set(held.label),
            ..Default::default()
        };

        devices::Entity::insert(fresh)
            .on_conflict(
                OnConflict::column(devices::Column::PublicKey)
                    .do_nothing_on([devices::Column::PublicKey])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(db_down)?;

        let bound = devices::Entity::find_by_id(&held.public_key)
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::Upstream("device_row_missing"))?;

        if bound.user_id != owner {
            return Err(AuthError::Conflict("device_owned"));
        }

        Ok(held.public_key)
    }

    pub async fn registered(&self, andrew_id: &str) -> Result<Vec<devices::Model>, AuthError> {
        devices::Entity::find()
            .inner_join(users::Entity)
            .filter(users::Column::AndrewId.eq(andrew_id))
            .order_by_asc(devices::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(db_down)
    }

    pub async fn revoke(&self, andrew_id: &str, public_key: &str) -> Result<(), AuthError> {
        let unknown = AuthError::NotFound("device_unknown");
        let (device, owner) = devices::Entity::find_by_id(public_key)
            .find_also_related(users::Entity)
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(unknown)?;

        if owner.map(|owner| owner.andrew_id).as_deref() != Some(andrew_id) {
            return Err(unknown);
        }

        device.delete(&self.db).await.map_err(db_down)?;
        Ok(())
    }

    async fn claim_jti(&self, jti: &str, now: i64) -> Result<bool, AuthError> {
        let claimed: Option<String> = self
            .valkey
            .set(
                jti_key(jti),
                now,
                Some(Expiration::EX(proof::JTI_TTL_SECS)),
                Some(SetOptions::NX),
                false,
            )
            .await
            .map_err(store_down)?;

        Ok(claimed.is_some())
    }

    async fn check(&self, parts: &mut Parts) -> Result<(), AuthError> {
        let (_, bound) = session_binding(parts)
            .await?
            .ok_or(AuthError::Unauthorized("unauthorized"))?;

        let invalid = AuthError::Unauthorized("proof_invalid");
        let header = parts
            .headers
            .get(PROOF_HEADER)
            .and_then(|value| value.to_str().ok())
            .ok_or(AuthError::Unauthorized("proof_required"))?;
        let proof = proof::parse(header).ok_or(invalid)?;

        if proof.key.hex() != bound {
            return Err(AuthError::Unauthorized("device_mismatch"));
        }

        let url = request_url(&parts.uri, &parts.headers).ok_or(invalid)?;
        let now = proof::now();
        if !proof.claims.covers(&parts.method, &url, now) {
            return Err(invalid);
        }

        if !self.claim_jti(&proof.claims.jti, now).await? {
            return Err(AuthError::Unauthorized("proof_replayed"));
        }

        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Held {
    public_key: String,
    label: Option<String>,
}

fn db_down(err: sea_orm::DbErr) -> AuthError {
    eprintln!("devices: {err}");
    AuthError::Upstream("database_unavailable")
}

fn store_down(err: fred::error::Error) -> AuthError {
    eprintln!("devices: {err}");
    AuthError::Upstream("session_store_unavailable")
}

fn bootstrap(method: &Method, path: &str) -> bool {
    match path {
        _ if method == Method::OPTIONS => true,
        "/tap" => method == Method::GET,
        "/auth/challenge" => method == Method::GET,
        "/auth/device" => method == Method::POST,
        "/auth/device/enroll" => method == Method::POST,
        "/auth/login" => method == Method::GET,
        "/auth/callback" => true,
        _ => false,
    }
}

pub async fn enforce(State(devices): State<Devices>, request: Request, next: Next) -> Response {
    if bootstrap(request.method(), request.uri().path()) {
        return next.run(request).await;
    }

    let (mut parts, body) = request.into_parts();

    match devices.check(&mut parts).await {
        Ok(()) => next.run(Request::from_parts(parts, body)).await,
        Err(err) => err.into_response(),
    }
}

#[derive(serde::Serialize)]
pub struct DeviceView {
    pub public_key: String,
    pub created_at: String,
    pub label: Option<String>,
}

impl From<devices::Model> for DeviceView {
    fn from(device: devices::Model) -> Self {
        Self {
            public_key: device.public_key,
            created_at: device.created_at.to_rfc3339(),
            label: device.label,
        }
    }
}
