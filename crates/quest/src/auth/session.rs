use fred::prelude::{ClientLike, Config as ValkeyConfig, Pool};
use serde::{Deserialize, Serialize};
use tower_sessions::cookie::SameSite;
use tower_sessions::cookie::time::Duration;
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_redis_store::RedisStore;

use super::{ConfigError, env_required};

pub const COOKIE_NAME: &str = "id";

pub const USER_KEY: &str = "quest.user";

pub const SESSION_TTL: Duration = Duration::days(90);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SessionUser {
    pub sub: String,
    pub email: Option<String>,
    pub name: String,
    pub andrew_id: String,
    #[serde(default)]
    pub groups: Vec<String>,
    pub admin: bool,
}

pub struct Sessions {
    pool: Pool,
    secure_cookies: bool,
}

impl Sessions {
    pub async fn connect(app_url: &str) -> Result<Self, ConfigError> {
        let url = env_required("VALKEY_URL")?;
        let config = ValkeyConfig::from_url(&url)
            .map_err(|e| ConfigError(format!("VALKEY_URL is not a valid Valkey URL: {e}")))?;

        let pool = Pool::new(config, None, None, None, 6)
            .map_err(|e| ConfigError(format!("failed to build the Valkey pool: {e}")))?;
        pool.connect();
        pool.wait_for_connect()
            .await
            .map_err(|e| ConfigError(format!("failed to connect to Valkey at {url}: {e}")))?;

        Ok(Self {
            pool,
            secure_cookies: app_url.starts_with("https://"),
        })
    }

    pub fn layer(&self) -> SessionManagerLayer<RedisStore<Pool>> {
        SessionManagerLayer::new(RedisStore::new(self.pool.clone()))
            .with_name(COOKIE_NAME)
            .with_secure(self.secure_cookies)
            .with_same_site(SameSite::Lax)
            .with_expiry(Expiry::OnInactivity(SESSION_TTL))
            .with_always_save(true)
    }
}
