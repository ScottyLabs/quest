use axum::{Extension, extract::Request, http::StatusCode, middleware::Next, response::Response};
use clerk_rs::validators::authorizer::ClerkJwt;

pub fn check_staff(claims: ClerkJwt) -> bool {
    let metadata = match claims.other.get("metadata") {
        Some(m) => m,
        None => return false,
    };

    if let Some(meta) = metadata.as_object() {
        let is_staff = meta
            .get("permissions")
            .and_then(|p| p.as_array())
            .and_then(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .find(|&p| p == "staff")
            })
            .is_some();

        return is_staff;
    }

    false
}

pub async fn require_admin(
    Extension(claims): Extension<ClerkJwt>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if check_staff(claims) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
