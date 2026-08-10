use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Extension, Json, Router};
use serde::Deserialize;

use super::{Leaderboard, Metric, Standings};
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;
use crate::users::Users;

pub fn router(leaderboard: Leaderboard) -> Router {
    Router::new()
        .route("/leaderboard", get(standings))
        .with_state(leaderboard)
}

#[derive(Deserialize)]
struct Board {
    metric: Option<String>,
}

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
