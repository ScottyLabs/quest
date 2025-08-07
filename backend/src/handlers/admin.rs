use crate::{AppState, AuthClaims, handlers::challenges::ChallengeStatus};
use axum::{Extension, Json, extract::State, http::StatusCode};
use chrono::{NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct AdminChallengesListResponse {
    pub challenges: Vec<AdminChallengeResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct AdminChallengeResponse {
    pub name: String,
    pub category: String,
    pub location: String,
    pub scotty_coins: i32,
    pub maps_link: Option<String>,
    pub tagline: String,
    pub description: String,
    pub more_info_link: Option<String>,
    pub unlock_timestamp: NaiveDateTime,
    pub secret: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub location_accuracy: Option<rust_decimal::Decimal>,
    // Completion data
    pub status: ChallengeStatus,
    pub completed_at: Option<NaiveDateTime>,
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
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<AdminChallengesListResponse>, StatusCode> {
    // Get all challenges and completion data in parallel
    let (challenges, user_completions) = tokio::try_join!(
        state.challenge_service.get_all_challenges(),
        state
            .completion_service
            .get_user_completion_map(&claims.sub)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let now = Utc::now().naive_utc();

    let challenge_responses: Vec<AdminChallengeResponse> = challenges
        .into_iter()
        .map(|challenge| {
            let is_unlocked = challenge.unlock_timestamp <= now;
            let completed_at = user_completions.get(&challenge.name).copied();

            let status = if completed_at.is_some() {
                ChallengeStatus::Completed
            } else if is_unlocked {
                ChallengeStatus::Available
            } else {
                ChallengeStatus::Locked
            };

            AdminChallengeResponse {
                name: challenge.name,
                category: challenge.category,
                location: challenge.location,
                scotty_coins: challenge.scotty_coins,
                maps_link: challenge.maps_link,
                tagline: challenge.tagline,
                description: challenge.description,
                more_info_link: challenge.more_info_link,
                unlock_timestamp: challenge.unlock_timestamp,
                secret: challenge.secret,
                latitude: challenge.latitude,
                longitude: challenge.longitude,
                location_accuracy: challenge.location_accuracy,
                status,
                completed_at,
            }
        })
        .collect();

    Ok(Json(AdminChallengesListResponse {
        challenges: challenge_responses,
    }))
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
