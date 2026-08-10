use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::http::{HeaderName, HeaderValue, header};
use axum::response::{IntoResponse, Response};
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use sha2::Digest as _;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{Passes, Signed, signed_message};
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::devices::key::decode_base64;
use crate::users::Users;

pub fn router(passes: Passes) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(challenge))
        .routes(routes!(issue))
        .routes(routes!(verify))
        .with_state(passes)
}

#[derive(Serialize, ToSchema)]
struct PassChallenge {
    andrew_id: String,
    issued_at: i64,
    message: String,
}

#[utoipa::path(
    get,
    path = "/passes/apple/challenge",
    tag = "passes",
    responses(
        (status = OK, body = PassChallenge),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn challenge(CurrentUser(user): CurrentUser) -> Json<PassChallenge> {
    let issued_at = crate::devices::proof::now();

    Json(PassChallenge {
        message: signed_message(&user.andrew_id, issued_at),
        andrew_id: user.andrew_id,
        issued_at,
    })
}

#[derive(Deserialize, ToSchema)]
struct IssueBody {
    issued_at: Option<i64>,
    signature: Option<String>,
}

#[utoipa::path(
    post,
    path = "/passes/apple",
    tag = "passes",
    request_body = IssueBody,
    responses(
        (status = OK, description = "An Apple Wallet pass", content_type = "application/vnd.apple.pkpass"),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = SERVICE_UNAVAILABLE, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn issue(
    State(passes): State<Passes>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<IssueBody>, JsonRejection>,
) -> Result<Response, AuthError> {
    let Json(body) = body.map_err(|_| AuthError::BadRequest("pass_body_invalid"))?;

    let row = users.row(&user).await?;
    let issued = passes
        .issue(row.id, &user.andrew_id, &user.name, offered(&body)?)
        .await?;

    Ok(package(issued))
}

fn offered(body: &IssueBody) -> Result<Option<Signed>, AuthError> {
    match (body.issued_at, body.signature.as_deref()) {
        (Some(issued_at), Some(signature)) => Ok(Some(Signed {
            issued_at,
            signature: decode_base64(signature)
                .ok_or(AuthError::BadRequest("pass_signature_malformed"))?,
        })),
        (None, None) => Ok(None),
        _ => Err(AuthError::BadRequest("pass_signature_incomplete")),
    }
}

fn package(issued: super::Issued) -> Response {
    let disposition = format!("attachment; filename=\"{}.pkpass\"", issued.serial);
    let header_or_empty =
        |value: &str| HeaderValue::from_str(value).unwrap_or(HeaderValue::from_static(""));

    (
        [
            (
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/vnd.apple.pkpass"),
            ),
            (header::CONTENT_DISPOSITION, header_or_empty(&disposition)),
            (
                HeaderName::from_static("x-pass-serial"),
                header_or_empty(&issued.serial),
            ),
            (
                HeaderName::from_static("x-pass-issued"),
                HeaderValue::from_static(if issued.fresh { "new" } else { "existing" }),
            ),
            (
                HeaderName::from_static("x-pass-token"),
                header_or_empty(&issued.token),
            ),
            (
                HeaderName::from_static("x-pass-sha256"),
                header_or_empty(&hex::encode(sha2::Sha256::digest(&issued.pkpass))),
            ),
        ],
        issued.pkpass,
    )
        .into_response()
}

#[derive(Deserialize, ToSchema)]
struct VerifyBody {
    token: String,
}

#[derive(Serialize, ToSchema)]
struct Verified {
    andrew_id: String,
    name: String,
    issued_at: i64,
}

#[utoipa::path(
    post,
    path = "/passes/verify",
    tag = "passes",
    request_body = VerifyBody,
    responses(
        (status = OK, body = Verified),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = FORBIDDEN, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn verify(
    State(passes): State<Passes>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<VerifyBody>, JsonRejection>,
) -> Result<Json<Verified>, AuthError> {
    let Json(body) = body.map_err(|_| AuthError::BadRequest("pass_body_invalid"))?;

    if !users.row(&user).await?.staff {
        return Err(AuthError::Forbidden("staff_only"));
    }

    let holder = passes.verify(&body.token).await?;

    Ok(Json(Verified {
        andrew_id: holder.andrew_id,
        name: holder.name,
        issued_at: holder.issued_at,
    }))
}
