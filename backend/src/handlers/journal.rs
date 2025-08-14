use crate::services::traits::{ChallengeServiceTrait, CompletionServiceTrait};
use crate::{AppState, AuthClaims};
use axum::{
    Extension, Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct JournalListResponse {
    pub entries: Vec<JournalEntry>,
}

#[derive(Serialize, ToSchema)]
pub struct JournalEntry {
    pub challenge_name: String,
    pub completed_at: NaiveDateTime,
    pub note: Option<String>,
    pub image_url: Option<String>,
    pub coins_earned: i32,
    // Challenge details for context
    pub challenge_tagline: String,
    pub challenge_location: String,
    pub challenge_category: String,
}

#[derive(Serialize, ToSchema)]
pub struct JournalEntryResponse {
    pub entry: Option<JournalEntry>,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateJournalRequest {
    pub note: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/journal",
    responses(
        (status = 200, description = "Journal entries retrieved successfully", body = JournalListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "journal"
)]
#[axum::debug_handler]
pub async fn get_journal(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<JournalListResponse>, StatusCode> {
    let completions_with_challenges = state
        .completion_service
        .get_user_completions_with_challenges(&claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut entries = Vec::new();

    for (completion, challenge) in completions_with_challenges {
        // Generate presigned URL if there's an image
        let image_url = if let Some(ref s3_link) = completion.s3_link {
            state
                .storage_service
                .get_journal_image_url(s3_link)
                .await
                .unwrap_or(None)
        } else {
            None
        };

        entries.push(JournalEntry {
            challenge_name: completion.challenge_name,
            completed_at: completion.timestamp,
            note: completion.note,
            image_url,
            coins_earned: challenge.scotty_coins,
            challenge_tagline: challenge.tagline,
            challenge_location: challenge.location,
            challenge_category: challenge.category,
        });
    }

    // Sort by completion date, most recent first
    entries.sort_by(|a, b| b.completed_at.cmp(&a.completed_at));

    Ok(Json(JournalListResponse { entries }))
}

#[utoipa::path(
    get,
    path = "/api/journal/{challenge_name}",
    params(
        ("challenge_name" = String, Path, description = "Name of the challenge")
    ),
    responses(
        (status = 200, description = "Journal entry retrieved successfully", body = JournalEntryResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "journal"
)]
#[axum::debug_handler]
pub async fn get_journal_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Path(challenge_name): Path<String>,
) -> Result<Json<JournalEntryResponse>, StatusCode> {
    let completion_with_challenge = state
        .completion_service
        .get_user_completion_with_challenge(&claims.sub, &challenge_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let entry = if let Some((completion, challenge)) = completion_with_challenge {
        // Generate presigned URL if there's an image
        let image_url = if let Some(ref s3_link) = completion.s3_link {
            state
                .storage_service
                .get_journal_image_url(s3_link)
                .await
                .unwrap_or(None)
        } else {
            None
        };

        Some(JournalEntry {
            challenge_name: completion.challenge_name,
            completed_at: completion.timestamp,
            note: completion.note,
            image_url,
            coins_earned: challenge.scotty_coins,
            challenge_tagline: challenge.tagline,
            challenge_location: challenge.location,
            challenge_category: challenge.category,
        })
    } else {
        None
    };

    Ok(Json(JournalEntryResponse { entry }))
}

#[utoipa::path(
    put,
    path = "/api/journal/{challenge_name}",
    params(
        ("challenge_name" = String, Path, description = "Name of the challenge")
    ),
    request_body = UpdateJournalRequest,
    responses(
        (status = 200, description = "Journal entry updated successfully", body = JournalEntryResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "journal"
)]
#[axum::debug_handler]
pub async fn update_journal_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Path(challenge_name): Path<String>,
    Json(payload): Json<UpdateJournalRequest>,
) -> Result<Json<JournalEntryResponse>, StatusCode> {
    // Update the completion note
    let updated_completion = state
        .completion_service
        .update_completion_note(&claims.sub, &challenge_name, payload.note)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if updated_completion.is_some() {
        // Invalidate user completion caches after note update
        state.cache_manager.invalidate_user_data(&claims.sub).await;
    }

    let entry = if let Some(completion) = updated_completion {
        // Get challenge details for the response
        let challenge = state
            .challenge_service
            .get_challenge_by_name(&challenge_name)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if let Some(challenge) = challenge {
            // Generate presigned URL if there's an image
            let image_url = if let Some(ref s3_link) = completion.s3_link {
                state
                    .storage_service
                    .get_journal_image_url(s3_link)
                    .await
                    .unwrap_or(None)
            } else {
                None
            };

            Some(JournalEntry {
                challenge_name: completion.challenge_name,
                completed_at: completion.timestamp,
                note: completion.note,
                image_url,
                coins_earned: challenge.scotty_coins,
                challenge_tagline: challenge.tagline,
                challenge_location: challenge.location,
                challenge_category: challenge.category,
            })
        } else {
            None
        }
    } else {
        None
    };

    Ok(Json(JournalEntryResponse { entry }))
}

#[derive(Serialize, ToSchema)]
pub struct DeletePhotoResponse {
    pub success: bool,
    pub message: String,
}

#[utoipa::path(
    delete,
    path = "/api/journal/{challenge_name}/photo",
    params(
        ("challenge_name" = String, Path, description = "Name of the challenge")
    ),
    responses(
        (status = 200, description = "Photo deletion processed", body = DeletePhotoResponse),
        (status = 404, description = "Journal entry not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "journal"
)]
#[axum::debug_handler]
pub async fn delete_journal_photo(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Path(challenge_name): Path<String>,
) -> Result<Json<DeletePhotoResponse>, StatusCode> {
    // Get the completion to check if it exists and has a photo
    let completion = state
        .completion_service
        .get_user_completion_with_challenge(&claims.sub, &challenge_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (completion, _challenge) = match completion {
        Some((completion, challenge)) => (completion, challenge),
        None => {
            return Ok(Json(DeletePhotoResponse {
                success: false,
                message: "Journal entry not found".to_string(),
            }));
        }
    };

    // Check if there's actually a photo to delete
    let s3_link = match &completion.s3_link {
        Some(link) => link,
        None => {
            return Ok(Json(DeletePhotoResponse {
                success: false,
                message: "No photo to delete".to_string(),
            }));
        }
    };

    let s3_deleted = state
        .storage_service
        .delete_image(s3_link)
        .await
        .unwrap_or(false); // Continue if S3 delete fails

    // Update completion to remove s3_link
    let updated = state
        .completion_service
        .update_completion_photo(&claims.sub, &challenge_name, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (success, message) = match updated {
        Some(_) => {
            // Invalidate user completion caches after photo deletion
            state.cache_manager.invalidate_user_data(&claims.sub).await;

            if s3_deleted {
                (true, "Photo deleted successfully".to_string())
            } else {
                (
                    true,
                    "Photo removed from journal, S3 deletion failed".to_string(),
                )
            }
        }
        None => (false, "Failed to delete photo".to_string()),
    };

    Ok(Json(DeletePhotoResponse { success, message }))
}
