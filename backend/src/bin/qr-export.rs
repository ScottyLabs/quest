use std::error::Error;

use backend::{
    create_connection, entities::challenges, services::challenge::ChallengeService,
    services::traits::ChallengeServiceTrait,
};
use base64::{Engine, engine::general_purpose};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct QrChallenge {
    name: String,
    category: String,
    tagline: String,
    secret: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let db = create_connection().await?;
    let challenge_service = ChallengeService::new(db);

    let challenges = challenge_service.get_all_challenges().await?;
    let qr_challenges = challenges
        .into_iter()
        .map(
            |challenges::Model {
                 name,
                 category,
                 tagline,
                 secret,
                 ..
             }| {
                QrChallenge {
                    name,
                    category,
                    tagline,
                    secret,
                }
            },
        )
        .collect::<Vec<_>>();

    let json = serde_json::to_string_pretty(&qr_challenges)?;
    let base64 = general_purpose::STANDARD.encode(json);

    std::fs::write("data/qr.txt", base64)?;

    Ok(())
}
