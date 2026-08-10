use axum::http::{HeaderName, HeaderValue, Method};
use tower_http::cors::{AllowOrigin, CorsLayer};

pub fn layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin: &HeaderValue, _parts| {
            origin_allowed(origin)
        }))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(crate::auth::routes::ALLOWED_HEADERS)
        .expose_headers([
            HeaderName::from_static("x-pass-serial"),
            HeaderName::from_static("x-pass-issued"),
            HeaderName::from_static("x-pass-token"),
            HeaderName::from_static("x-pass-sha256"),
        ])
        .allow_credentials(true)
}

fn origin_allowed(origin: &HeaderValue) -> bool {
    let Ok(origin) = origin.to_str() else {
        return false;
    };

    let Some((scheme, rest)) = origin.split_once("://") else {
        return false;
    };

    let host = rest.split('/').next().unwrap_or(rest);
    let host = host.split(':').next().unwrap_or(host);

    match scheme {
        "capacitor" | "ionic" => host == "localhost",
        "http" | "https" => {
            host == "localhost"
                || host == "127.0.0.1"
                || host == "cmu.quest"
                || host.ends_with(".cmu.quest")
                || host == "scottylabs.org"
                || host.ends_with(".scottylabs.org")
                || host == "scottylabs.net"
                || host.ends_with(".scottylabs.net")
        }
        _ => false,
    }
}
