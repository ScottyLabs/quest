use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Extension, Json, Router};
use sea_orm::prelude::Date;
use serde::Deserialize;

use super::{Balances, Scope, Tokens};
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;
use crate::users::Users;

pub fn router(tokens: Tokens) -> Router {
    Router::new()
        .route("/users/me/tokens", get(balances))
        .with_state(tokens)
}

#[derive(Deserialize)]
struct DayQuery {
    day: Option<String>,
}

impl DayQuery {
    fn scope(&self) -> Result<Scope, AuthError> {
        match self.day.as_deref() {
            None => Ok(Scope::Lifetime),
            Some("today") => Ok(Scope::Today),
            Some(raw) => Date::parse_from_str(raw, "%Y-%m-%d")
                .map(Scope::On)
                .map_err(|_| AuthError::BadRequest("day_invalid")),
        }
    }
}

async fn balances(
    State(tokens): State<Tokens>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Query(query): Query<DayQuery>,
) -> Result<Json<Balances>, AuthError> {
    let scope = query.scope()?;
    let row = users.row(&user).await?;

    Ok(Json(tokens.balances(row.id, scope).await?))
}
