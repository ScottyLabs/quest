use std::time::Duration;

use entity::asset::Model;
use hmac::{Hmac, KeyInit, Mac};
use sea_orm::{
    ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
};
use sha2::{Digest, Sha256};

use crate::auth::{ConfigError, env_opt, env_required};

pub const MAX_BYTES: usize = 8 * 1024 * 1024;

const REGION: &str = "us-east-1";
const SERVICE: &str = "s3";
const ALGORITHM: &str = "AWS4-HMAC-SHA256";

const KINDS: &[&str] = &["uploads", "items", "challenges", "mascots"];

const TYPES: &[(&str, &str)] = &[
    ("image/png", "png"),
    ("image/jpeg", "jpg"),
    ("image/webp", "webp"),
    ("image/gif", "gif"),
    ("image/svg+xml", "svg"),
    ("image/avif", "avif"),
    ("application/pdf", "pdf"),
    ("text/plain", "txt"),
    ("text/csv", "csv"),
    ("application/json", "json"),
    ("font/woff2", "woff2"),
    ("video/mp4", "mp4"),
];

pub const KIND_LIST: &[&str] = KINDS;

pub fn allowed_types() -> impl Iterator<Item = &'static str> {
    TYPES.iter().map(|(mime, _)| *mime)
}

pub fn extension_for(content_type: &str) -> Option<&'static str> {
    let wanted = content_type
        .split(';')
        .next()
        .unwrap_or(content_type)
        .trim()
        .to_ascii_lowercase();

    TYPES
        .iter()
        .find(|(mime, _)| *mime == wanted)
        .map(|(_, extension)| *extension)
}

pub fn known_kind(kind: &str) -> bool {
    KINDS.contains(&kind)
}

#[derive(Clone)]
pub struct Assets {
    db: DatabaseConnection,
    http: reqwest::Client,
    endpoint: String,
    bucket: String,
    public: String,
    key_id: String,
    secret: String,
}

#[derive(Debug)]
pub struct Stored {
    pub key: String,
    pub url: String,
}

#[derive(Debug)]
pub enum AssetError {
    Unconfigured,
    Rejected(&'static str),
    Upstream(String),
}

impl Assets {
    pub fn from_env(db: DatabaseConnection) -> Result<Self, ConfigError> {
        let missing = ["CDN_S3_ENDPOINT", "CDN_S3_BUCKET", "CDN_PUBLIC_URL"]
            .into_iter()
            .chain(["CDN_ACCESS_KEY_ID", "CDN_SECRET_ACCESS_KEY"])
            .find(|name| env_opt(name).is_none());

        if let Some(name) = missing {
            return Err(ConfigError(format!("{name} must be set")));
        }

        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|err| ConfigError(format!("failed to build the CDN HTTP client: {err}")))?;

        Ok(Self {
            db,
            http,
            endpoint: env_required("CDN_S3_ENDPOINT")?
                .trim_end_matches('/')
                .to_owned(),
            bucket: env_required("CDN_S3_BUCKET")?,
            public: env_required("CDN_PUBLIC_URL")?,
            key_id: env_required("CDN_ACCESS_KEY_ID")?,
            secret: env_required("CDN_SECRET_ACCESS_KEY")?,
        })
    }

    pub fn unconfigured(db: DatabaseConnection) -> Self {
        Self {
            db,
            http: reqwest::Client::new(),
            endpoint: String::new(),
            bucket: String::new(),
            public: String::new(),
            key_id: String::new(),
            secret: String::new(),
        }
    }

    pub fn configured(&self) -> bool {
        !self.bucket.is_empty()
    }

    pub fn url_for(&self, key: &str) -> String {
        format!("{}{key}", self.public)
    }

