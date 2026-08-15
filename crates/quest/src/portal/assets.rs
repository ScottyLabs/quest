use std::time::Duration;

use hmac::{Hmac, KeyInit, Mac};
use sha2::{Digest, Sha256};

use crate::auth::{ConfigError, env_opt, env_required};

pub const MAX_BYTES: usize = 8 * 1024 * 1024;

const REGION: &str = "us-east-1";
const SERVICE: &str = "s3";
const ALGORITHM: &str = "AWS4-HMAC-SHA256";

const KINDS: &[&str] = &["items", "challenges", "mascots"];

const TYPES: &[(&str, &str)] = &[
    ("image/png", "png"),
    ("image/jpeg", "jpg"),
    ("image/webp", "webp"),
    ("image/gif", "gif"),
    ("image/svg+xml", "svg"),
];

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
    pub fn from_env() -> Result<Self, ConfigError> {
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

    pub fn unconfigured() -> Self {
        Self {
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

    pub async fn put(
        &self,
        kind: &str,
        content_type: &str,
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

        let now = chrono::Utc::now();
        let stamp = now.format("%Y%m%dT%H%M%SZ").to_string();
        let day = now.format("%Y%m%d").to_string();

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
        let signed = "content-type;host;x-amz-content-sha256;x-amz-date";

        let canonical = format!(
            "PUT\n/{bucket}/{key}\n\ncontent-type:{mime}\nhost:{host}\n\
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

        let response = self
            .http
            .put(&url)
            .header(reqwest::header::CONTENT_TYPE, mime)
            .header("x-amz-content-sha256", &payload)
            .header("x-amz-date", &stamp)
            .header(reqwest::header::AUTHORIZATION, authorization)
            .body(body)
            .send()
            .await
            .map_err(|err| AssetError::Upstream(format!("CDN unreachable: {err}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let detail = response.text().await.unwrap_or_default();

            return Err(AssetError::Upstream(format!(
                "CDN refused the upload ({status}): {}",
                detail.trim()
            )));
        }

        Ok(Stored {
            url: self.url_for(&key),
            key,
        })
    }
}

fn sign(key: &[u8], message: &[u8]) -> Vec<u8> {
    let mut mac = <Hmac<Sha256> as KeyInit>::new_from_slice(key).expect("hmac takes any key");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_types_map_to_extensions() {
        assert_eq!(extension_for("image/png"), Some("png"));
        assert_eq!(extension_for("IMAGE/PNG"), Some("png"));
        assert_eq!(extension_for("image/jpeg; charset=binary"), Some("jpg"));
        assert_eq!(extension_for("image/svg+xml"), Some("svg"));
        assert_eq!(extension_for("application/pdf"), None);
        assert_eq!(extension_for(""), None);
    }

    #[test]
    fn only_known_kinds_are_accepted() {
        assert!(known_kind("items"));
        assert!(known_kind("challenges"));
        assert!(!known_kind("../../etc"));
        assert!(!known_kind(""));
    }

    #[test]
    fn public_urls_join_without_a_double_slash() {
        let assets = Assets {
            http: reqwest::Client::new(),
            endpoint: "https://s3.scottylabs.org".to_owned(),
            bucket: "cdn-quest".to_owned(),
            public: "https://cdn.scottylabs.org/quest/".to_owned(),
            key_id: "id".to_owned(),
            secret: "secret".to_owned(),
        };

        assert_eq!(
            assets.url_for("items/abc.png"),
            "https://cdn.scottylabs.org/quest/items/abc.png"
        );
    }

    #[test]
    fn an_unconfigured_uploader_refuses_instead_of_panicking() {
        let assets = Assets::unconfigured();

        assert!(!assets.configured());
    }

    #[test]
    fn the_signing_key_matches_the_aws_published_vector() {
        let mut key = sign(b"AWS4wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", b"20150830");
        key = sign(&key, b"us-east-1");
        key = sign(&key, b"iam");
        key = sign(&key, b"aws4_request");

        assert_eq!(
            hex::encode(key),
            "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9"
        );
    }

    #[test]
    fn the_signature_matches_the_aws_published_vector() {
        let mut key = sign(b"AWS4wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", b"20150830");
        key = sign(&key, b"us-east-1");
        key = sign(&key, b"iam");
        key = sign(&key, b"aws4_request");

        let to_sign = "AWS4-HMAC-SHA256\n20150830T123600Z\n\
             20150830/us-east-1/iam/aws4_request\n\
             f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59";

        assert_eq!(
            hex::encode(sign(&key, to_sign.as_bytes())),
            "5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7"
        );
    }
}
