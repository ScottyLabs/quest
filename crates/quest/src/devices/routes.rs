use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::key::{DeviceKey, decode};
use super::{DeviceView, Devices, NONCE_TTL_SECS, TICKET_TTL_SECS, label};
use crate::auth::extract::{CurrentDevice, CurrentUser, SignedIn};
use crate::auth::session::DEVICE_KEY;
use crate::auth::{AuthErrBody, AuthError};
use crate::users::Users;

const LOGIN_CONTEXT: &str = "quest-device-login:";

pub fn router(devices: Devices) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(challenge))
        .routes(routes!(verify))
        .routes(routes!(enroll))
        .with_state(devices)
}

pub fn manage(devices: Devices) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(list))
        .routes(routes!(revoke))
        .with_state(devices)
}

#[derive(Serialize, ToSchema)]
struct Challenge {
    nonce: String,
    expires_in: i64,
}

#[utoipa::path(
    get,
    path = "/auth/challenge",
    security(()),
    tag = "devices",
    responses(
        (status = OK, body = Challenge),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn challenge(State(devices): State<Devices>) -> Result<Json<Challenge>, AuthError> {
    Ok(Json(Challenge {
        nonce: devices.issue_nonce().await?,
        expires_in: NONCE_TTL_SECS,
    }))
}

#[derive(Deserialize, ToSchema)]
struct Verify {
    public_key: String,
    nonce: String,
    signature: String,
    #[serde(default)]
    label: Option<String>,
}

#[derive(Serialize, ToSchema)]
struct Ticket {
    ticket: String,
    expires_in: i64,
}

#[utoipa::path(
    post,
    path = "/auth/device",
    security(()),
    tag = "devices",
    request_body = Verify,
    responses(
        (status = OK, body = Ticket),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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

#[derive(Deserialize, ToSchema)]
struct Enroll {
    ticket: String,
}

#[derive(Serialize, ToSchema)]
struct Enrolled {
    enrolled: bool,
    public_key: String,
}

#[utoipa::path(
    post,
    path = "/auth/device/enroll",
    security(("session" = [])),
    tag = "devices",
    request_body = Enroll,
    responses(
        (status = OK, body = Enrolled),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = CONFLICT, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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

#[utoipa::path(
    get,
    path = "/devices",
    operation_id = "list_devices",
    tag = "devices",
    responses(
        (status = OK, body = Vec<DeviceView>),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn list(
    State(devices): State<Devices>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Vec<DeviceView>>, AuthError> {
    let registered = devices.registered(&user.andrew_id).await?;

    Ok(Json(registered.into_iter().map(DeviceView::from).collect()))
}

#[derive(Serialize, ToSchema)]
struct Revoked {
    revoked: bool,
}

#[utoipa::path(
    delete,
    path = "/devices/{public_key}",
    tag = "devices",
    params(("public_key" = String, Path, description = "Device public key")),
    responses(
        (status = OK, body = Revoked),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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