    async fn signed(
        &self,
        method: reqwest::Method,
        key: &str,
        mime: Option<&str>,
        body: Vec<u8>,
    ) -> Result<(), AssetError> {
        let url = format!("{}/{}/{key}", self.endpoint, self.bucket);
        let host = reqwest::Url::parse(&url)
            .ok()
            .and_then(|parsed| {
                let host = parsed.host_str()?.to_owned();
                Some(match parsed.port() {
                    Some(port) => format!("{host}:{port}"),
                    None => host,
                })
            })
            .ok_or(AssetError::Rejected("cdn_endpoint_invalid"))?;

        let payload = hex::encode(Sha256::digest(&body));
        let now = chrono::Utc::now();
        let stamp = now.format("%Y%m%dT%H%M%SZ").to_string();
        let day = now.format("%Y%m%d").to_string();

        let (signed, typed) = match mime {
            Some(mime) => (
                "content-type;host;x-amz-content-sha256;x-amz-date",
                format!("content-type:{mime}\n"),
            ),
            None => ("host;x-amz-content-sha256;x-amz-date", String::new()),
        };

        let canonical = format!(
            "{method}\n/{bucket}/{key}\n\n{typed}host:{host}\n\
             x-amz-content-sha256:{payload}\nx-amz-date:{stamp}\n\n{signed}\n{payload}",
            bucket = self.bucket,
        );

        let scope = format!("{day}/{REGION}/{SERVICE}/aws4_request");
        let to_sign = format!(
            "{ALGORITHM}\n{stamp}\n{scope}\n{}",
            hex::encode(Sha256::digest(canonical.as_bytes()))
        );

        let mut signing = sign(format!("AWS4{}", self.secret).as_bytes(), day.as_bytes());
        signing = sign(&signing, REGION.as_bytes());
        signing = sign(&signing, SERVICE.as_bytes());
        signing = sign(&signing, b"aws4_request");

        let signature = hex::encode(sign(&signing, to_sign.as_bytes()));
        let authorization = format!(
            "{ALGORITHM} Credential={}/{scope}, SignedHeaders={signed}, Signature={signature}",
            self.key_id,
        );

        let mut request = self
            .http
            .request(method, &url)
            .header("x-amz-content-sha256", &payload)
            .header("x-amz-date", &stamp)
            .header(reqwest::header::AUTHORIZATION, authorization);

        if let Some(mime) = mime {
            request = request.header(reqwest::header::CONTENT_TYPE, mime);
        }

        let response = request
            .body(body)
            .send()
            .await
            .map_err(|err| AssetError::Upstream(format!("CDN unreachable: {err}")))?;

        if !response.status().is_success() && response.status() != reqwest::StatusCode::NOT_FOUND {
            let status = response.status();
            let detail = response.text().await.unwrap_or_default();

            return Err(AssetError::Upstream(format!(
                "CDN refused the request ({status}): {}",
                detail.trim()
            )));
        }

        Ok(())
    }

    pub async fn put(
        &self,
        kind: &str,
        content_type: &str,
        filename: Option<&str>,
        by: &str,
        body: Vec<u8>,
    ) -> Result<Stored, AssetError> {
        if !known_kind(kind) {
            return Err(AssetError::Rejected("asset_kind_unknown"));
        }
        if body.is_empty() {
            return Err(AssetError::Rejected("asset_empty"));
        }
        if body.len() > MAX_BYTES {
            return Err(AssetError::Rejected("asset_too_large"));
        }

        let Some(extension) = extension_for(content_type) else {
            return Err(AssetError::Rejected("asset_type_unsupported"));
        };

        if !self.configured() {
            return Err(AssetError::Unconfigured);
        }

        let key = format!("{kind}/{}.{extension}", uuid::Uuid::new_v4());
        let mime = TYPES
            .iter()
            .find(|(_, ext)| *ext == extension)
            .map_or(content_type, |(mime, _)| *mime);
        let bytes = body.len() as i64;

        self.signed(reqwest::Method::PUT, &key, Some(mime), body)
            .await?;

        let stored = Stored {
            url: self.url_for(&key),
            key,
        };

        let record = entity::asset::ActiveModel {
            key: ActiveValue::Set(stored.key.clone()),
            url: ActiveValue::Set(stored.url.clone()),
            kind: ActiveValue::Set(kind.to_owned()),
            content_type: ActiveValue::Set(mime.to_owned()),
            bytes: ActiveValue::Set(bytes),
            filename: ActiveValue::Set(filename.map(str::to_owned)),
            uploaded_by: ActiveValue::Set(by.to_owned()),
            ..Default::default()
        };

        if let Err(err) = entity::asset::Entity::insert(record)
            .exec_without_returning(&self.db)
            .await
        {
            eprintln!(
                "assets: uploaded {} but could not record it: {err}",
                stored.key
            );
        }

        Ok(stored)
    }

    pub async fn listing(&self, kind: Option<&str>, limit: u64) -> Result<Vec<Model>, AssetError> {
        let mut query = entity::asset::Entity::find();

        if let Some(kind) = kind.filter(|k| !k.is_empty()) {
            if !known_kind(kind) {
                return Err(AssetError::Rejected("asset_kind_unknown"));
            }
            query = query.filter(entity::asset::Column::Kind.eq(kind));
        }

        query
            .order_by_desc(entity::asset::Column::CreatedAt)
            .limit(limit.clamp(1, 500))
            .all(&self.db)
            .await
            .map_err(|err| AssetError::Upstream(format!("could not list assets: {err}")))
    }

    pub async fn remove(&self, key: &str) -> Result<(), AssetError> {
        if !self.configured() {
            return Err(AssetError::Unconfigured);
        }

        let known = entity::asset::Entity::find_by_id(key)
            .one(&self.db)
            .await
            .map_err(|err| AssetError::Upstream(format!("could not read the asset: {err}")))?
            .ok_or(AssetError::Rejected("asset_unknown"))?;

        self.signed(reqwest::Method::DELETE, &known.key, None, Vec::new())
            .await?;

        entity::asset::Entity::delete_by_id(&known.key)
            .exec(&self.db)
            .await
            .map_err(|err| AssetError::Upstream(format!("could not forget the asset: {err}")))?;

        Ok(())
    }
}

fn sign(key: &[u8], message: &[u8]) -> Vec<u8> {
    let mut mac = <Hmac<Sha256> as KeyInit>::new_from_slice(key).expect("hmac takes any key");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}
