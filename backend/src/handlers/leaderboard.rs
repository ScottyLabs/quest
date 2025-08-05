use crate::{AppState, AuthClaims, services::leaderboard::LeaderboardEntry};
use axum::{
    Extension, Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
#[derive(Deserialize)]
pub struct LeaderboardQuery {
    #[serde(default = "default_limit")]
    pub limit: u64,
    pub after_rank: Option<i64>,
}

fn default_limit() -> u64 {
    20
}

#[derive(Serialize, ToSchema)]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    pub has_next: bool,
    pub next_cursor: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/api/leaderboard",
    params(
        ("limit" = Option<u64>, Query, description = "Number of entries to return (max 100, default 20)"),
        ("after_rank" = Option<i64>, Query, description = "Cursor for pagination - rank to start after")
    ),
    responses(
        (status = 200, description = "Leaderboard retrieved successfully", body = LeaderboardResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "leaderboard"
)]
#[axum::debug_handler]
pub async fn get_leaderboard(
    State(state): State<AppState>,
    Query(params): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    // Limit the max page size
    let limit = std::cmp::min(params.limit, 100);

    // Fetch one extra to check if there are more results
    let entries = state
        .leaderboard_service
        .get_leaderboard_page(limit + 1, params.after_rank)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let has_next = entries.len() > limit as usize;
    let mut entries = entries;
    if has_next {
        entries.pop(); // Remove the extra entry
    }

    let next_cursor = if has_next {
        entries.last().map(|entry| entry.rank)
    } else {
        None
    };

    Ok(Json(LeaderboardResponse {
        entries,
        has_next,
        next_cursor,
    }))
}

#[utoipa::path(
    get,
    path = "/api/leaderboard/user",
    responses(
        (status = 200, description = "User leaderboard entry retrieved successfully", body = LeaderboardEntry),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "leaderboard"
)]
#[axum::debug_handler]
pub async fn get_user_leaderboard(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<Vec<LeaderboardEntry>>, StatusCode> {
    // Ensure user exists first
    let user = state
        .user_service
        .get_or_create_user(&claims.sub, &claims.name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    // Get top 10 on leaderboard and the user's position, and the two guys around the user
    let top_10 = state
        .leaderboard_service
        .get_leaderboard_page(10, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_position = state
        .leaderboard_service
        .get_user_leaderboard_position(&user.user_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if user_position < 10 {
        return Ok(Json(top_10));
    }

    let surrounding = state
        .leaderboard_service
        .get_leaderboard_page(3, Some(user_position - 1))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut entries = top_10;
    if let Some(user_entry) = surrounding.into_iter().find(|e| e.user_id == user.user_id) {
        entries.push(user_entry);
        entries.sort_by_key(|e| e.rank);
        entries.dedup_by_key(|e| e.user_id.clone());
    }

    Ok(Json(entries))
}
