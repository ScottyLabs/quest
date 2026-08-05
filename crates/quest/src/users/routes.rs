use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::routing::{get, put};
use axum::{Json, Router};
use entity::enums::Dorm;
use sea_orm::ActiveEnum;
use serde::{Deserialize, Serialize};

use super::Users;
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;

pub fn router(users: Users) -> Router {
    Router::new()
        .route("/users/me", get(me))
        .route("/users/me/dorm", put(dorm))
        .with_state(users)
}

#[derive(Serialize)]
struct Profile {
    sub: String,
    andrew_id: String,
    dorm: Option<String>,
    staff: bool,
    created_at: String,
}

async fn me(
    State(users): State<Users>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Profile>, AuthError> {
    let row = users.row(&user).await?;

    Ok(Json(Profile {
        sub: row.sub,
        andrew_id: row.andrew_id,
        dorm: row.dorm.map(|dorm| dorm.to_value()),
        staff: row.staff,
        created_at: row.created_at.to_rfc3339(),
    }))
}

#[derive(Deserialize, Serialize)]
struct DormBody {
    dorm: String,
}

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
