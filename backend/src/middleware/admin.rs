use crate::{AppState, AuthClaims};
use axum::{
    Extension,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};

pub async fn require_admin(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let has_admin_flag = state
        .user_service
        .is_user_admin(&claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if has_admin_flag || claims.groups.contains(&"O-Quest Admin".to_string()) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
