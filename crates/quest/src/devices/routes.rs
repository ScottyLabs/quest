use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::{Extension, Json, Router};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use super::key::{DeviceKey, decode};
use super::{DeviceView, Devices, NONCE_TTL_SECS, TICKET_TTL_SECS, label};
use crate::auth::AuthError;
use crate::auth::extract::{CurrentDevice, CurrentUser, SignedIn};
use crate::auth::session::DEVICE_KEY;
use crate::users::Users;

const LOGIN_CONTEXT: &str = "quest-device-login:";

pub fn router(devices: Devices) -> Router {
    Router::new()
        .route("/auth/challenge", get(challenge))
        .route("/auth/device", post(verify))
        .route("/auth/device/enroll", post(enroll))
        .with_state(devices)
}

pub fn manage(devices: Devices) -> Router {
    Router::new()
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

#[derive(Deserialize)]
struct Enroll {
    ticket: String,
}

#[derive(Serialize)]
struct Enrolled {
    enrolled: bool,
    public_key: String,
}

async fn enroll(
    State(devices): State<Devices>,
    Extension(users): Extension<Users>,
    SignedIn(user): SignedIn,
    session: Session,
    Json(body): Json<Enroll>,
) -> Result<Json<Enrolled>, AuthError> {
    let unavailable = || AuthError::Upstream("session_store_unavailable");
    let row = users.row(&user).await?;

    let bound = session
        .get::<String>(DEVICE_KEY)
        .await
        .map_err(|_| unavailable())?;

    let public_key = devices.claim(Some(body.ticket.as_str()), row.id).await?;

    if let Some(bound) = bound {
        if bound != public_key {
            return Err(AuthError::Conflict("device_mismatch"));
        }

        return Ok(Json(Enrolled {
            enrolled: false,
            public_key,
        }));
    }

    session
        .insert(DEVICE_KEY, &public_key)
        .await
        .map_err(|_| unavailable())?;

    Ok(Json(Enrolled {
        enrolled: true,
        public_key,
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
