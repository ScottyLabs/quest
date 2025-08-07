use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use serde::{Deserialize, Serialize};

pub mod auth;
pub mod doc;
pub mod entities;
pub mod handlers;
pub mod middleware;
pub mod services;

use services::{
    challenge::ChallengeService, completion::CompletionService, leaderboard::LeaderboardService,
    reward::RewardService, storage::StorageService, transaction::TransactionService,
    user::UserService,
};

#[derive(Clone)]
pub struct AppState {
    pub user_service: UserService,
    pub challenge_service: ChallengeService,
    pub completion_service: CompletionService,
    pub reward_service: RewardService,
    pub transaction_service: TransactionService,
    pub leaderboard_service: LeaderboardService,
    pub storage_service: StorageService,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct AuthClaims {
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

pub async fn create_connection() -> Result<DatabaseConnection, DbErr> {
    dotenvy::dotenv().ok();

    let database_url =
        dotenvy::var("DATABASE_URL").expect("DATABASE_URL environment variable must be set");
    let opt = ConnectOptions::new(database_url);

    // Set connection pool options here

    Database::connect(opt).await
}
