use std::{error::Error, fs};

use backend::{
    create_connection,
    entities::{challenges, reward},
    services::{challenge::ChallengeService, reward::RewardService},
};
use chrono::NaiveDateTime;
use sea_orm::ActiveValue::Set;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct ChallengeRecord {
    #[serde(rename = "Category")]
    category: String,

    #[serde(rename = "Location")]
    location: String,

    #[serde(rename = "CMUMaps Link")]
    maps_link: String,

    #[serde(rename = "Challenge Name")]
    challenge_name: String,

    #[serde(rename = "Tagline")]
    tagline: String,

    #[serde(rename = "Description")]
    description: String,

    #[serde(rename = "More Info Link")]
    more_info_link: String,

    #[serde(rename = "Unlocks/Revealed On")]
    unlock_date: String,

    #[serde(rename = "Verification String")]
    verification_string: String,
}

impl ChallengeRecord {
    /// Parse date format like "08/17/2025 6:00 PM"
    fn parse_unlock_timestamp(&self) -> Result<NaiveDateTime, Box<dyn Error>> {
        NaiveDateTime::parse_from_str(&self.unlock_date, "%m/%d/%Y %I:%M %p")
            .map_err(|e| format!("Failed to parse date '{}': {}", self.unlock_date, e).into())
    }

    // Parse optional fields
    fn clean_maps_link(&self) -> Option<String> {
        let cleaned = self.maps_link.trim();
        if cleaned.is_empty() {
            None
        } else {
            Some(cleaned.to_string())
        }
    }

    fn clean_more_info_link(&self) -> Option<String> {
        let cleaned = self.more_info_link.trim();
        if cleaned.is_empty() {
            None
        } else {
            Some(cleaned.to_string())
        }
    }
}

async fn insert_challenges() -> Result<(), Box<dyn Error + Send + Sync>> {
    println!("Seeding challenges from CSV...");

    let db = create_connection().await?;
    let challenge_service = ChallengeService::new(db);

    let csv_content = fs::read_to_string("data/challenges.csv")
        .map_err(|e| format!("Failed to read CSV file: {}", e))?;

    let mut csv_reader = csv::Reader::from_reader(csv_content.as_bytes());
    let mut challenges_to_process = Vec::new();
    let mut parse_errors = Vec::new();

    for (line_num, result) in csv_reader.deserialize().enumerate() {
        match result {
            Ok(record) => {
                let challenge_record: ChallengeRecord = record;

                match challenge_record.parse_unlock_timestamp() {
                    Ok(unlock_timestamp) => {
                        challenges_to_process.push((challenge_record, unlock_timestamp));
                    }
                    Err(e) => {
                        // +2 to account for header and 0-indexing
                        parse_errors.push(format!("Line {}: {}", line_num + 2, e));
                    }
                }
            }
            Err(e) => {
                parse_errors.push(format!(
                    "Line {}: Failed to parse CSV record: {}",
                    line_num + 2,
                    e
                ));
            }
        }
    }

    // Report any parsing errors
    if !parse_errors.is_empty() {
        eprintln!("Parsing errors encountered:");

        for error in &parse_errors {
            eprintln!("  {}", error);
        }
        if challenges_to_process.is_empty() {
            return Err("No valid challenges to insert".into());
        }
    }

    // Batch upsert challenges
    println!("Inserting {} challenges...", challenges_to_process.len());

    let active_models = challenges_to_process
        .into_iter()
        .map(|(record, unlock_timestamp)| challenges::ActiveModel {
            name: Set(record.challenge_name.clone()),
            category: Set(record.category.clone()),
            location: Set(record.location.clone()),
            scotty_coins: Set(100),
            maps_link: Set(record.clean_maps_link()),
            tagline: Set(record.tagline.clone()),
            description: Set(record.description.clone()),
            more_info_link: Set(record.clean_more_info_link()),
            unlock_timestamp: Set(unlock_timestamp),
            secret: Set(record.verification_string),
            latitude: Set(None),
            longitude: Set(None),
            location_accuracy: Set(None),
        })
        .collect();

    let count = challenge_service
        .upsert_challenges_batch(active_models)
        .await?;

    println!("Inserted {} challenges", count);
    Ok(())
}

#[derive(Debug, Deserialize)]
struct RewardRecord {
    #[serde(rename = "Item")]
    item: String,
    #[serde(rename = "ScottyCoins")]
    cost: i32,
    #[serde(rename = "Limit")]
    trade_limit: i32,
    #[serde(rename = "Stock")]
    stock: i32,
}

async fn insert_rewards() -> Result<(), Box<dyn Error + Send + Sync>> {
    println!("Seeding rewards from CSV...");

    let db = create_connection().await?;
    let reward_service = RewardService::new(db);

    let csv_content = fs::read_to_string("data/rewards.csv")
        .map_err(|e| format!("Failed to read CSV file: {}", e))?;

    let mut csv_reader = csv::Reader::from_reader(csv_content.as_bytes());
    let mut rewards_to_process = Vec::new();
    let mut parse_errors = Vec::new();

    for (line_num, result) in csv_reader.deserialize().enumerate() {
        match result {
            Ok(record) => {
                let reward_record: RewardRecord = record;
                rewards_to_process.push(reward_record);
            }
            Err(e) => {
                parse_errors.push(format!(
                    "Line {}: Failed to parse CSV record: {}",
                    line_num + 2,
                    e
                ));
            }
        }
    }

    // Report any parsing errors
    if !parse_errors.is_empty() {
        eprintln!("Parsing errors encountered:");

        for error in &parse_errors {
            eprintln!("  {}", error);
        }
        if rewards_to_process.is_empty() {
            return Err("No valid rewards to insert".into());
        }
    }

    // Batch upsert rewards
    println!("Inserting {} rewards...", rewards_to_process.len());

    let active_models = rewards_to_process
        .into_iter()
        .map(|record| reward::ActiveModel {
            name: Set(record.item.clone()),
            cost: Set(record.cost),
            trade_limit: Set(record.trade_limit),
            stock: Set(record.stock),
        })
        .collect();

    let count = reward_service.upsert_rewards_batch(active_models).await?;

    println!("Inserted {} rewards", count);
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let (challenges, rewards) = tokio::try_join!(
        tokio::spawn(insert_challenges()),
        tokio::spawn(insert_rewards())
    )?;

    challenges?;
    rewards?;

    Ok(())
}
