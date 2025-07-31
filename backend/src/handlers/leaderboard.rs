use crate::{AppState, services::leaderboard::LeaderboardEntry};
use axum::{
    Json,
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
