use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use super::key::{DeviceKey, decode};
use super::label;
use super::{DeviceView, Devices, Registered};
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;

const NONCE_TTL_SECS: i64 = 120;

const REGISTER_CONTEXT: &str = "quest-device-register:";

pub fn router(devices: Devices) -> Router {
    Router::new()
        .route("/devices/challenge", get(challenge))
        .route("/devices", post(register).get(list))
        .route("/devices/{public_key}", delete(revoke))
        .with_state(devices)
}

#[derive(Serialize)]
struct Challenge {
    nonce: String,
    expires_in: i64,
}

async fn challenge(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Challenge>, AuthError> {
    let nonce = devices.issue_nonce(&user.sub, NONCE_TTL_SECS).await?;

    Ok(Json(Challenge {
        nonce,
        expires_in: NONCE_TTL_SECS,
    }))
}

#[derive(Deserialize)]
struct Registration {
    public_key: String,
    nonce: String,
    signature: String,
    /// Display only, and optional: absent means the `User-Agent` decides.
    #[serde(default)]
    label: Option<String>,
}

async fn register(
    State(devices): State<Devices>,
    session: Session,
    CurrentUser(user): CurrentUser,
    headers: HeaderMap,
    Json(body): Json<Registration>,
) -> Result<Json<DeviceView>, AuthError> {
    let key =
        DeviceKey::parse(&body.public_key).ok_or(AuthError::BadRequest("public_key_invalid"))?;

    if body.nonce.len() != 32 || !body.nonce.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(AuthError::Unauthorized("nonce_invalid"));
    }

    let signature = decode(&body.signature).ok_or(AuthError::Unauthorized("proof_invalid"))?;
    let message = format!("{REGISTER_CONTEXT}{}", body.nonce);
    if !key.verifies(message.as_bytes(), &signature) {
        return Err(AuthError::Unauthorized("proof_invalid"));
    }

    devices.spend_nonce(&body.nonce, &user.sub).await?;

    let label = label::resolve(body.label.as_deref(), &headers);

    match devices.register(&user, &key, label).await? {
        Registered::Ours(device) => Ok(Json(device)),
        Registered::Taken => {
            session
                .flush()
                .await
                .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

            Err(AuthError::Conflict("device_owned"))
        }
    }
}

async fn list(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Vec<DeviceView>>, AuthError> {
    let registered = devices.registered(&user.sub).await?;

    Ok(Json(registered.into_iter().map(DeviceView::from).collect()))
}

async fn revoke(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
    Path(public_key): Path<String>,
) -> Result<Json<Revoked>, AuthError> {
    let key = DeviceKey::parse(&public_key).ok_or(AuthError::NotFound("device_unknown"))?;
    devices.revoke(&user.sub, key.hex()).await?;

    Ok(Json(Revoked { revoked: true }))
}

#[derive(Serialize)]
struct Revoked {
    revoked: bool,
}
