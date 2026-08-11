use axum::Router;
use axum::http::{HeaderValue, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use serde_json::json;

const APPLE_APP_IDS: [&str; 1] = ["C6LJ3FB5B3.quest.cmu.app"];

const ANDROID_PACKAGE: &str = "quest.cmu.twa";

//TODO: Use scottylabs cert for prod builds
const DEBUG_CERT_SHA256: &str = "E7:FF:D7:F1:E0:FD:E6:B3:C2:92:81:63:F3:43:B2:FF:E7:E1:B7:20:CB:25:1F:45:70:DD:C4:0C:D1:BA:36:AE";

const CERT_ENV: &str = "QUEST_ANDROID_CERT_SHA256";

fn json_response(body: String) -> Response {
    (
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        )],
        body,
    )
        .into_response()
}

async fn apple() -> Response {
    // claiming "/" would swallow the OAuth callback too
    json_response(
        json!({
            "applinks": {
                "details": [{
                    "appIDs": APPLE_APP_IDS,
                    "components": [{ "/": "/tap*", "comment": "NFC tag handoff" }]
                }]
            }
        })
        .to_string(),
    )
}

fn android_certs() -> Vec<String> {
    let mut certs = vec![DEBUG_CERT_SHA256.to_owned()];

    if let Ok(extra) = std::env::var(CERT_ENV) {
        certs.extend(
            extra
                .split(',')
                .map(str::trim)
                .filter(|cert| !cert.is_empty())
                .map(str::to_owned),
        );
    }

    certs
}

async fn android() -> Response {
    json_response(
        json!([{
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": ANDROID_PACKAGE,
                "sha256_cert_fingerprints": android_certs()
            }
        }])
        .to_string(),
    )
}

pub fn router() -> Router {
    Router::new()
        .route("/.well-known/apple-app-site-association", get(apple))
        .route("/.well-known/assetlinks.json", get(android))
}
