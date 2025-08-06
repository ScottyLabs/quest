use axum::http::Method;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use serde::{Deserialize, Serialize};
use tokio::signal;
use tower_http::cors::CorsLayer;
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
use utoipa_swagger_ui::SwaggerUi;

mod auth;
mod doc;
pub mod entities;
mod handlers;
mod middleware;
mod services;

use auth::{build_oauth2_resource_server, dev_auth_middleware};
use doc::ApiDoc;
use middleware::admin;
use services::{
    challenge::ChallengeService, completion::CompletionService, leaderboard::LeaderboardService,
    reward::RewardService, storage::StorageService, transaction::TransactionService,
    user::UserService,
};

#[derive(Clone)]
struct AppState {
    user_service: UserService,
    challenge_service: ChallengeService,
    completion_service: CompletionService,
    reward_service: RewardService,
    transaction_service: TransactionService,
    leaderboard_service: LeaderboardService,
    storage_service: StorageService,
}

#[derive(Clone, Serialize, Deserialize)]
struct AuthClaims {
    pub iss: String,
    pub sub: String,
    pub aud: String,
    pub exp: i64,
    pub iat: i64,
    pub auth_time: i64,
    pub acr: String,
    pub email: String,
    pub email_verified: bool,
    pub name: String,
    pub given_name: String,
    pub preferred_username: String,
    pub nickname: String,
    pub groups: Vec<String>,
}

// Public endpoint handlers
#[utoipa::path(
    get,
    path = "/",
    responses(
        (status = 200, description = "API information", body = String)
    ),
    tag = "public"
)]
async fn root() -> &'static str {
    "Visit /swagger for API documentation"
}

#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Health check", body = String)
    ),
    tag = "public"
)]
async fn health() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let db = create_connection().await?;
    let storage_service = StorageService::new(
        &dotenvy::var("MINIO_ENDPOINT").expect("MINIO_ENDPOINT must be set"),
        &dotenvy::var("MINIO_ACCESS_KEY").expect("MINIO_ACCESS_KEY must be set"),
        &dotenvy::var("MINIO_SECRET_KEY").expect("MINIO_SECRET_KEY must be set"),
        dotenvy::var("MINIO_BUCKET").expect("MINIO_BUCKET must be set"),
    )?;

    let state = AppState {
        user_service: UserService::new(db.clone()),
        challenge_service: ChallengeService::new(db.clone()),
        completion_service: CompletionService::new(db.clone()),
        reward_service: RewardService::new(db.clone()),
        transaction_service: TransactionService::new(db.clone()),
        leaderboard_service: LeaderboardService::new(db.clone()),
        storage_service,
    };

    let admin_routes = OpenApiRouter::new()
        .routes(routes!(
            handlers::admin::verify_transaction,
            handlers::admin::get_all_challenges,
            handlers::admin::put_challenge_geolocation,
        ))
        .layer(axum::middleware::from_fn(admin::require_admin));

    let mut protected_routes = OpenApiRouter::new()
        .routes(routes!(
            handlers::user::get_profile,
            handlers::user::update_dorm,
        ))
        .routes(routes!(handlers::challenges::get_challenges,))
        .routes(routes!(handlers::rewards::get_rewards,))
        .routes(routes!(handlers::leaderboard::get_leaderboard,))
        .routes(routes!(handlers::leaderboard::get_user_leaderboard,))
        .routes(routes!(
            handlers::transaction::create_transaction,
            handlers::transaction::cancel_transaction,
        ))
        .routes(routes!(handlers::completion::create_completion,))
        .routes(routes!(handlers::journal::get_journal,))
        .routes(routes!(
            handlers::journal::get_journal_entry,
            handlers::journal::update_journal_entry,
            handlers::journal::delete_journal_photo,
        ))
        .merge(admin_routes)
        .layer(build_cors_layer())
        .with_state(state);

    if cfg!(debug_assertions) && dotenvy::var("ENABLE_DEV_AUTH").is_ok() {
        protected_routes = protected_routes.layer(axum::middleware::from_fn(dev_auth_middleware));
    } else {
        protected_routes = protected_routes.layer(build_oauth2_resource_server().await);
    }

    let public_routes = OpenApiRouter::new()
        .routes(routes!(root))
        .merge(OpenApiRouter::new().routes(routes!(health)));

    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(protected_routes)
        .merge(public_routes)
        .split_for_parts();

    let app = router.merge(SwaggerUi::new("/swagger").url("/openapi.json", api));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;

    println!("Listening on http://0.0.0.0:3000");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn create_connection() -> Result<DatabaseConnection, DbErr> {
    let database_url =
        dotenvy::var("DATABASE_URL").expect("DATABASE_URL environment variable must be set");
    let opt = ConnectOptions::new(database_url);

    // Set connection pool options here

    Database::connect(opt).await
}

fn build_cors_layer() -> CorsLayer {
    let mut origins = vec![
        "https://cmu.quest".parse().unwrap(),
        "https://quest.scottylabs.org".parse().unwrap(),
    ];

    if cfg!(debug_assertions) && dotenvy::var("ENABLE_DEV_AUTH").is_ok() {
        origins.extend_from_slice(&[
            "http://localhost:1420".parse().unwrap(),
            "http://tauri.localhost".parse().unwrap(),
            "tauri://localhost".parse().unwrap(),
        ]);
    }

    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
        ])
        .allow_credentials(true)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
