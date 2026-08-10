use axum::extract::State;
use axum::{Extension, Json};
use serde::Serialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::Daily;
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::challenges::Challenges;
use crate::challenges::routes::ChallengeView;
use crate::users::Users;

pub fn router(daily: Daily, challenges: Challenges) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(today))
        .with_state((daily, challenges))
}

#[derive(Serialize, ToSchema)]
struct DailyView {
    day: String,
    challenge: Option<ChallengeView>,
}

#[utoipa::path(
    get,
    path = "/users/me/daily",
    tag = "daily",
    responses(
        (status = OK, body = DailyView),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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
