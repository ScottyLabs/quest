use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use super::key::{DeviceKey, decode};
use super::{DeviceView, Devices, NONCE_TTL_SECS, TICKET_TTL_SECS, label};
use crate::auth::AuthError;
use crate::auth::extract::{CurrentDevice, CurrentUser};

const LOGIN_CONTEXT: &str = "quest-device-login:";

pub fn router(devices: Devices) -> Router {
    Router::new()
        .route("/auth/challenge", get(challenge))
        .route("/auth/device", post(verify))
        .route("/devices", get(list))
        .route("/devices/{public_key}", delete(revoke))
        .with_state(devices)
}

#[derive(Serialize)]
struct Challenge {
    nonce: String,
    expires_in: i64,
}

async fn challenge(State(devices): State<Devices>) -> Result<Json<Challenge>, AuthError> {
    Ok(Json(Challenge {
        nonce: devices.issue_nonce().await?,
        expires_in: NONCE_TTL_SECS,
    }))
}

#[derive(Deserialize)]
struct Verify {
    public_key: String,
    nonce: String,
    signature: String,
    /// Display only, and optional: absent means the `User-Agent` decides.
    #[serde(default)]
    label: Option<String>,
}

#[derive(Serialize)]
struct Ticket {
    ticket: String,
    expires_in: i64,
}

async fn verify(
    State(devices): State<Devices>,
    headers: HeaderMap,
    Json(body): Json<Verify>,
) -> Result<Json<Ticket>, AuthError> {
    let key =
        DeviceKey::parse(&body.public_key).ok_or(AuthError::BadRequest("public_key_invalid"))?;

    let signature = decode(&body.signature).ok_or(AuthError::Unauthorized("proof_invalid"))?;
    let message = format!("{LOGIN_CONTEXT}{}", body.nonce);
    if !key.verifies(message.as_bytes(), &signature) {
        return Err(AuthError::Unauthorized("proof_invalid"));
    }

    let label = label::resolve(body.label.as_deref(), &headers);

    Ok(Json(Ticket {
        ticket: devices.issue_ticket(&body.nonce, &key, label).await?,
        expires_in: TICKET_TTL_SECS,
    }))
}

async fn list(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Vec<DeviceView>>, AuthError> {
    let registered = devices.registered(&user.andrew_id).await?;

    Ok(Json(registered.into_iter().map(DeviceView::from).collect()))
}

#[derive(Serialize)]
struct Revoked {
    revoked: bool,
}

async fn revoke(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
    CurrentDevice(bound): CurrentDevice,
    session: Session,
    Path(public_key): Path<String>,
) -> Result<Json<Revoked>, AuthError> {
    let key = DeviceKey::parse(&public_key).ok_or(AuthError::NotFound("device_unknown"))?;
    devices.revoke(&user.andrew_id, key.hex()).await?;

    if key.hex() == bound {
        session
            .flush()
            .await
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;
    }

    Ok(Json(Revoked { revoked: true }))
}
