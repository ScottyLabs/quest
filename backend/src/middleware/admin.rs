use crate::AuthClaims;
use axum::{Extension, extract::Request, http::StatusCode, middleware::Next, response::Response};

pub async fn require_admin(
    Extension(claims): Extension<AuthClaims>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Check if user is in the O-Quest Admin group
    if claims.groups.contains(&"O-Quest Admin".to_string()) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
