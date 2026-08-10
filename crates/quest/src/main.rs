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
mod taps;
mod tokens;
mod users;

use std::sync::Arc;

use axum::Router;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;

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

    let master = Arc::new(load_master_key());

    let app = Router::new()
        .route("/tap", get(tap))
        .merge(applinks::router());

    let mut undiscovered = None;

    let app = match auth::Auth::from_env().await {
        Ok(auth) => {
            undiscovered = auth.undiscovered();

            let sessions = auth.sessions.layer();
            let users = users::Users::new(db.clone());
            let challenges = challenges::Challenges::new(db.clone());
            let daily = daily::Daily::new(db.clone());
            let devices = devices::Devices::new(db.clone(), auth.sessions.pool());
            let items = items::Items::new(db.clone());
            let leaderboard = leaderboard::Leaderboard::new(db.clone());
            let tokens = tokens::Tokens::new(db.clone());
            let taps = taps::Taps::new(db, master);

            app.merge(auth::routes::router(auth))
                .merge(devices::routes::router(devices.clone()))
                .merge(users::routes::router(users.clone()))
                .merge(challenges::routes::router(challenges.clone()))
                .merge(daily::routes::router(daily, challenges))
                .merge(taps::routes::router(taps, tokens.clone()))
                .merge(tokens::routes::router(tokens))
                .merge(items::routes::router(items))
                .merge(leaderboard::routes::router(leaderboard))
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
