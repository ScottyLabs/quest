use crate::{AppState, entities::challenges};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct AdminChallengesListResponse {
    pub challenges: Vec<challenges::Model>,
}

#[utoipa::path(
    get,
    path = "/api/admin/challenges",
    responses(
        (status = 200, description = "All challenges retrieved successfully", body = AdminChallengesListResponse),
        (status = 403, description = "Forbidden - Admin access required"),
        (status = 500, description = "Internal server error")
    ),
    tag = "admin"
)]
#[axum::debug_handler]
pub async fn get_all_challenges(
    State(state): State<AppState>,
) -> Result<Json<AdminChallengesListResponse>, StatusCode> {
    let challenges = state
        .challenge_service
        .get_all_challenges()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AdminChallengesListResponse { challenges }))
}

#[derive(Deserialize, ToSchema)]
pub struct VerifyTransactionRequest {
    pub transaction_id: String,
}

#[derive(Serialize, ToSchema)]
pub struct VerifyTransactionResponse {
    pub success: bool,
    pub message: String,
}

#[utoipa::path(
    post,
    path = "/api/admin/verify_transaction",
    request_body = VerifyTransactionRequest,
    responses(
        (status = 200, description = "Transaction verification processed", body = VerifyTransactionResponse),
        (status = 403, description = "Forbidden - Admin access required"),
        (status = 500, description = "Internal server error")
    ),
    tag = "admin"
)]
#[axum::debug_handler]
pub async fn verify_transaction(
    State(state): State<AppState>,
    Json(payload): Json<VerifyTransactionRequest>,
) -> Result<Json<VerifyTransactionResponse>, StatusCode> {
    let updated_transaction = state
        .transaction_service
        .update_transaction_status(&payload.transaction_id, "complete")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (success, message) = match updated_transaction {
        Some(_) => (true, "Transaction verified successfully".to_string()),
        None => (false, "Transaction not found".to_string()),
    };

    Ok(Json(VerifyTransactionResponse { success, message }))
}
