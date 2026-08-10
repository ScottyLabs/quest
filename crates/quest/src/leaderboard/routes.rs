use axum::extract::{Query, State};
use axum::{Extension, Json};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{Leaderboard, Metric, Standings};
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::users::Users;

pub fn router(leaderboard: Leaderboard) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(standings))
        .with_state(leaderboard)
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct Board {
    metric: Option<String>,
}

#[utoipa::path(
    get,
    path = "/leaderboard",
    tag = "leaderboard",
    params(Board),
    responses(
        (status = OK, body = Standings),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn standings(
    State(leaderboard): State<Leaderboard>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Query(board): Query<Board>,
) -> Result<Json<Standings>, AuthError> {
    let row = users.row(&user).await?;
    let metric = Metric::parse(board.metric.as_deref());

    Ok(Json(leaderboard.standings(row.id, metric).await?))
}
