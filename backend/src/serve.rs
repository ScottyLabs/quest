use axum::{http::HeaderMap, response::Json};
use serde_json::json;

pub async fn assetlinks() -> (HeaderMap, Json<serde_json::Value>) {
    let mut headers = HeaderMap::new();
    headers.insert("content-type", "application/json".parse().unwrap());

    let assetlinks = json!([
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "org.scottylabs.quest",
                "sha256_cert_fingerprints": [
                    "70:EE:8B:D5:81:A2:26:D8:94:A7:80:F0:97:60:B2:DE:58:C9:66:0A:58:CC:E1:29:C0:A7:82:68:5C:F2:D5:10"
                ]
            }
        }
    ]);

    (headers, Json(assetlinks))
}

pub async fn apple_app_site_association() -> (HeaderMap, Json<serde_json::Value>) {
    let mut headers = HeaderMap::new();
    headers.insert("content-type", "application/json".parse().unwrap());

    let association = json!({
        "applinks": {
            "details": [
                {
                    "appIDs": ["4Y39FMA838.org.scottylabs.quest"],
                    "components": [
                        {
                            "/": "/login/*",
                            "comment": "Matches OAuth callback URLs"
                        }
                    ]
                }
            ]
        }
    });

    (headers, Json(association))
}
