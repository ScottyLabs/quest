use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::Staff;
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::taps::Taps;

#[derive(Clone)]
pub struct Desk {
    staff: Staff,
    taps: Taps,
}

pub fn router(staff: Staff, taps: Taps) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(read))
        .routes(routes!(link, unlink))
        .routes(routes!(place))
        .with_state(Desk { staff, taps })
}

#[derive(Deserialize, ToSchema)]
struct CardUrl {
    url: String,
}

#[derive(Serialize, ToSchema)]
struct CardView {
    card_id: String,
    challenge_id: Option<Uuid>,
    lat: Option<f64>,
    lon: Option<f64>,
}

#[derive(Deserialize, ToSchema)]
struct LinkBody {
    challenge_id: Uuid,
}

#[derive(Deserialize, ToSchema)]
struct PlaceBody {
    lat: f64,
    lon: f64,
}

fn allowed(user: &crate::auth::session::SessionUser) -> Result<(), AuthError> {
    crate::access::allows(user, crate::access::Capability::CardDesk)
        .then_some(())
        .ok_or(AuthError::Forbidden("staff_only"))
}

fn card_id(raw: &str) -> Result<String, AuthError> {
    let id = raw.to_ascii_uppercase();

    let shaped = id.len() == 14 && id.bytes().all(|b| b.is_ascii_hexdigit());

    shaped
        .then_some(id)
        .ok_or(AuthError::BadRequest("card_id_malformed"))
}

#[utoipa::path(
    post,
    path = "/staff/card",
    tag = "staff",
    request_body = CardUrl,
    responses(
        (status = OK, body = CardView),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = FORBIDDEN, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn read(
    State(desk): State<Desk>,
    CurrentUser(user): CurrentUser,
    body: Result<Json<CardUrl>, JsonRejection>,
) -> Result<Json<CardView>, AuthError> {
    allowed(&user)?;
    let Json(body) = body.map_err(|_| AuthError::BadRequest("card_body_invalid"))?;

    let tap = desk.taps.read(&body.url)?;
    let placement = desk.staff.placement(&tap.card_id).await?;

    Ok(Json(CardView {
        card_id: placement.card_id,
        challenge_id: placement.challenge_id,
        lat: placement.location.as_ref().map(|at| at.lat),
        lon: placement.location.as_ref().map(|at| at.lon),
    }))
}

#[utoipa::path(
    put,
    path = "/staff/card/{card_id}/challenge",
    tag = "staff",
    params(("card_id" = String, Path, description = "Uppercase hex card UID")),
    request_body = LinkBody,
    responses(
        (status = OK, body = CardView),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = FORBIDDEN, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn link(
    State(desk): State<Desk>,
    CurrentUser(user): CurrentUser,
    Path(card): Path<String>,
    body: Result<Json<LinkBody>, JsonRejection>,
) -> Result<Json<CardView>, AuthError> {
    allowed(&user)?;
    let Json(body) = body.map_err(|_| AuthError::BadRequest("card_body_invalid"))?;
    let card = card_id(&card)?;

    desk.staff.link(&card, body.challenge_id).await?;
    view(&desk.staff, &card).await
}

#[utoipa::path(
    delete,
    path = "/staff/card/{card_id}/challenge",
    tag = "staff",
    params(("card_id" = String, Path, description = "Uppercase hex card UID")),
    responses(
        (status = OK, body = CardView),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = FORBIDDEN, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn unlink(
    State(desk): State<Desk>,
    CurrentUser(user): CurrentUser,
    Path(card): Path<String>,
) -> Result<Json<CardView>, AuthError> {
    allowed(&user)?;
    let card = card_id(&card)?;

    desk.staff.unlink(&card).await?;
    view(&desk.staff, &card).await
}

#[utoipa::path(
    put,
    path = "/staff/card/{card_id}/location",
    tag = "staff",
    params(("card_id" = String, Path, description = "Uppercase hex card UID")),
    request_body = PlaceBody,
    responses(
        (status = OK, body = CardView),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = FORBIDDEN, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn place(
    State(desk): State<Desk>,
    CurrentUser(user): CurrentUser,
    Path(card): Path<String>,
    body: Result<Json<PlaceBody>, JsonRejection>,
) -> Result<Json<CardView>, AuthError> {
    allowed(&user)?;
    let Json(body) = body.map_err(|_| AuthError::BadRequest("card_body_invalid"))?;
    let card = card_id(&card)?;

    if !body.lat.is_finite() || !body.lon.is_finite() {
        return Err(AuthError::BadRequest("card_location_invalid"));
    }

    desk.staff
        .place(&card, entity::geography::Point::new(body.lon, body.lat))
        .await?;

    view(&desk.staff, &card).await
}

async fn view(staff: &Staff, card_id: &str) -> Result<Json<CardView>, AuthError> {
    let placement = staff.placement(card_id).await?;

    Ok(Json(CardView {
        card_id: placement.card_id,
        challenge_id: placement.challenge_id,
        lat: placement.location.as_ref().map(|at| at.lat),
        lon: placement.location.as_ref().map(|at| at.lon),
    }))
}
