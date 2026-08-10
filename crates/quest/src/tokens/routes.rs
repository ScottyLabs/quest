use axum::extract::{Query, State};
use axum::{Extension, Json};
use sea_orm::prelude::Date;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{Balances, Scope, Tokens};
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::users::Users;

pub fn router(tokens: Tokens) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(balances))
        .with_state(tokens)
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
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

#[utoipa::path(
    get,
    path = "/users/me/tokens",
    tag = "tokens",
    params(DayQuery),
    responses(
        (status = OK, body = Balances),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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
