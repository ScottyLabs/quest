use crate::{AppState, entities::user, middleware::admin::check_staff};
use axum::{Extension, Json, extract::State, http::StatusCode};
use clerk_rs::validators::authorizer::ClerkJwt;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct UpdateDormRequest {
    pub dorm: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct UserProfileResponse {
    pub user_id: String,
    pub dorm: Option<String>,
    pub name: String,
    pub scotty_coins: i32,
    pub is_staff: bool,
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
    Extension(claims): Extension<ClerkJwt>,
) -> Result<Json<UserProfileResponse>, StatusCode> {
    let user_name = claims
        .other
        .get("name")
        .ok_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)?
        .to_string();

    // Get user, coins earned, and coins spent in parallel
    println!("Retrieving user profile for: {}", claims.sub);
    let (user, coins_earned, coins_spent) = tokio::try_join!(
        state
            .user_service
            .get_or_create_user(&claims.sub, &user_name),
        state
            .completion_service
            .get_user_total_coins_earned(&claims.sub),
        state
            .transaction_service
            .get_user_total_coins_spent(&claims.sub)
    )
    .map_err(|e| {
        eprintln!("Error retrieving user profile for {}: {}", claims.sub, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    println!("User profile retrieved for: {}", claims.sub);
    let scotty_coins = coins_earned - coins_spent;

    Ok(Json(UserProfileResponse {
        user_id: user.user_id,
        dorm: user.dorm,
        name: user.name,
        scotty_coins,
        is_staff: check_staff(claims),
    }))
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
    Extension(claims): Extension<ClerkJwt>,
    Json(payload): Json<UpdateDormRequest>,
) -> Result<Json<user::Model>, StatusCode> {
    let user = state
        .user_service
        .update_dorm(&claims.sub, payload.dorm)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(user))
}
