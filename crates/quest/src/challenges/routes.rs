use std::collections::HashSet;

use axum::extract::{Path, Query, State};
use axum::{Extension, Json};
use entity::challenge;
use entity::enums::ChallengeCategory;
use sea_orm::ActiveEnum;
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::Challenges;
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::users::Users;

pub fn router(challenges: Challenges) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(list))
        .routes(routes!(one))
        .with_state(challenges)
}

#[derive(Serialize, ToSchema)]
pub struct Location {
    lat: f64,
    lon: f64,
}

#[derive(Serialize, ToSchema)]
pub struct ChallengeView {
    id: String,
    name: String,
    tagline: String,
    description: String,
    category: String,
    coin_value: i64,
    location: Option<Location>,
    open_from: String,
    cleared: bool,
}

impl ChallengeView {
    pub fn new(row: challenge::Model, cleared: bool) -> Self {
        Self {
            id: row.id.to_string(),
            name: row.name,
            tagline: row.tagline,
            description: row.description,
            category: row.category.to_value(),
            coin_value: row.coin_value,
            location: row.location.map(|at| Location {
                lat: at.lat,
                lon: at.lon,
            }),
            open_from: row.open_from.to_rfc3339(),
            cleared,
        }
    }

    fn from_set(row: challenge::Model, cleared: &HashSet<Uuid>) -> Self {
        let done = cleared.contains(&row.id);
        Self::new(row, done)
    }
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct ListQuery {
    category: Option<String>,
}

#[derive(Serialize, ToSchema)]
struct Board {
    challenges: Vec<ChallengeView>,
    cleared: usize,
    total: usize,
}

#[utoipa::path(
    get,
    path = "/challenges",
    operation_id = "list_challenges",
    tag = "challenges",
    params(ListQuery),
    responses(
        (status = OK, body = Board),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn list(
    State(challenges): State<Challenges>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Query(query): Query<ListQuery>,
) -> Result<Json<Board>, AuthError> {
    let category = match query.category.as_deref() {
        None => None,
        Some(raw) => Some(
            ChallengeCategory::try_from_value(&raw.to_owned())
                .map_err(|_| AuthError::BadRequest("category_invalid"))?,
        ),
    };

    let row = users.row(&user).await?;
    let cleared = challenges.cleared(row.id).await?;

    let views: Vec<ChallengeView> = challenges
        .list(category)
        .await?
        .into_iter()
        .map(|found| ChallengeView::from_set(found, &cleared))
        .collect();

    Ok(Json(Board {
        cleared: views.iter().filter(|view| view.cleared).count(),
        total: views.len(),
        challenges: views,
    }))
}

#[utoipa::path(
    get,
    path = "/challenges/{id}",
    tag = "challenges",
    params(("id" = String, Path, description = "Challenge id")),
    responses(
        (status = OK, body = ChallengeView),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn one(
    State(challenges): State<Challenges>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<ChallengeView>, AuthError> {
    let id = Uuid::parse_str(&id).map_err(|_| AuthError::BadRequest("challenge_id_invalid"))?;

    let row = users.row(&user).await?;
    let cleared = challenges.cleared(row.id).await?;

    Ok(Json(ChallengeView::from_set(
        challenges.one(id).await?,
        &cleared,
    )))
}
