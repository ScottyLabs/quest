use crate::{AppState, AuthClaims};
use axum::{Extension, Json, extract::State, http::StatusCode};
use chrono::{NaiveDateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct ChallengesListResponse {
    pub challenges: Vec<ChallengeResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct ChallengeResponse {
    pub name: String,
    pub status: ChallengeStatus,
    pub unlock_timestamp: NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<NaiveDateTime>,
    #[serde(flatten, skip_serializing_if = "Option::is_none")]
    pub details: Option<ChallengeDetails>,
}

#[derive(Serialize, ToSchema)]
pub struct ChallengeDetails {
    pub category: String,
    pub location: String,
    pub scotty_coins: i32,
    pub maps_link: String,
    pub tagline: String,
    pub description: String,
    pub more_info_link: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ChallengeStatus {
    Locked,
    Available,
    Completed,
}

#[utoipa::path(
    get,
    path = "/api/challenges",
    responses(
        (status = 200, description = "Challenges retrieved successfully", body = ChallengesListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "challenges"
)]
#[axum::debug_handler]
pub async fn get_challenges(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Result<Json<ChallengesListResponse>, StatusCode> {
    // Get all challenges and user completions in parallel
    let (challenges, completions) = tokio::try_join!(
        state.challenge_service.get_all_challenges(),
        state
            .completion_service
            .get_user_completion_map(&claims.sub)
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let now = Utc::now().naive_utc();

    let challenge_responses: Vec<ChallengeResponse> = challenges
        .into_iter()
        .map(|challenge| {
            let is_unlocked = challenge.unlock_timestamp <= now;
            let completed_at = completions.get(&challenge.name).copied();

            let status = if completed_at.is_some() {
                ChallengeStatus::Completed
            } else if is_unlocked {
                ChallengeStatus::Available
            } else {
                ChallengeStatus::Locked
            };

            let details = if is_unlocked {
                Some(ChallengeDetails {
                    category: challenge.category,
                    location: challenge.location,
                    scotty_coins: challenge.scotty_coins,
                    maps_link: challenge.maps_link,
                    tagline: challenge.tagline,
                    description: challenge.description,
                    more_info_link: challenge.more_info_link,
                })
            } else {
                None
            };

            ChallengeResponse {
                name: challenge.name,
                status,
                unlock_timestamp: challenge.unlock_timestamp,
                completed_at,
                details,
            }
        })
        .collect();

    Ok(Json(ChallengesListResponse {
        challenges: challenge_responses,
    }))
}
