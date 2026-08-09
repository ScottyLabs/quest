use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::routing::post;
use axum::{Extension, Json, Router};
use entity::geography::Point;
use serde::{Deserialize, Serialize};

use super::{Fix, Proximity, Taps, proximity};
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;
use crate::challenges::routes::ChallengeView;
use crate::tokens::{Scope, Tokens};
use crate::users::Users;

pub fn router(taps: Taps, tokens: Tokens) -> Router {
    Router::new()
        .route("/api/register_tap", post(register))
        .with_state((taps, tokens))
}

#[derive(Deserialize)]
struct TapBody {
    url: String,
    lat: Option<f64>,
    lon: Option<f64>,
    accuracy: Option<f32>,
}

#[derive(Serialize)]
struct Registered {
    challenge: ChallengeView,
    place: i64,
    first: bool,
    current_scottycoins: i64,
    // This is a daily count
    current_thistlestones: i64,
}

async fn register(
    State((taps, tokens)): State<(Taps, Tokens)>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<TapBody>, JsonRejection>,
) -> Result<Json<Registered>, AuthError> {
    let Json(body) = body.map_err(|_| AuthError::BadRequest("tap_body_invalid"))?;

    let read = taps.read(&body.url)?;
    let challenge = taps.challenge_for(&read.card_id).await?;

    let fix = match (body.lat, body.lon) {
        (Some(lat), Some(lon)) if lat.is_finite() && lon.is_finite() => Some(Fix {
            at: Point::new(lon, lat),
            accuracy: body
                .accuracy
                .filter(|metres| metres.is_finite() && *metres >= 0.0),
        }),
        _ => None,
    };

    match proximity(challenge.location, fix.map(|fix| fix.at)) {
        Proximity::Accept => {}
        Proximity::Reject(reason) => {
            return Err(AuthError::BadRequest(reason.unwrap_or("tap_out_of_range")));
        }
    }

    let row = users.row(&user).await?;
    let done = taps
        .record(challenge.id, &read.card_id, read.counter, row.id, fix)
        .await?;

    let (purse, today) = tokio::try_join!(
        tokens.balances(row.id, Scope::Lifetime),
        tokens.balances(row.id, Scope::Today),
    )?;

    Ok(Json(Registered {
        challenge: ChallengeView::new(challenge, true),
        place: done.place,
        first: done.first,
        current_scottycoins: purse.scottycoins,
        current_thistlestones: today.thistlestones,
    }))
}
