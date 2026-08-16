use axum::extract::{FromRequestParts, OptionalFromRequestParts, Request};
use axum::http::header::{AUTHORIZATION, COOKIE};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;
use tower_sessions::Session;

use super::AuthError;
use super::session::{COOKIE_NAME, DEVICE_KEY, SessionUser, USER_KEY};

#[derive(Clone, Debug)]
pub struct CurrentUser(pub SessionUser);

#[derive(Clone, Debug)]
pub struct CurrentDevice(pub String);

#[derive(Clone, Debug)]
pub struct SignedIn(pub SessionUser);

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

async fn session_of(parts: &mut Parts) -> Result<Session, AuthError> {
    Session::from_request_parts(parts, &())
        .await
        .map_err(|_| AuthError::Unauthorized("unauthorized"))
}

async fn signed_in(parts: &mut Parts) -> Result<SessionUser, AuthError> {
    session_of(parts)
        .await?
        .get::<SessionUser>(USER_KEY)
        .await
        .map_err(|_| AuthError::Upstream("session_store_unavailable"))?
        .ok_or(AuthError::Unauthorized("unauthorized"))
}

impl<S> FromRequestParts<S> for SignedIn
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        signed_in(parts).await.map(Self)
    }
}

pub async fn session_binding(
    parts: &mut Parts,
) -> Result<Option<(SessionUser, String)>, AuthError> {
    let session = session_of(parts).await?;
    let unavailable = || AuthError::Upstream("session_store_unavailable");

    let user = session
        .get::<SessionUser>(USER_KEY)
        .await
        .map_err(|_| unavailable())?;
    let device = session
        .get::<String>(DEVICE_KEY)
        .await
        .map_err(|_| unavailable())?;

    Ok(user.zip(device))
}

pub async fn binding_error(parts: &mut Parts) -> AuthError {
    let Ok(session) = session_of(parts).await else {
        return AuthError::Unauthorized("unauthorized");
    };

    match session.get::<SessionUser>(USER_KEY).await {
        Ok(Some(_)) => AuthError::Unauthorized("device_required"),
        _ => AuthError::Unauthorized("unauthorized"),
    }
}

async fn current(parts: &mut Parts) -> Result<(SessionUser, String), AuthError> {
    match session_binding(parts).await? {
        Some(bound) => Ok(bound),
        None => Err(binding_error(parts).await),
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        current(parts).await.map(|(user, _)| Self(user))
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
        Ok(current(parts).await.map(|(user, _)| Self(user)).ok())
    }
}

impl<S> FromRequestParts<S> for CurrentDevice
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        current(parts).await.map(|(_, device)| Self(device))
    }
}
