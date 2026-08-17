use axum::http::header::HeaderName;
use axum::http::{HeaderMap, Method, Uri};
use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use serde::Deserialize;

use super::key::{DeviceKey, decode_base64};

pub const PROOF_HEADER: HeaderName = HeaderName::from_static("x-device-proof");

const PROOF_ALG: &str = "ES256";

const PROOF_TYP: &str = "quest-proof+jwt";

pub const SKEW_SECS: i64 = 300;

pub const JTI_TTL_SECS: i64 = 2 * SKEW_SECS + 60;

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub pk: String,
    pub htm: String,
    pub htu: String,
    pub iat: i64,
    pub jti: String,
}

pub struct Verified {
    pub claims: Claims,
    pub key: DeviceKey,
}

pub fn parse(token: &str) -> Option<Verified> {
    let token = token.trim();
    let mut segments = token.split('.');
    let (header, payload, signature) = (segments.next()?, segments.next()?, segments.next()?);
    if segments.next().is_some() {
        return None;
    }

    #[derive(Deserialize)]
    struct Header {
        alg: String,
        typ: String,
    }

    let Header { alg, typ } = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(header).ok()?).ok()?;
    if alg != PROOF_ALG || typ != PROOF_TYP {
        return None;
    }

    let claims: Claims = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(payload).ok()?).ok()?;

    if claims.jti.len() != 32 || !claims.jti.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }

    let key = DeviceKey::parse(&claims.pk)?;
    let signed = &token.as_bytes()[..header.len() + 1 + payload.len()];

    key.verifies(signed, &decode_base64(signature)?)
        .then_some(Verified { claims, key })
}

pub fn now() -> i64 {
    tower_sessions::cookie::time::OffsetDateTime::now_utc().unix_timestamp()
}

pub fn request_url(uri: &Uri, headers: &HeaderMap) -> Option<String> {
    fn first(headers: &HeaderMap, name: &str) -> Option<String> {
        let value = headers.get(name)?.to_str().ok()?;
        let value = value.split(',').next()?.trim();
        (!value.is_empty()).then(|| value.to_ascii_lowercase())
    }

    let scheme = first(headers, "x-forwarded-proto")
        .or_else(|| uri.scheme_str().map(str::to_ascii_lowercase))
        .unwrap_or_else(|| "http".to_owned());

    let host = first(headers, "x-forwarded-host")
        .or_else(|| uri.authority().map(|a| a.as_str().to_ascii_lowercase()))
        .or_else(|| first(headers, "host"))?;

    let host = match (scheme.as_str(), host.rsplit_once(':')) {
        ("https", Some((name, "443"))) | ("http", Some((name, "80"))) => name,
        _ => host.as_str(),
    };

    Some(format!("{scheme}://{host}{}", uri.path()))
}

impl Claims {
    pub fn covers(&self, method: &Method, url: &str, now: i64) -> bool {
        self.htm == method.as_str() && self.htu == url && (now - self.iat).abs() <= SKEW_SECS
    }
}
