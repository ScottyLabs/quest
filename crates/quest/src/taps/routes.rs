use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::{Extension, Json};
use entity::geography::Point;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{Attempt, Fix, Proximity, Taps, locked, proximity};
use crate::auth::extract::{CurrentDevice, CurrentUser};
use crate::auth::{AuthErrBody, AuthError};
use crate::challenges::routes::ChallengeView;
use crate::tokens::{Scope, Tokens};
use crate::users::Users;

const QUEST_OPEN: bool = false;

pub fn router(taps: Taps, tokens: Tokens) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(register))
        .with_state((taps, tokens))
}

#[derive(Deserialize, ToSchema)]
struct TapBody {
    url: String,
    lat: Option<f64>,
    lon: Option<f64>,
    accuracy: Option<f32>,
    #[serde(default)]
    location_enabled: bool,
}

#[derive(Serialize, ToSchema)]
struct Registered {
    challenge: ChallengeView,
    place: i64,
    first: bool,
    current_scottycoins: i64,
    // This is a daily count
    current_thistlestones: i64,
}

#[utoipa::path(
    post,
    path = "/register_tap",
    tag = "taps",
    request_body = TapBody,
    responses(
        (status = OK, body = Registered),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = CONFLICT, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
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

    if !QUEST_OPEN {
        return Err(AuthError::Conflict("quest_is_closed"));
    }
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

    match proximity(challenge.location, attempt.fix, body.location_enabled) {
        Proximity::Accept => {}
        Proximity::Reject(reason) => {
            let out = AuthError::BadRequest(reason);
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
        challenge: ChallengeView::new(challenge, true, false),
        place: done.place,
        first: done.first,
        current_scottycoins: purse.scottycoins,
        current_thistlestones: today.thistlestones,
    }))
}
