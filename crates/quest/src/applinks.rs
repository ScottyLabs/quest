use axum::Router;
use axum::http::{HeaderValue, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use serde_json::json;

const APPLE_APP_IDS: [&str; 1] = ["C6LJ3FB5B3.quest.cmu.app"];

const ANDROID_PACKAGE: &str = "quest.cmu.twa";

const ANDROID_CERT_SHA256: [&str; 3] = [
    "E7:FF:D7:F1:E0:FD:E6:B3:C2:92:81:63:F3:43:B2:FF:E7:E1:B7:20:CB:25:1F:45:70:DD:C4:0C:D1:BA:36:AE",
    "16:18:DE:16:12:F5:92:8C:7F:83:3B:39:15:60:93:3E:BE:64:EC:43:63:EB:06:EB:77:94:11:78:23:CB:FD:46",
    "2B:7F:05:EA:AD:C0:CB:A3:A3:6F:F2:E1:E9:A4:BF:DA:3C:9A:CE:53:18:5C:AD:23:F5:02:2E:0C:01:FE:55:2F",
];

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

async fn android() -> Response {
    json_response(
        json!([{
            "relation": [
                "delegate_permission/common.handle_all_urls",
                "delegate_permission/common.get_login_creds"
            ],
            "target": {
                "namespace": "android_app",
                "package_name": ANDROID_PACKAGE,
                "sha256_cert_fingerprints": ANDROID_CERT_SHA256
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
