use axum::extract::State;
use axum::routing::get;
use axum::{Extension, Json, Router};
use serde::Serialize;

use super::Daily;
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;
use crate::challenges::Challenges;
use crate::challenges::routes::ChallengeView;
use crate::users::Users;

pub fn router(daily: Daily, challenges: Challenges) -> Router {
    Router::new()
        .route("/users/me/daily", get(today))
        .with_state((daily, challenges))
}

#[derive(Serialize)]
struct DailyView {
    day: String,
    challenge: Option<ChallengeView>,
}

async fn today(
    State((daily, challenges)): State<(Daily, Challenges)>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<DailyView>, AuthError> {
    let row = users.row(&user).await?;
    let found = daily.today(row.id).await?;

    let view = match found.challenge {
        Some(challenge) => {
            let cleared = challenges.cleared(row.id).await?;
            let done = cleared.contains(&challenge.id);
            Some(ChallengeView::new(challenge, done))
        }
        None => None,
    };

    Ok(Json(DailyView {
        day: found.day.to_string(),
        challenge: view,
    }))
}
