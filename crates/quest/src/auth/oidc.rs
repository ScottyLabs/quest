use std::time::Duration;

use axum::extract::FromRequestParts;
use axum::http::Uri;
use axum::http::request::Parts;
use axum_oidc::openidconnect::core::CoreGenderClaim;
use axum_oidc::openidconnect::{self, ClientId, ClientSecret, CsrfToken, IssuerUrl, Scope};
use axum_oidc::{AdditionalClaims, OidcClaims, OidcClient, OidcSession, ProviderMetadata};
use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use super::{AuthError, ConfigError, env_opt, env_required};

#[derive(Clone, Debug)]
pub struct OidcConfig {
    pub keycloak_url: String,
    pub keycloak_realm: String,
    pub client_id: String,
    pub client_secret: String,
    pub app_url: String,
    pub oauth_relay_url: String,
}

impl OidcConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            keycloak_url: env_required("KEYCLOAK_URL")?,
            keycloak_realm: env_required("KEYCLOAK_REALM")?,
            client_id: env_required("OIDC_CLIENT_ID")?,
            client_secret: env_required("OIDC_CLIENT_SECRET")?,
            app_url: env_required("APP_URL")?.trim_end_matches('/').to_owned(),
            oauth_relay_url: env_required("OAUTH_RELAY_URL")?,
        })
    }

    pub fn issuer(&self) -> String {
        format!(
            "{}/realms/{}",
            self.keycloak_url.trim_end_matches('/'),
            self.keycloak_realm
        )
    }
}

pub const NATIVE_RETURN: &str = "org.scottylabs.quest://oauth";

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Class {
    #[default]
    Unset,
    One(String),
    Many(Vec<String>),
    Other(serde_json::Value),
}

pub const FIRST_YEAR: &str = "First-Year";

fn normalized(value: &str) -> String {
    value
        .chars()
        .filter(char::is_ascii_alphanumeric)
        .map(|letter| letter.to_ascii_lowercase())
        .collect()
}

