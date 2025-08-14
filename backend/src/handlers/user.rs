use std::collections::HashMap;

use crate::services::traits::{
    ChallengeServiceTrait, CompletionServiceTrait, LeaderboardServiceTrait,
};
use crate::{AppState, AuthClaims, entities::user};
use axum::{Extension, Json, extract::State, http::StatusCode};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct UserProfileResponse {
    pub user_id: String,
    pub dorm: Option<String>,
    pub name: String,
    pub scotty_coins: CoinsSummaryResponse,
    pub groups: Vec<String>,
    pub leaderboard_position: i64,

    // Challenge completion statistics
    pub challenges_completed: ChallengeCompletionStats,
    pub total_challenges: ChallengeTotalStats,

    // Activity summary for streaks
    pub recent_activity_days: Vec<NaiveDateTime>,
}

#[derive(Serialize, ToSchema)]
pub struct CoinsSummaryResponse {
    pub current: i32,
    pub total_earned: i32,
    pub total_spent: i32,
}

#[derive(Serialize, ToSchema)]
pub struct ChallengeCompletionStats {
    pub total: i32,
    pub by_category: HashMap<String, i32>,
}

#[derive(Serialize, ToSchema)]
pub struct ChallengeTotalStats {
    pub total: i32,
    pub by_category: HashMap<String, i32>,
}

#[utoipa::path(
    get,
    path = "/api/profile",
    responses(
        (status = 200, description = "User profile retrieved successfully", body = UserProfileResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "user"
)]
#[axum::debug_handler]
pub async fn get_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<UserProfileResponse>, StatusCode> {
    // Ensure user exists first
    let user = state
        .user_service
        .get_or_create_user(&claims.sub, &claims.name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch the rest of the required data in parallel
    let (
        coins_earned,
        coins_spent,
        leaderboard_position,
        user_completions_by_category,
        user_completion_count,
        total_challenges_by_category,
        total_challenge_count,
        recent_activity_days,
    ) = tokio::try_join!(
        state
            .completion_service
            .get_user_total_coins_earned(&claims.sub),
        state
            .transaction_service
            .get_user_total_coins_spent(&claims.sub),
        state
            .leaderboard_service
            .get_user_leaderboard_position(&claims.sub),
        state
            .completion_service
            .get_user_completions_by_category(&claims.sub),
        state
            .completion_service
            .get_user_completion_count(&claims.sub),
        state.challenge_service.get_total_challenges_by_category(),
        state.challenge_service.get_total_challenge_count(),
        state
            .completion_service
            .get_user_recent_activity_days(&claims.sub, 7)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_scotty_coins = coins_earned - coins_spent;

    Ok(Json(UserProfileResponse {
        user_id: user.user_id,
        dorm: user.dorm,
        name: user.name,
        scotty_coins: CoinsSummaryResponse {
            current: current_scotty_coins,
            total_earned: coins_earned,
            total_spent: coins_spent,
        },
        groups: claims.groups,
        leaderboard_position,

        // Challenge completion statistics
        challenges_completed: ChallengeCompletionStats {
            total: user_completion_count,
            by_category: user_completions_by_category,
        },
        total_challenges: ChallengeTotalStats {
            total: total_challenge_count,
            by_category: total_challenges_by_category,
        },

        // Activity summary for streaks
        recent_activity_days,
    }))
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateDormRequest {
    pub dorm: Option<String>,
}

#[utoipa::path(
    put,
    path = "/api/profile/dorm",
    request_body = UpdateDormRequest,
    responses(
        (status = 200, description = "Dorm updated successfully", body = user::Model),
        (status = 500, description = "Internal server error")
    ),
    tag = "user"
)]
#[axum::debug_handler]
pub async fn update_dorm(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<UpdateDormRequest>,
) -> Result<Json<user::Model>, StatusCode> {
    let user = state
        .user_service
        .update_dorm(&claims.sub, payload.dorm)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(user))
}
