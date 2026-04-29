mod crypto;

use std::sync::Arc;

use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use crypto::{verify_tap, VerifyError};

#[derive(Clone)]
struct AppState {
    master: Arc<[u8; 32]>,
}

#[derive(Deserialize)]
struct TapParams {
    e: String,
    c: String,
}

#[derive(Serialize)]
struct TapOk {
    uid: String,
    counter: u32,
}

#[derive(Serialize)]
struct ErrBody {
    error: &'static str,
}

enum TapError {
    BadRequest,
    Unauthorized,
}

impl IntoResponse for TapError {
    fn into_response(self) -> Response {
        match self {
            TapError::BadRequest => StatusCode::BAD_REQUEST.into_response(),
            TapError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                Json(ErrBody { error: "invalid signature" }),
            )
                .into_response(),
        }
    }
}

async fn tap(
    State(state): State<AppState>,
    Query(params): Query<TapParams>,
) -> Result<Json<TapOk>, TapError> {
    let e = hex::decode(&params.e).map_err(|_| TapError::BadRequest)?;
    let c = hex::decode(&params.c).map_err(|_| TapError::BadRequest)?;

    let picc_enc: [u8; 16] = e.try_into().map_err(|_| TapError::BadRequest)?;
    let mac_recv: [u8; 8] = c.try_into().map_err(|_| TapError::BadRequest)?;

    match verify_tap(&state.master, &picc_enc, &mac_recv) {
        Ok(v) => Ok(Json(TapOk {
            uid: hex::encode_upper(v.uid),
            counter: v.counter,
        })),
        Err(VerifyError::InvalidSignature) => Err(TapError::Unauthorized),
    }
}

fn load_master_key() -> [u8; 32] {
    let hex_str = if let Ok(env) = std::env::var("MASTER_KEY") {
        env
    } else {
        std::fs::read_to_string("master.key")
            .expect("MASTER_KEY env var or master.key file required")
    };
    let bytes = hex::decode(hex_str.trim()).expect("master key must be hex");
    assert_eq!(bytes.len(), 32, "master key must decode to 32 bytes");
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    out
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let host: std::net::IpAddr = std::env::var("HOST")
        .unwrap_or_else(|_| "127.0.0.1".to_string())
        .parse()
        .expect("HOST must be a valid IP address");
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid port number");

    let master = load_master_key();
    let state = AppState { master: Arc::new(master) };

    let app = Router::new().route("/tap", get(tap)).with_state(state);

    let addr = std::net::SocketAddr::new(host, port);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
