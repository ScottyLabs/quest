mod auth;
mod cors;
mod db;
mod devices;

use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use serde::{Deserialize, Serialize};

use quest::crypto::{VerifyError, verify_tap};

#[derive(Clone)]
struct AppState {
    master: Arc<[u8; 32]>,
    #[allow(dead_code)] // temp
    db: sea_orm::DatabaseConnection,
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
                Json(ErrBody {
                    error: "invalid signature",
                }),
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

async fn log_request(
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let started = std::time::Instant::now();

    let response = next.run(request).await;

    println!(
        "{method} {path} -> {} in {}ms",
        response.status(),
        started.elapsed().as_millis()
    );
    response
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

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = db::connect(&database_url)
        .await
        .expect("failed to connect to Postgres");

    let master = load_master_key();
    let state = AppState {
        master: Arc::new(master),
        db: db.clone(),
    };

    let app = Router::new().route("/tap", get(tap)).with_state(state);

    let mut undiscovered = None;

    let app = match auth::Auth::from_env().await {
        Ok(auth) => {
            undiscovered = auth.undiscovered();

            let sessions = auth.sessions.layer();
            let devices = devices::Devices::new(db, auth.sessions.pool());

            // `enforce` sits over every route rather than under a chosen few, so
            // a new endpoint is protected the moment it exists. It goes inside
            // the session layer, which is what it reads the account from.
            app.merge(auth::routes::router(auth))
                .merge(devices::routes::router(devices.clone()))
                .layer(axum::middleware::from_fn_with_state(
                    devices.clone(),
                    devices::enforce,
                ))
                .layer(axum::Extension(devices))
                .layer(sessions)
                .layer(axum::middleware::from_fn(auth::extract::bearer_id))
        }
        Err(err) if auth::oidc::configured() => {
            panic!("auth is configured but failed to start: {err}")
        }
        Err(err) => {
            eprintln!("auth disabled: {err}; /auth/* will answer 503");
            app.merge(auth::routes::unconfigured_router())
        }
    };

    let app = app
        .layer(cors::layer())
        .layer(axum::middleware::from_fn(log_request));

    let addr = std::net::SocketAddr::new(host, port);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("listening on {}", listener.local_addr().unwrap());

    let server = axum::serve(listener, app);

    let Some(config) = undiscovered else {
        return server.await.unwrap();
    };

    server
        .with_graceful_shutdown(auth::oidc::rediscovered(config))
        .await
        .unwrap();

    eprintln!("Keycloak answered; restarting to mount /auth/login");
    std::process::exit(1);
}
