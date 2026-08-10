pub mod extract;
pub mod oidc;
pub mod routes;
pub mod session;

use std::sync::Arc;

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

use oidc::{Oidc, OidcConfig};
use session::Sessions;

pub struct Auth {
    pub oidc: Option<Oidc>,
    pub sessions: Sessions,
    pub project_admin_group: Option<String>,
    config: OidcConfig,
}

impl Auth {
    pub async fn from_env() -> Result<Arc<Self>, ConfigError> {
        let config = OidcConfig::from_env()?;
        let sessions = Sessions::connect(&config.app_url).await?;

        let oidc = oidc::discover(&config)
            .await
            .inspect_err(|err| eprintln!("{err}; /auth/login answers 502 until discovery lands"))
            .ok();

        Ok(Arc::new(Self {
            project_admin_group: env_opt("PROJECT_ADMIN_GROUP"),
            oidc,
            sessions,
            config,
        }))
    }

    pub fn app_url(&self) -> &str {
        &self.config.app_url
    }

    pub fn undiscovered(&self) -> Option<OidcConfig> {
        self.oidc.is_none().then(|| self.config.clone())
    }

    pub fn is_admin(&self, groups: &[String]) -> bool {
        self.project_admin_group
            .as_deref()
            .is_some_and(|admin| groups.iter().any(|g| g == admin))
    }
}

#[derive(Debug)]
pub struct ConfigError(pub String);

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for ConfigError {}

pub fn env_required(name: &'static str) -> Result<String, ConfigError> {
    env_opt(name).ok_or_else(|| ConfigError(format!("{name} must be set")))
}

pub fn env_opt(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|v| v.trim().to_owned())
        .filter(|v| !v.is_empty())
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct AuthErrBody {
    pub error: &'static str,
}

#[derive(Debug, Clone, Copy)]
pub enum AuthError {
    NotConfigured,
    BadRequest(&'static str),
    Unauthorized(&'static str),
    NotFound(&'static str),
    Conflict(&'static str),
    Upstream(&'static str),
}

impl AuthError {
    fn parts(&self) -> (StatusCode, &'static str) {
        match self {
            AuthError::NotConfigured => (StatusCode::SERVICE_UNAVAILABLE, "auth_not_configured"),
            AuthError::BadRequest(e) => (StatusCode::BAD_REQUEST, *e),
            AuthError::Unauthorized(e) => (StatusCode::UNAUTHORIZED, *e),
            AuthError::NotFound(e) => (StatusCode::NOT_FOUND, *e),
            AuthError::Conflict(e) => (StatusCode::CONFLICT, *e),
            AuthError::Upstream(e) => (StatusCode::BAD_GATEWAY, *e),
        }
    }

    pub fn code(&self) -> &'static str {
        self.parts().1
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error) = self.parts();
        (status, Json(AuthErrBody { error })).into_response()
    }
}
