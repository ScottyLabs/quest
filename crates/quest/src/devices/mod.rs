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
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, ModelTrait,
    QueryFilter, QueryOrder,
};

use crate::auth::AuthError;
use crate::auth::extract::session_user;
use crate::auth::session::SessionUser;
use key::DeviceKey;
use proof::{PROOF_HEADER, request_url};

#[derive(Clone)]
pub struct Devices {
    db: DatabaseConnection,
    valkey: Pool,
}

fn nonce_key(nonce: &str) -> String {
    format!("quest:device:nonce:{nonce}")
}

fn jti_key(jti: &str) -> String {
    format!("quest:proof:jti:{jti}")
}

impl Devices {
    pub fn new(db: DatabaseConnection, valkey: Pool) -> Self {
        Self { db, valkey }
    }

    async fn issue_nonce(&self, sub: &str, ttl: i64) -> Result<String, AuthError> {
        let mut bytes = [0u8; 16];
        rand::fill(&mut bytes);
        let nonce = hex::encode(bytes);

        self.valkey
            .set::<(), _, _>(
                nonce_key(&nonce),
                sub,
                Some(Expiration::EX(ttl)),
                None,
                false,
            )
            .await
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

        Ok(nonce)
    }

    async fn spend_nonce(&self, nonce: &str, sub: &str) -> Result<(), AuthError> {
        let owner: Option<String> = self
            .valkey
            .getdel(nonce_key(nonce))
            .await
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

        (owner.as_deref() == Some(sub))
            .then_some(())
            .ok_or(AuthError::Unauthorized("nonce_invalid"))
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
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

        Ok(claimed.is_some())
    }

    async fn owner_of(
        &self,
        public_key: &str,
    ) -> Result<Option<(devices::Model, String)>, AuthError> {
        let found = devices::Entity::find_by_id(public_key)
            .find_also_related(users::Entity)
            .one(&self.db)
            .await
            .map_err(db_down)?;

        Ok(found.map(|(device, user)| {
            let sub = user.map(|user| user.sub).unwrap_or_default();
            (device, sub)
        }))
    }

    async fn user_row(&self, user: &SessionUser) -> Result<users::Model, AuthError> {
        if let Some(found) = users::Entity::find()
            .filter(users::Column::Sub.eq(&user.sub))
            .one(&self.db)
            .await
            .map_err(db_down)?
        {
            return Ok(found);
        }

        let fresh = users::ActiveModel {
            sub: ActiveValue::Set(user.sub.clone()),
            andrew_id: ActiveValue::Set(user.andrew_id.clone()),
            ..Default::default()
        };

        users::Entity::insert(fresh)
            .on_conflict(
                OnConflict::column(users::Column::Sub)
                    .do_nothing_on([users::Column::Sub])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(db_down)?;

        users::Entity::find()
            .filter(users::Column::Sub.eq(&user.sub))
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::Upstream("user_row_missing"))
    }

    pub async fn any_registered(&self, sub: &str) -> Result<bool, AuthError> {
        devices::Entity::find()
            .inner_join(users::Entity)
            .filter(users::Column::Sub.eq(sub))
            .one(&self.db)
            .await
            .map(|found| found.is_some())
            .map_err(db_down)
    }

    async fn registered(&self, sub: &str) -> Result<Vec<devices::Model>, AuthError> {
        devices::Entity::find()
            .inner_join(users::Entity)
            .filter(users::Column::Sub.eq(sub))
            .order_by_asc(devices::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(db_down)
    }

    async fn check(&self, parts: &Parts, user: &SessionUser) -> Result<(), AuthError> {
        let header = parts
            .headers
            .get(PROOF_HEADER)
            .and_then(|value| value.to_str().ok())
            .ok_or(AuthError::Unauthorized("proof_required"))?;

        let invalid = AuthError::Unauthorized("proof_invalid");
        let proof = proof::parse(header).ok_or(invalid)?;

        let (_, owner) = self
            .owner_of(proof.key.hex())
            .await?
            .ok_or(AuthError::Unauthorized("device_unknown"))?;
        if owner != user.sub {
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

fn db_down(err: sea_orm::DbErr) -> AuthError {
    eprintln!("devices: {err}");
    AuthError::Upstream("database_unavailable")
}

fn bootstrap(method: &Method, path: &str) -> bool {
    if method == Method::OPTIONS {
        return true;
    }

    match path {
        "/devices/challenge" => method == Method::GET,
        "/devices" => method == Method::POST,
        _ => path.starts_with("/auth/"),
    }
}

pub async fn enforce(State(devices): State<Devices>, request: Request, next: Next) -> Response {
    if bootstrap(request.method(), request.uri().path()) {
        return next.run(request).await;
    }

    let (parts, body) = request.into_parts();
    let mut parts = parts;

    let outcome = match session_user(&mut parts).await {
        Ok(Some(user)) => devices.check(&parts, &user).await,
        Ok(None) => Ok(()),
        Err(err) => Err(err),
    };

    match outcome {
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

enum Registered {
    Ours(DeviceView),
    Taken,
}

impl Devices {
    async fn register(
        &self,
        user: &SessionUser,
        key: &DeviceKey,
        label: Option<String>,
    ) -> Result<Registered, AuthError> {
        if let Some((device, owner)) = self.owner_of(key.hex()).await? {
            if owner != user.sub {
                return Ok(Registered::Taken);
            }

            return self.relabel(device, label).await.map(Registered::Ours);
        }

        let row = self.user_row(user).await?;
        let device = devices::ActiveModel {
            public_key: ActiveValue::Set(key.hex().to_owned()),
            user_id: ActiveValue::Set(row.id),
            label: ActiveValue::Set(label),
            ..Default::default()
        };

        devices::Entity::insert(device)
            .on_conflict(
                OnConflict::column(devices::Column::PublicKey)
                    .do_nothing_on([devices::Column::PublicKey])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(db_down)?;

        let (device, owner) = self
            .owner_of(key.hex())
            .await?
            .ok_or(AuthError::Upstream("device_row_missing"))?;

        Ok(if owner == user.sub {
            Registered::Ours(device.into())
        } else {
            Registered::Taken
        })
    }

    async fn relabel(
        &self,
        device: devices::Model,
        label: Option<String>,
    ) -> Result<DeviceView, AuthError> {
        if label.is_none() || label == device.label {
            return Ok(device.into());
        }

        let update = devices::ActiveModel {
            public_key: ActiveValue::Unchanged(device.public_key),
            label: ActiveValue::Set(label),
            ..Default::default()
        };

        update
            .update(&self.db)
            .await
            .map_err(db_down)
            .map(Into::into)
    }

    async fn revoke(&self, sub: &str, public_key: &str) -> Result<(), AuthError> {
        let found = devices::Entity::find_by_id(public_key)
            .find_also_related(users::Entity)
            .one(&self.db)
            .await
            .map_err(db_down)?;

        let unknown = AuthError::NotFound("device_unknown");
        let (device, owner) = found.ok_or(unknown)?;
        if owner.map(|owner| owner.sub).as_deref() != Some(sub) {
            return Err(unknown);
        }

        device.delete(&self.db).await.map_err(db_down)?;
        Ok(())
    }
}