impl Class {
    fn has(&self, want: &str) -> bool {
        let want = normalized(want);
        let same = |value: &String| normalized(value) == want;

        match self {
            Self::One(value) => same(value),
            Self::Many(values) => values.iter().any(same),
            Self::Unset | Self::Other(_) => false,
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GroupClaims {
    #[serde(default)]
    pub groups: Vec<String>,
    #[serde(default)]
    pub class: Class,
}

impl openidconnect::AdditionalClaims for GroupClaims {}
impl AdditionalClaims for GroupClaims {}

pub struct SessionWrapper(Session);

impl<S: Send + Sync> FromRequestParts<S> for SessionWrapper {
    type Rejection = <Session as FromRequestParts<S>>::Rejection;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        Ok(Self(Session::from_request_parts(parts, state).await?))
    }
}

impl<AC: AdditionalClaims> axum_oidc::Session<AC> for SessionWrapper {
    type Error = tower_sessions::session::Error;

    async fn get(&self) -> Result<OidcSession<AC, CoreGenderClaim>, Self::Error> {
        Ok(self.0.get("axum-oidc").await?.unwrap_or_default())
    }

    async fn set(&mut self, value: OidcSession<AC, CoreGenderClaim>) -> Result<(), Self::Error> {
        self.0.insert("axum-oidc", value).await?;
        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
struct RelayState {
    return_to: String,
    csrf: String,
}

fn relay_state(return_to: &str) -> CsrfToken {
    let mut csrf = [0u8; 16];
    rand::fill(&mut csrf[..]);

    let state = RelayState {
        return_to: return_to.to_owned(),
        csrf: hex::encode(csrf),
    };
    let json = serde_json::to_vec(&state).expect("two strings serialise");

    CsrfToken::new(URL_SAFE_NO_PAD.encode(json))
}

pub struct Oidc {
    pub client: OidcClient<GroupClaims>,
    pub end_session_url: Option<String>,
}

pub async fn discover(config: &OidcConfig) -> Result<Oidc, ConfigError> {
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| ConfigError(format!("failed to build the OIDC HTTP client: {e}")))?;

    let issuer = IssuerUrl::new(config.issuer())
        .map_err(|e| ConfigError(format!("KEYCLOAK_URL is not a valid issuer: {e}")))?;
    let relay = Uri::try_from(config.oauth_relay_url.clone())
        .map_err(|e| ConfigError(format!("OAUTH_RELAY_URL is not a valid URI: {e}")))?;

    let metadata = ProviderMetadata::discover_async(issuer, &http)
        .await
        .map_err(|e| ConfigError(format!("OIDC discovery failed: {e}")))?;
    let end_session_url = end_session_url(&metadata, config);

    let callback = format!("{}/auth/callback", config.app_url);

    let client = OidcClient::<GroupClaims>::builder()
        .with_http_client(http)
        .with_redirect_url(relay)
        .with_client_id(ClientId::new(config.client_id.clone()))
        .with_client_secret(ClientSecret::new(config.client_secret.clone()))
        .with_scopes(vec![
            Scope::new("openid".to_owned()),
            Scope::new("email".to_owned()),
            Scope::new("profile".to_owned()),
        ])
        .with_state_generator(move || relay_state(&callback))
        .manual(metadata)
        .map_err(|e| ConfigError(format!("OIDC client setup failed: {e}")))?
        .build();

    Ok(Oidc {
        client,
        end_session_url,
    })
}

const RETRY: Duration = Duration::from_secs(30);

pub async fn rediscovered(config: OidcConfig) {
    loop {
        tokio::time::sleep(RETRY + Duration::from_millis(rand::random_range(0..5_000))).await;

        if discover(&config).await.is_ok() {
            return;
        }
    }
}

fn end_session_url(metadata: &ProviderMetadata, config: &OidcConfig) -> Option<String> {
    let extra = serde_json::to_value(metadata.additional_metadata()).ok()?;
    let mut url = Url::parse(extra.get("end_session_endpoint")?.as_str()?).ok()?;

    url.query_pairs_mut()
        .append_pair("client_id", &config.client_id)
        .append_pair("post_logout_redirect_uri", &config.app_url);

    Some(url.into())
}

#[derive(Debug)]
pub struct IdClaims {
    pub email: Option<String>,
    pub name: Option<String>,
    pub preferred_username: Option<String>,
    pub groups: Vec<String>,
    pub class: Class,
}

impl From<&OidcClaims<GroupClaims>> for IdClaims {
    fn from(claims: &OidcClaims<GroupClaims>) -> Self {
        Self {
            email: claims.email().map(|email| email.as_str().to_owned()),
            name: claims
                .name()
                .and_then(|name| name.get(None))
                .map(|name| name.as_str().to_owned()),
            preferred_username: claims
                .preferred_username()
                .map(|user| user.as_str().to_owned()),
            groups: claims.additional_claims().groups.clone(),
            class: claims.additional_claims().class.clone(),
        }
    }
}

impl IdClaims {
    pub fn display_name(&self) -> String {
        self.name
            .clone()
            .or_else(|| self.preferred_username.clone())
            .or_else(|| self.email.clone())
            .unwrap_or_else(|| "Unknown User".to_owned())
    }

    pub fn andrew_id(&self) -> Option<String> {
        self.email
            .as_deref()
            .and_then(|email| email.split('@').next())
            .or(self.preferred_username.as_deref())
            .map(str::to_owned)
            .filter(|id| !id.is_empty())
    }

    pub fn first_year(&self) -> bool {
        self.class.has(FIRST_YEAR)
    }
}

pub fn validate_return(target: Option<&str>, app_url: &str) -> Result<String, AuthError> {
    let app_url = app_url.trim_end_matches('/');
    let Some(target) = target.map(str::trim).filter(|t| !t.is_empty()) else {
        return Ok(app_url.to_owned());
    };

    if target.contains('#') {
        return Err(AuthError::BadRequest("invalid_return"));
    }
    if target == NATIVE_RETURN {
        return Ok(target.to_owned());
    }

    let url = Url::parse(target).map_err(|_| AuthError::BadRequest("invalid_return"))?;
    let Some(host) = url.host_str() else {
        return Err(AuthError::BadRequest("invalid_return"));
    };

    let loopback = url.scheme() == "http" && (host == "localhost" || host == "127.0.0.1");
    let same_origin = Url::parse(app_url).is_ok_and(|app| {
        url.scheme() == app.scheme()
            && Some(host) == app.host_str()
            && url.port_or_known_default() == app.port_or_known_default()
    });

    (loopback || same_origin)
        .then(|| target.to_owned())
        .ok_or(AuthError::BadRequest("invalid_return"))
}

pub fn configured() -> bool {
    ["KEYCLOAK_URL", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"]
        .iter()
        .all(|name| env_opt(name).is_some())
}
