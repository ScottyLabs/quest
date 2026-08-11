mod applinks;
mod auth;
mod challenges;
mod cors;
mod daily;
mod day;
mod db;
mod devices;
mod items;
mod leaderboard;
mod legal;
mod openapi;
mod passes;
mod staff;
mod taps;
mod tokens;
mod updates;
mod users;

use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;

const NATIVE_TAP: &str = "org.scottylabs.quest://tap";

async fn tap(uri: axum::http::Uri) -> Response {
    let query = uri.query().unwrap_or_default();
    let target = if query.is_empty() {
        NATIVE_TAP.to_owned()
    } else {
        format!("{NATIVE_TAP}?{query}")
    };

    match axum::http::HeaderValue::from_str(&target) {
        Ok(location) => (
            StatusCode::SEE_OTHER,
            [(axum::http::header::LOCATION, location)],
        )
            .into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

#[derive(Serialize, utoipa::ToSchema)]
struct Health {
    status: &'static str,
}

#[utoipa::path(
    get,
    path = "/api/health",
    tag = "health",
    security(()),
    responses((status = OK, body = Health)),
)]
async fn health() -> Json<Health> {
    Json(Health { status: "ok" })
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
    let path = request
        .uri()
        .path_and_query()
        .map_or_else(|| request.uri().path().to_owned(), ToString::to_string);
    let started = std::time::Instant::now();

    let response = next.run(request).await;

    println!(
        "{method} {path} -> {} in {}ms",
        response.status(),
        started.elapsed().as_millis()
    );
    response
}

fn bundle_source() -> Option<String> {
    let mut args = std::env::args().skip(1);

    while let Some(arg) = args.next() {
        if let Some(path) = arg.strip_prefix("--bundle=") {
            return Some(path.to_owned());
        }
        if arg == "--bundle" {
            return Some(args.next().expect("--bundle needs a path"));
        }
    }

    std::env::var("QUEST_BUNDLE")
        .ok()
        .filter(|path| !path.is_empty())
}

#[tokio::main]
async fn main() {
    if std::env::args().nth(1).as_deref() == Some("openapi") {
        let spec = openapi::document()
            .to_pretty_json()
            .expect("the spec always serializes");
        println!("{spec}");
        return;
    }

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

    let updates = match bundle_source() {
        Some(path) => {
            let loaded = updates::Updates::load(std::path::Path::new(&path))
                .unwrap_or_else(|err| panic!("bundle {path}: {err}"));
            let live = loaded.live().expect("a loaded bundle is always live");
            println!("serving bundle {} from {path}", live.version);
            loaded
        }
        None => {
            eprintln!("no bundle configured; over-the-air updates are off");
            updates::Updates::disabled()
        }
    };
    let master = Arc::new(load_master_key());

    let app = Router::new()
        .route("/tap", get(tap))
        .route("/api/health", get(health))
        .merge(applinks::router());

    let mut undiscovered = None;
    let app = match auth::Auth::from_env().await {
        Ok(auth) => {
            undiscovered = auth.undiscovered();

            let sessions = auth.sessions.layer();
            let services = openapi::Services::new(
                db.clone(),
                auth.sessions.pool(),
                *master,
                passes::Passes::from_env(db)
                    .unwrap_or_else(|err| panic!("wallet passes misconfigured: {err}")),
            );
            let devices = services.devices.clone();
            let users = services.users.clone();

            let (routed, _) = openapi::split(&services);

            app.merge(auth::routes::router(auth))
                .merge(routed)
                .layer(axum::middleware::from_fn_with_state(
                    devices.clone(),
                    devices::enforce,
                ))
                .layer(axum::Extension(devices))
                .layer(axum::Extension(users))
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
        .merge(legal::router())
        .merge(updates::routes::router(updates))
        .merge(openapi::docs())
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
