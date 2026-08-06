use std::collections::HashSet;

use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::{Extension, Json, Router};
use entity::challenge;
use entity::enums::ChallengeCategory;
use sea_orm::ActiveEnum;
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};

use super::Challenges;
use crate::auth::AuthError;
use crate::auth::extract::CurrentUser;
use crate::users::Users;

pub fn router(challenges: Challenges) -> Router {
    Router::new()
        .route("/challenges", get(list))
        .route("/challenges/{id}", get(one))
        .with_state(challenges)
}

#[derive(Serialize)]
struct Location {
    lat: f64,
    lon: f64,
}

#[derive(Serialize)]
struct ChallengeView {
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
    fn new(row: challenge::Model, cleared: &HashSet<String>) -> Self {
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
            cleared: row
                .card_id
                .as_deref()
                .is_some_and(|card| cleared.contains(card)),
        }
    }
}

#[derive(Deserialize)]
struct ListQuery {
    category: Option<String>,
}

#[derive(Serialize)]
struct Board {
    challenges: Vec<ChallengeView>,
    cleared: usize,
    total: usize,
}

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
        .map(|found| ChallengeView::new(found, &cleared))
        .collect();

    Ok(Json(Board {
        cleared: views.iter().filter(|view| view.cleared).count(),
        total: views.len(),
        challenges: views,
    }))
}

async fn one(
    State(challenges): State<Challenges>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<ChallengeView>, AuthError> {
    let id = Uuid::parse_str(&id).map_err(|_| AuthError::BadRequest("challenge_id_invalid"))?;

    let row = users.row(&user).await?;
    let cleared = challenges.cleared(row.id).await?;

    Ok(Json(ChallengeView::new(
        challenges.one(id).await?,
        &cleared,
    )))
}
