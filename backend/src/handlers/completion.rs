use crate::AppState;
use axum::{Extension, Json, extract::State, http::StatusCode};
use chrono::{NaiveDateTime, Utc};
use clerk_rs::validators::authorizer::ClerkJwt;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreateCompletionRequest {
    pub challenge_name: String,
    pub verification_code: String,
    pub image_data: String, // base64 encoded image
    pub note: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct CreateCompletionResponse {
    pub success: bool,
    pub message: String,
    pub completion: Option<CompletionResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct CompletionResponse {
    pub challenge_name: String,
    pub completed_at: NaiveDateTime,
    pub coins_earned: i32,
}

#[utoipa::path(
    post,
    path = "/api/complete",
    request_body = CreateCompletionRequest,
    responses(
        (status = 200, description = "Completion processed", body = CreateCompletionResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "completions"
)]
#[axum::debug_handler]
pub async fn create_completion(
    State(state): State<AppState>,
    Extension(claims): Extension<ClerkJwt>,
    Json(payload): Json<CreateCompletionRequest>,
) -> Result<Json<CreateCompletionResponse>, StatusCode> {
    // Get the challenge to verify it exists and get the secret
    let challenge = state
        .challenge_service
        .get_challenge_by_name(&payload.challenge_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let challenge = match challenge {
        Some(challenge) => challenge,
        None => {
            return Ok(Json(CreateCompletionResponse {
                success: false,
                message: "Challenge not found".to_string(),
                completion: None,
            }));
        }
    };

    // Check if challenge is unlocked
    if challenge.unlock_timestamp > Utc::now().naive_utc() {
        return Ok(Json(CreateCompletionResponse {
            success: false,
            message: "Challenge is not yet unlocked".to_string(),
            completion: None,
        }));
    }

    // Verify the secret
    if payload.verification_code != challenge.secret {
        return Ok(Json(CreateCompletionResponse {
            success: false,
            message: "Invalid verification code".to_string(),
            completion: None,
        }));
    }

    // Check if user already completed this challenge
    let already_completed = state
        .completion_service
        .completion_exists(&claims.sub, &payload.challenge_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if already_completed {
        return Ok(Json(CreateCompletionResponse {
            success: false,
            message: "Challenge already completed".to_string(),
            completion: None,
        }));
    }

    // Upload the image to MinIO
    let s3_link = state
        .storage_service
        .upload_completion_image(&claims.sub, &payload.challenge_name, &payload.image_data)
        .await
        .map_err(|e| {
            eprintln!("Failed to upload image: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Create the completion with the S3 link
    let completion = state
        .completion_service
        .create_completion(
            &claims.sub,
            &payload.challenge_name,
            Some(s3_link),
            payload.note,
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateCompletionResponse {
        success: true,
        message: "Challenge completed successfully!".to_string(),
        completion: Some(CompletionResponse {
            challenge_name: completion.challenge_name,
            completed_at: completion.timestamp,
            coins_earned: challenge.scotty_coins,
        }),
    }))
}
