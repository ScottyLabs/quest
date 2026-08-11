use axum::Router;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use serde::{Deserialize, Serialize};

use super::Updates;

pub fn router(updates: Updates) -> Router {
    Router::new()
        .route("/api/app/updates", post(check))
        .route("/api/app/bundle/{file}", get(bundle))
        .with_state(updates)
}

#[derive(Deserialize)]
struct Report {
    #[serde(default)]
    platform: String,
    #[serde(default)]
    version_name: String,
}

#[derive(Serialize)]
struct Available {
    version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kind: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<&'static str>,
}

fn holding(version: String, message: &'static str) -> Response {
    axum::Json(Available {
        version,
        url: None,
        checksum: None,
        kind: Some("up_to_date"),
        message: Some(message),
    })
    .into_response()
}

async fn check(
    State(updates): State<Updates>,
    headers: HeaderMap,
    body: Result<axum::Json<Report>, JsonRejection>,
) -> Response {
    let Ok(axum::Json(report)) = body else {
        return holding(String::new(), "unreadable_device_report");
    };

    let Some(live) = updates.live() else {
        return holding(report.version_name, "updates_not_configured");
    };

    if report.platform == "web" {
        return holding(report.version_name, "web_serves_itself");
    }

    if report.version_name == live.version {
        return holding(report.version_name, "no_new_version_available");
    }

    let Some(base) = origin(&headers) else {
        return holding(report.version_name, "origin_unknown");
    };

    axum::Json(Available {
        url: Some(format!("{base}/api/app/bundle/{}.zip", live.version)),
        version: live.version.clone(),
        checksum: Some(live.checksum.clone()),
        kind: None,
        message: None,
    })
    .into_response()
}

async fn bundle(
    State(updates): State<Updates>,
    Path(file): Path<String>,
    headers: HeaderMap,
) -> Response {
    let Some(version) = file.strip_suffix(".zip") else {
        return StatusCode::NOT_FOUND.into_response();
    };

    let Some(live) = updates.live().filter(|live| live.version == version) else {
        return StatusCode::NOT_FOUND.into_response();
    };

    let total = live.zip.len() as u64;
    let mut out = Response::builder()
        .header(header::CONTENT_TYPE, "application/zip")
        .header(header::ACCEPT_RANGES, "bytes");

    let Some(wanted) = headers.get(header::RANGE).and_then(|r| r.to_str().ok()) else {
        return out
            .header(header::CONTENT_LENGTH, total)
            .body(live.zip.clone().into())
            .unwrap();
    };

    let Some((from, to)) = span(wanted, total) else {
        return out
            .status(StatusCode::RANGE_NOT_SATISFIABLE)
            .header(header::CONTENT_RANGE, format!("bytes */{total}"))
            .body(axum::body::Body::empty())
            .unwrap();
    };

    let slice = live.zip[from as usize..=to as usize].to_vec();
    out = out
        .status(StatusCode::PARTIAL_CONTENT)
        .header(header::CONTENT_LENGTH, slice.len() as u64);

    if let Ok(range) = HeaderValue::from_str(&format!("bytes {from}-{to}/{total}")) {
        out = out.header(header::CONTENT_RANGE, range);
    }

    out.body(slice.into()).unwrap()
}

fn origin(headers: &HeaderMap) -> Option<String> {
    let host = headers.get(header::HOST)?.to_str().ok()?;
    if host.is_empty() {
        return None;
    }

    let forwarded = headers
        .get("x-forwarded-proto")
        .and_then(|proto| proto.to_str().ok())
        .and_then(|proto| proto.split(',').next())
        .map(str::trim)
        .filter(|proto| !proto.is_empty());

    let scheme = match forwarded {
        Some(scheme) => scheme,
        None if local(host) => "http",
        None => "https",
    };

    Some(format!("{scheme}://{host}"))
}

fn local(host: &str) -> bool {
    let name = host.split(':').next().unwrap_or(host);

    name == "localhost"
        || name.starts_with("127.")
        || name.starts_with("10.")
        || name.starts_with("192.168.")
        || name == "[::1]"
}

fn span(header: &str, total: u64) -> Option<(u64, u64)> {
    let spec = header.strip_prefix("bytes=")?;
    if spec.contains(',') || total == 0 {
        return None;
    }

    let (start, end) = spec.split_once('-')?;
    let last = total - 1;

    let (from, to) = match (start.trim(), end.trim()) {
        ("", "") => return None,
        ("", n) => (total.checked_sub(n.parse::<u64>().ok()?)?, last),
        (n, "") => (n.parse().ok()?, last),
        (n, m) => (n.parse().ok()?, m.parse::<u64>().ok()?.min(last)),
    };

    (from <= to && from <= last).then_some((from, to))
}
