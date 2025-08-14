use crate::services::traits::RewardServiceTrait;
use crate::{AppState, AuthClaims};
use axum::{Extension, Json, extract::State, http::StatusCode};
use chrono::NaiveDateTime;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct RewardsListResponse {
    pub rewards: Vec<RewardResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct RewardResponse {
    pub name: String,
    pub cost: i32,
    pub stock: i32,
    pub trade_limit: i32,
    pub transaction_info: RewardTransactionInfo,
}

#[derive(Serialize, ToSchema)]
pub struct RewardTransactionInfo {
    pub total_purchased: i32,
    pub incomplete_count: i32,
    pub complete_count: i32,
    pub transactions: Vec<TransactionDetail>,
}

#[derive(Serialize, ToSchema)]
pub struct TransactionDetail {
    pub transaction_id: String,
    pub count: i32,
    pub timestamp: NaiveDateTime,
    pub status: String,
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
    let rewards = state
        .reward_service
        .get_all_rewards()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut reward_responses = Vec::new();

    for reward in rewards {
        // Get transactions for this specific reward
        let transactions = state
            .transaction_service
            .get_user_reward_transactions(&claims.sub, &reward.name)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut total_purchased = 0;
        let mut incomplete_count = 0;
        let mut complete_count = 0;
        let mut transaction_details = Vec::new();

        for transaction in transactions {
            total_purchased += transaction.count;

            if transaction.status == "complete" {
                complete_count += transaction.count;
            } else {
                incomplete_count += transaction.count;
            }

            transaction_details.push(TransactionDetail {
                transaction_id: transaction.id.to_string(),
                count: transaction.count,
                timestamp: transaction.timestamp,
                status: transaction.status,
            });
        }

        // Sort transactions by timestamp, most recent first
        transaction_details.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        reward_responses.push(RewardResponse {
            name: reward.name.clone(),
            cost: reward.cost,
            stock: reward.stock,
            trade_limit: reward.trade_limit,
            transaction_info: RewardTransactionInfo {
                total_purchased,
                incomplete_count,
                complete_count,
                transactions: transaction_details,
            },
        });
    }

    Ok(Json(RewardsListResponse {
        rewards: reward_responses,
    }))
}
