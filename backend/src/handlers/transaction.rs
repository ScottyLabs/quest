use crate::{AppState, AuthClaims};
use axum::{Extension, Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreateTransactionRequest {
    pub reward_name: String,
    pub count: i32,
}

#[derive(Serialize, ToSchema)]
pub struct CreateTransactionResponse {
    pub success: bool,
    pub message: String,
    pub transaction: Option<TransactionResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct TransactionResponse {
    pub transaction_id: String,
    pub reward_name: String,
    pub count: i32,
    pub total_cost: i32,
    pub status: String,
}

#[utoipa::path(
    post,
    path = "/api/transaction",
    request_body = CreateTransactionRequest,
    responses(
        (status = 200, description = "Transaction processed", body = CreateTransactionResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "transactions"
)]
#[axum::debug_handler]
pub async fn create_transaction(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<CreateTransactionRequest>,
) -> Result<Json<CreateTransactionResponse>, StatusCode> {
    // Validate count is positive
    if payload.count <= 0 {
        return Ok(Json(CreateTransactionResponse {
            success: false,
            message: "Count must be positive".to_string(),
            transaction: None,
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
            return Ok(Json(CreateTransactionResponse {
                success: false,
                message: "Reward not found".to_string(),
                transaction: None,
            }));
        }
    };

    // Check if there's enough stock
    if payload.count > reward.stock {
        return Ok(Json(CreateTransactionResponse {
            success: false,
            message: "Insufficient stock".to_string(),
            transaction: None,
        }));
    }

    // Get user's current total count for this reward and check trade limit
    let current_totals = state
        .transaction_service
        .get_user_total_counts(&claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_count = current_totals
        .get(&payload.reward_name)
        .copied()
        .unwrap_or(0);

    if current_count + payload.count > reward.trade_limit {
        return Ok(Json(CreateTransactionResponse {
            success: false,
            message: "Would exceed trade limit".to_string(),
            transaction: None,
        }));
    }

    // Check if user has enough coins
    let (coins_earned, coins_spent) = tokio::try_join!(
        state
            .completion_service
            .get_user_total_coins_earned(&claims.sub),
        state
            .transaction_service
            .get_user_total_coins_spent(&claims.sub)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let available_coins = coins_earned - coins_spent;
    let total_cost = reward.cost * payload.count;

    if total_cost > available_coins {
        return Ok(Json(CreateTransactionResponse {
            success: false,
            message: "Insufficient coins".to_string(),
            transaction: None,
        }));
    }

    // Create the transaction
    let transaction = state
        .transaction_service
        .create_transaction(&claims.sub, &payload.reward_name, payload.count)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateTransactionResponse {
        success: true,
        message: "Transaction successful".to_string(),
        transaction: Some(TransactionResponse {
            transaction_id: transaction.id.to_string(),
            reward_name: transaction.reward_name,
            count: transaction.count,
            total_cost,
            status: transaction.status,
        }),
    }))
}
