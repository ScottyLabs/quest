use axum::extract::{FromRequestParts, OptionalFromRequestParts, Request};
use axum::http::header::{AUTHORIZATION, COOKIE};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;
use tower_sessions::Session;

use super::AuthError;
use super::session::{COOKIE_NAME, SessionUser, USER_KEY};

#[derive(Clone, Debug)]
pub struct CurrentUser(pub SessionUser);

pub fn bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|id| !id.is_empty())
}

pub async fn bearer_id(mut request: Request, next: Next) -> Response {
    if let Some(header) = bearer(request.headers())
        .filter(|id| {
            id.chars()
                .all(|c| c.is_ascii_graphic() && c != ';' && c != ',')
        })
        .and_then(|id| HeaderValue::from_str(&format!("{COOKIE_NAME}={id}")).ok())
    {
        request.headers_mut().append(COOKIE, header);
    }

    next.run(request).await
}

async fn current(parts: &mut Parts) -> Result<SessionUser, AuthError> {
    let anonymous = AuthError::Unauthorized("unauthorized");

    let session = Session::from_request_parts(parts, &())
        .await
        .map_err(|_| anonymous)?;

    session
        .get::<SessionUser>(USER_KEY)
        .await
        .map_err(|_| AuthError::Upstream("session_store_unavailable"))?
        .ok_or(anonymous)
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        current(parts).await.map(Self)
    }
}

impl<S> OptionalFromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(current(parts).await.map(Self).ok())
    }
}
