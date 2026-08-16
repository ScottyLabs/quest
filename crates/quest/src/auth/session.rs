use fred::prelude::{ClientLike, Config as ValkeyConfig, KeysInterface, Pool};
use fred::types::Expiration;
use serde::{Deserialize, Serialize};
use tower_sessions::cookie::SameSite;
use tower_sessions::cookie::time::Duration;
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_redis_store::RedisStore;

use super::{AuthError, ConfigError, env_required};

pub const COOKIE_NAME: &str = "id";

pub const USER_KEY: &str = "quest.user";

pub const DEVICE_KEY: &str = "quest.device";

pub const SESSION_TTL: Duration = Duration::days(90);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SessionUser {
    pub email: Option<String>,
    pub name: String,
    pub andrew_id: String,
    #[serde(default)]
    pub groups: Vec<String>,
    pub admin: bool,
    #[serde(default)]
    pub first_year: bool,
}

impl SessionUser {
    /// Whether this user may work the NFC card desk in the mobile app. Resolved
    /// through `crate::access`, which owns every group-to-right mapping.
    pub fn staff(&self) -> bool {
        crate::access::allows(self, crate::access::Capability::CardDesk)
    }
}

pub struct Sessions {
    pool: Pool,
    secure_cookies: bool,
}

fn active_key(andrew_id: &str, device: &str) -> String {
    format!("quest:user:session:{andrew_id}:{device}")
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

    pub fn pool(&self) -> Pool {
        self.pool.clone()
    }

    pub async fn bind(&self, andrew_id: &str, device: &str, id: &str) -> Result<(), AuthError> {
        let evicted: Option<String> = self
            .pool
            .set(
                active_key(andrew_id, device),
                id,
                Some(Expiration::EX(SESSION_TTL.whole_seconds())),
                None,
                true,
            )
            .await
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

        match evicted {
            Some(stale) if stale != id => self.del(&stale).await,
            _ => Ok(()),
        }
    }

    pub async fn release(&self, andrew_id: &str, device: &str) -> Result<(), AuthError> {
        self.del(&active_key(andrew_id, device)).await
    }

    async fn del(&self, key: &str) -> Result<(), AuthError> {
        self.pool
            .del::<(), _>(key)
            .await
            .map_err(|_| AuthError::Upstream("session_store_unavailable"))
    }
}
