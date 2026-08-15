use axum::Router;
use axum::http::{HeaderValue, header};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;

const IMMUTABLE: &str = "public, max-age=31536000, immutable";

pub fn router() -> Router {
    Router::new()
        .route("/", get(home))
        .route("/assets/icon.svg", get(icon))
        .route("/assets/open-sans.woff2", get(font))
}

async fn home() -> Response {
    (
        [(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=3600"),
        )],
        Html(include_str!("landing.html")),
    )
        .into_response()
}

async fn icon() -> Response {
    (
        [
            (
                header::CONTENT_TYPE,
                HeaderValue::from_static("image/svg+xml"),
            ),
            (header::CACHE_CONTROL, HeaderValue::from_static(IMMUTABLE)),
        ],
        include_str!("icon.svg"),
    )
        .into_response()
}

async fn font() -> Response {
    (
        [
            (header::CONTENT_TYPE, HeaderValue::from_static("font/woff2")),
            (header::CACHE_CONTROL, HeaderValue::from_static(IMMUTABLE)),
        ],
        include_bytes!("open-sans.woff2").as_slice(),
    )
        .into_response()
}
