use crate::{AppState, AuthClaims};
use axum::{Extension, Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreateTradeRequest {
    pub reward_name: String,
    pub count: i32,
}

#[derive(Serialize, ToSchema)]
pub struct CreateTradeResponse {
    pub success: bool,
    pub message: String,
    pub trade: Option<TradeResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct TradeResponse {
    pub reward_name: String,
    pub count: i32,
    pub total_cost: i32,
}

#[utoipa::path(
    post,
    path = "/api/trade",
    request_body = CreateTradeRequest,
    responses(
        (status = 200, description = "Trade processed", body = CreateTradeResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "trades"
)]
#[axum::debug_handler]
pub async fn create_trade(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<CreateTradeRequest>,
) -> Result<Json<CreateTradeResponse>, StatusCode> {
    // Validate count is positive
    if payload.count <= 0 {
        return Ok(Json(CreateTradeResponse {
            success: false,
            message: "Count must be positive".to_string(),
            trade: None,
        }));
    }

    // Get the reward to check if it exists and get cost
    let reward = state
        .reward_service
        .get_reward_by_name(&payload.reward_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let reward = match reward {
        Some(reward) => reward,
        None => {
            return Ok(Json(CreateTradeResponse {
                success: false,
                message: "Reward not found".to_string(),
                trade: None,
            }));
        }
    };

    // Check if there's enough stock
    if payload.count > reward.stock {
        return Ok(Json(CreateTradeResponse {
            success: false,
            message: "Insufficient stock".to_string(),
            trade: None,
        }));
    }

    // Get user's current trade count for this reward and check trade limit
    let current_trades = state
        .trade_service
        .get_user_trade_counts(&claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_count = current_trades
        .get(&payload.reward_name)
        .copied()
        .unwrap_or(0);
    if current_count + payload.count > reward.trade_limit {
        return Ok(Json(CreateTradeResponse {
            success: false,
            message: "Would exceed trade limit".to_string(),
            trade: None,
        }));
    }

    // Check if user has enough coins
    let (coins_earned, coins_spent) = tokio::try_join!(
        state
            .completion_service
            .get_user_total_coins_earned(&claims.sub),
        state.trade_service.get_user_total_coins_spent(&claims.sub)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let available_coins = coins_earned - coins_spent;
    let total_cost = reward.cost * payload.count;

    if total_cost > available_coins {
        return Ok(Json(CreateTradeResponse {
            success: false,
            message: "Insufficient coins".to_string(),
            trade: None,
        }));
    }

    // Create the trade
    let trade = state
        .trade_service
        .create_trade(&claims.sub, &payload.reward_name, payload.count)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateTradeResponse {
        success: true,
        message: "Trade successful".to_string(),
        trade: Some(TradeResponse {
            reward_name: trade.reward_name,
            count: trade.count,
            total_cost,
        }),
    }))
}
