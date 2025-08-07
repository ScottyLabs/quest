use crate::handlers;
use utoipa::{
    Modify, OpenApi,
    openapi::{
        SecurityRequirement,
        security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
    },
};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.as_mut().unwrap();
        components.add_security_scheme(
            "jwt",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );

        // Add global security requirement
        openapi.security = Some(vec![SecurityRequirement::new("jwt", Vec::<String>::new())]);
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::user::get_profile,
        handlers::user::update_dorm,
        handlers::challenges::get_challenges,
        handlers::rewards::get_rewards,
        handlers::leaderboard::get_leaderboard,
        handlers::leaderboard::get_user_leaderboard,
        handlers::transaction::create_transaction,
        handlers::transaction::cancel_transaction,
        handlers::completion::create_completion,
        handlers::journal::get_journal,
        handlers::journal::get_journal_entry,
        handlers::journal::update_journal_entry,
        handlers::journal::delete_journal_photo,
        handlers::admin::verify_transaction,
        handlers::admin::get_all_challenges,
        handlers::admin::put_challenge_geolocation,
    ),
    modifiers(&SecurityAddon),
    components(
        schemas(
            handlers::user::UserProfileResponse,
            handlers::user::UpdateDormRequest,
            handlers::challenges::ChallengesListResponse,
            handlers::challenges::ChallengeResponse,
            handlers::rewards::RewardsListResponse,
            handlers::rewards::RewardResponse,
            handlers::leaderboard::LeaderboardResponse,
            handlers::transaction::CreateTransactionRequest,
            handlers::transaction::CreateTransactionResponse,
            handlers::transaction::CancelTransactionResponse,
            handlers::completion::CreateCompletionRequest,
            handlers::completion::CreateCompletionResponse,
            handlers::journal::JournalListResponse,
            handlers::journal::JournalEntry,
            handlers::journal::UpdateJournalRequest,
            handlers::journal::DeletePhotoResponse,
            handlers::admin::VerifyTransactionRequest,
            handlers::admin::VerifyTransactionResponse,
            handlers::admin::AdminChallengesListResponse,
			handlers::admin::AdminChallengeResponse,
        )
    ),
    tags(
        (name = "user", description = "User management endpoints"),
        (name = "challenges", description = "Challenge endpoints"),
        (name = "rewards", description = "Reward endpoints"),
        (name = "leaderboard", description = "Leaderboard endpoints"),
        (name = "transactions", description = "Transaction endpoints"),
        (name = "completions", description = "Completion endpoints"),
        (name = "journal", description = "Journal endpoints"),
        (name = "admin", description = "Admin endpoints"),
    ),
    info(
        title = "O-Quest API",
        version = "1.0.0",
        description = "O-Quest API",
        license(
            name = "MIT OR Apache-2.0",
            identifier = "MIT OR Apache-2.0"
        )
    )
)]
pub struct ApiDoc;
