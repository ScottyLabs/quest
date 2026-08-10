use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::routing::post;
use axum::{Extension, Json, Router};
use entity::geography::Point;
use serde::{Deserialize, Serialize};

use super::{Attempt, Fix, Proximity, Taps, locked, proximity};
use crate::auth::AuthError;
use crate::auth::extract::{CurrentDevice, CurrentUser};
use crate::challenges::routes::ChallengeView;
use crate::tokens::{Scope, Tokens};
use crate::users::Users;

pub fn router(taps: Taps, tokens: Tokens) -> Router {
    Router::new()
        .route("/register_tap", post(register))
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
    CurrentDevice(device): CurrentDevice,
    body: Result<Json<TapBody>, JsonRejection>,
) -> Result<Json<Registered>, AuthError> {
    let row = users.row(&user).await?;

    let mut attempt = Attempt {
        user_id: Some(row.id),
        device_key: Some(device),
        ..Default::default()
    };

    let Json(body) = taps
        .audited(
            &attempt,
            body.map_err(|_| AuthError::BadRequest("tap_body_invalid")),
        )
        .await?;

    attempt.url = Some(body.url.clone());

    let fix = match (body.lat, body.lon) {
        (Some(lat), Some(lon)) if lat.is_finite() && lon.is_finite() => Some(Fix {
            at: Point::new(lon, lat),
            accuracy: body
                .accuracy
                .filter(|metres| metres.is_finite() && *metres >= 0.0),
        }),
        _ => None,
    };

    attempt.fix = fix;

    let read = taps.audited(&attempt, taps.read(&body.url)).await?;

    attempt.card_id = Some(read.card_id.clone());
    attempt.counter = Some(read.counter);

    let challenge = taps
        .audited(&attempt, taps.challenge_for(&read.card_id).await)
        .await?;

    attempt.challenge_id = Some(challenge.id);

    if locked(&challenge) {
        let shut = AuthError::Conflict("card_locked");
        return Err(taps.rejected(&attempt, shut).await);
    }

    match proximity(challenge.location, fix.map(|fix| fix.at)) {
        Proximity::Accept => {}
        Proximity::Reject(reason) => {
            let out = AuthError::BadRequest(reason.unwrap_or("tap_out_of_range"));
            return Err(taps.rejected(&attempt, out).await);
        }
    }

    let done = taps
        .audited(
            &attempt,
            taps.record(challenge.id, &read.card_id, read.counter, row.id, fix)
                .await,
        )
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
