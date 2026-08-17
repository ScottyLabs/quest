use axum::Json;
use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use entity::enums::Dorm;
use sea_orm::ActiveEnum;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::Users;
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};

pub fn router(users: Users) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(me))
        .routes(routes!(dorm))
        .routes(routes!(anonymous))
        .with_state(users)
}

#[derive(Serialize, ToSchema)]
struct Profile {
    andrew_id: String,
    dorm: Option<String>,
    player: bool,
    anonymous: bool,
    created_at: String,
}

#[utoipa::path(
    get,
    path = "/users/me",
    tag = "users",
    responses(
        (status = OK, body = Profile),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn me(
    State(users): State<Users>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Profile>, AuthError> {
    let row = users.row(&user).await?;

    Ok(Json(Profile {
        andrew_id: row.andrew_id,
        dorm: row.dorm.map(|dorm| dorm.to_value()),
        player: row.player,
        anonymous: row.anonymous,
        created_at: row.created_at.to_rfc3339(),
    }))
}

#[derive(Deserialize, Serialize, ToSchema)]
struct DormBody {
    dorm: String,
}

#[utoipa::path(
    put,
    path = "/users/me/dorm",
    tag = "users",
    request_body = DormBody,
    responses(
        (status = OK, body = DormBody),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn dorm(
    State(users): State<Users>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<DormBody>, JsonRejection>,
) -> Result<Json<DormBody>, AuthError> {
    let invalid = AuthError::BadRequest("dorm_invalid");
    let Json(body) = body.map_err(|_| invalid)?;

    let dorm = Dorm::try_from_value(&body.dorm).map_err(|_| invalid)?;
    users.set_dorm(&user, dorm).await?;

    Ok(Json(body))
}

#[derive(Deserialize, Serialize, ToSchema)]
struct AnonymousBody {
    anonymous: bool,
}

#[utoipa::path(
    put,
    path = "/users/me/anonymous",
    tag = "users",
    request_body = AnonymousBody,
    responses(
        (status = OK, body = AnonymousBody),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn anonymous(
    State(users): State<Users>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<AnonymousBody>, JsonRejection>,
) -> Result<Json<AnonymousBody>, AuthError> {
    let Json(body) = body.map_err(|_| AuthError::BadRequest("anonymous_invalid"))?;

    users.set_anonymous(&user, body.anonymous).await?;

    Ok(Json(body))
}
