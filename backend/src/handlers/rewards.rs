use crate::{AppState, AuthClaims};
use axum::{Extension, Json, extract::State, http::StatusCode};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct RewardsListResponse {
    pub rewards: Vec<RewardResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct RewardResponse {
    pub name: String,
    pub slug: String,
    pub cost: i32,
    pub stock: i32,
    pub trade_limit: i32,
    pub purchased_count: i32,
}

#[utoipa::path(
    get,
    path = "/api/rewards",
    responses(
        (status = 200, description = "Rewards retrieved successfully", body = RewardsListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "rewards"
)]
#[axum::debug_handler]
pub async fn get_rewards(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<RewardsListResponse>, StatusCode> {
    // Get all rewards and user trades in parallel
    let (rewards, user_trades) = tokio::try_join!(
        state.reward_service.get_all_rewards(),
        state.trade_service.get_user_trade_counts(&claims.sub)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let reward_responses: Vec<RewardResponse> = rewards
        .into_iter()
        .map(|reward| {
            let purchased_count = user_trades.get(&reward.name).copied().unwrap_or(0);

            RewardResponse {
                name: reward.name.clone(),
                slug: reward.slug,
                cost: reward.cost,
                stock: reward.stock,
                trade_limit: reward.trade_limit,
                purchased_count,
            }
        })
        .collect();

    Ok(Json(RewardsListResponse {
        rewards: reward_responses,
    }))
}
