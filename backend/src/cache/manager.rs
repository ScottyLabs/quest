use crate::entities::{challenges, completion, reward};
use crate::services::leaderboard::LeaderboardEntry;
use chrono::NaiveDateTime;
use moka::future::Cache;
use std::collections::HashMap;

mod cache_keys {
    pub const CHALLENGES_ALL: &str = "challenges:all";
    pub const CHALLENGE_BY_NAME: &str = "challenge:name:";
    pub const USER_COMPLETIONS: &str = "user:completions:";
    pub const REWARDS_ALL: &str = "rewards:all";
    pub const REWARD_BY_NAME: &str = "reward:name:";
    pub const LEADERBOARD_PAGE: &str = "leaderboard:page:";
    pub const USER_POSITION: &str = "user:position:";
}

#[derive(Clone)]
pub struct CacheManager {
    // Challenge caches
    challenges: Cache<String, Vec<challenges::Model>>,
    challenge_by_name: Cache<String, Option<challenges::Model>>,
    challenge_counts: Cache<String, HashMap<String, i32>>,
    total_challenge_count: Cache<String, i32>,

    // Completion caches
    user_completions: Cache<String, HashMap<String, NaiveDateTime>>,
    user_completion_counts: Cache<String, i32>,
    user_coins_earned: Cache<String, i32>,
    user_completions_by_category: Cache<String, HashMap<String, i32>>,
    user_completions_with_challenges: Cache<String, Vec<(completion::Model, challenges::Model)>>,
    user_recent_activity: Cache<String, Vec<NaiveDateTime>>,

    // Reward caches
    rewards: Cache<String, Vec<reward::Model>>,
    reward_by_name: Cache<String, Option<reward::Model>>,

    // Leaderboard caches
    leaderboard_pages: Cache<String, Vec<LeaderboardEntry>>,
    user_positions: Cache<String, i64>,
}

impl Default for CacheManager {
    fn default() -> Self {
        Self::new()
    }
}

impl CacheManager {
    pub fn new() -> Self {
        Self {
            // Challenge caches (smaller since they don't change often)
            challenges: Cache::builder().max_capacity(10).build(),
            challenge_by_name: Cache::builder().max_capacity(1000).build(),
            challenge_counts: Cache::builder().max_capacity(10).build(),
            total_challenge_count: Cache::builder().max_capacity(1).build(),

            // User-specific caches (larger for many users)
            user_completions: Cache::builder().max_capacity(10000).build(),
            user_completion_counts: Cache::builder().max_capacity(10000).build(),
            user_coins_earned: Cache::builder().max_capacity(10000).build(),
            user_completions_by_category: Cache::builder().max_capacity(10000).build(),
            user_completions_with_challenges: Cache::builder().max_capacity(10000).build(),
            user_recent_activity: Cache::builder().max_capacity(10000).build(),

            // Reward caches (small since rewards don't change often)
            rewards: Cache::builder().max_capacity(10).build(),
            reward_by_name: Cache::builder().max_capacity(100).build(),

            // Leaderboard caches
            leaderboard_pages: Cache::builder().max_capacity(100).build(),
            user_positions: Cache::builder().max_capacity(10000).build(),
        }
    }

    // Challenge cache methods
    pub async fn get_challenges(&self) -> Option<Vec<challenges::Model>> {
        self.challenges.get(cache_keys::CHALLENGES_ALL).await
    }

    pub async fn set_challenges(&self, challenges: Vec<challenges::Model>) {
        self.challenges
            .insert(cache_keys::CHALLENGES_ALL.to_string(), challenges)
            .await;
    }

    pub async fn get_challenge_by_name(&self, name: &str) -> Option<Option<challenges::Model>> {
        let key = format!("{}{}", cache_keys::CHALLENGE_BY_NAME, name);
        self.challenge_by_name.get(&key).await
    }

    pub async fn set_challenge_by_name(&self, name: &str, challenge: Option<challenges::Model>) {
        let key = format!("{}{}", cache_keys::CHALLENGE_BY_NAME, name);
        self.challenge_by_name.insert(key, challenge).await;
    }

    pub async fn get_challenge_counts(&self) -> Option<HashMap<String, i32>> {
        self.challenge_counts.get("counts").await
    }

    pub async fn set_challenge_counts(&self, counts: HashMap<String, i32>) {
        self.challenge_counts
            .insert("counts".to_string(), counts)
            .await;
    }

    pub async fn get_total_challenge_count(&self) -> Option<i32> {
        self.total_challenge_count.get("total").await
    }

    pub async fn set_total_challenge_count(&self, count: i32) {
        self.total_challenge_count
            .insert("total".to_string(), count)
            .await;
    }

    // User completion cache methods
    pub async fn get_user_completions(
        &self,
        user_id: &str,
    ) -> Option<HashMap<String, NaiveDateTime>> {
        let key = format!("{}{}", cache_keys::USER_COMPLETIONS, user_id);
        self.user_completions.get(&key).await
    }

    pub async fn set_user_completions(
        &self,
        user_id: &str,
        completions: HashMap<String, NaiveDateTime>,
    ) {
        let key = format!("{}{}", cache_keys::USER_COMPLETIONS, user_id);
        self.user_completions.insert(key, completions).await;
    }

    pub async fn get_user_completion_count(&self, user_id: &str) -> Option<i32> {
        let key = format!("completion_count:{user_id}");
        self.user_completion_counts.get(&key).await
    }

    pub async fn set_user_completion_count(&self, user_id: &str, count: i32) {
        let key = format!("completion_count:{user_id}");
        self.user_completion_counts.insert(key, count).await;
    }

    pub async fn get_user_coins_earned(&self, user_id: &str) -> Option<i32> {
        let key = format!("coins_earned:{user_id}");
        self.user_coins_earned.get(&key).await
    }

    pub async fn set_user_coins_earned(&self, user_id: &str, coins: i32) {
        let key = format!("coins_earned:{user_id}");
        self.user_coins_earned.insert(key, coins).await;
    }

    pub async fn get_user_completions_by_category(
        &self,
        user_id: &str,
    ) -> Option<HashMap<String, i32>> {
        let key = format!("completions_by_category:{user_id}");
        self.user_completions_by_category.get(&key).await
    }

    pub async fn set_user_completions_by_category(
        &self,
        user_id: &str,
        completions: HashMap<String, i32>,
    ) {
        let key = format!("completions_by_category:{user_id}");
        self.user_completions_by_category
            .insert(key, completions)
            .await;
    }

    pub async fn get_user_completions_with_challenges(
        &self,
        user_id: &str,
    ) -> Option<Vec<(completion::Model, challenges::Model)>> {
        let key = format!("completions_with_challenges:{user_id}");
        self.user_completions_with_challenges.get(&key).await
    }

    pub async fn set_user_completions_with_challenges(
        &self,
        user_id: &str,
        completions: Vec<(completion::Model, challenges::Model)>,
    ) {
        let key = format!("completions_with_challenges:{user_id}");
        self.user_completions_with_challenges
            .insert(key, completions)
            .await;
    }

    pub async fn get_user_recent_activity(
        &self,
        user_id: &str,
        num_days_back: i64,
    ) -> Option<Vec<NaiveDateTime>> {
        let key = format!("recent_activity:{user_id}:{num_days_back}");
        self.user_recent_activity.get(&key).await
    }

    pub async fn set_user_recent_activity(
        &self,
        user_id: &str,
        num_days_back: i64,
        activity: Vec<NaiveDateTime>,
    ) {
        let key = format!("recent_activity:{user_id}:{num_days_back}");
        self.user_recent_activity.insert(key, activity).await;
    }

    // Reward cache methods
    pub async fn get_rewards(&self) -> Option<Vec<reward::Model>> {
        self.rewards.get(cache_keys::REWARDS_ALL).await
    }

    pub async fn set_rewards(&self, rewards: Vec<reward::Model>) {
        self.rewards
            .insert(cache_keys::REWARDS_ALL.to_string(), rewards)
            .await;
    }

    pub async fn get_reward_by_name(&self, name: &str) -> Option<Option<reward::Model>> {
        let key = format!("{}{}", cache_keys::REWARD_BY_NAME, name);
        self.reward_by_name.get(&key).await
    }

    pub async fn set_reward_by_name(&self, name: &str, reward: Option<reward::Model>) {
        let key = format!("{}{}", cache_keys::REWARD_BY_NAME, name);
        self.reward_by_name.insert(key, reward).await;
    }

    // Leaderboard cache methods
    pub async fn get_leaderboard_page(
        &self,
        limit: u64,
        after_rank: Option<i64>,
    ) -> Option<Vec<LeaderboardEntry>> {
        let key = format!(
            "{}{}:{}",
            cache_keys::LEADERBOARD_PAGE,
            limit,
            after_rank.unwrap_or(0)
        );
        self.leaderboard_pages.get(&key).await
    }

    pub async fn set_leaderboard_page(
        &self,
        limit: u64,
        after_rank: Option<i64>,
        entries: Vec<LeaderboardEntry>,
    ) {
        let key = format!(
            "{}{}:{}",
            cache_keys::LEADERBOARD_PAGE,
            limit,
            after_rank.unwrap_or(0)
        );
        self.leaderboard_pages.insert(key, entries).await;
    }

    pub async fn get_user_position(&self, user_id: &str) -> Option<i64> {
        let key = format!("{}{}", cache_keys::USER_POSITION, user_id);
        self.user_positions.get(&key).await
    }

    pub async fn set_user_position(&self, user_id: &str, position: i64) {
        let key = format!("{}{}", cache_keys::USER_POSITION, user_id);
        self.user_positions.insert(key, position).await;
    }

    // Invalidation methods
    pub async fn invalidate_challenges(&self) {
        self.challenges.invalidate_all();
        self.challenge_by_name.invalidate_all();
        self.challenge_counts.invalidate_all();
        self.total_challenge_count.invalidate_all();
    }

    pub async fn invalidate_user_data(&self, user_id: &str) {
        // Invalidate all user-specific caches
        let completion_key = format!("{}{}", cache_keys::USER_COMPLETIONS, user_id);
        let count_key = format!("completion_count:{user_id}");
        let coins_key = format!("coins_earned:{user_id}");
        let category_key = format!("completions_by_category:{user_id}");
        let position_key = format!("{}{}", cache_keys::USER_POSITION, user_id);
        let completions_with_challenges_key = format!("completions_with_challenges:{user_id}");

        self.user_completions.invalidate(&completion_key).await;
        self.user_completion_counts.invalidate(&count_key).await;
        self.user_coins_earned.invalidate(&coins_key).await;
        self.user_completions_by_category
            .invalidate(&category_key)
            .await;
        self.user_positions.invalidate(&position_key).await;
        self.user_completions_with_challenges
            .invalidate(&completions_with_challenges_key)
            .await;

        // Invalidate all recent activity entries for this user (with any num_days_back)
        // Note: This is a bit inefficient but moka doesn't have prefix invalidation
        self.user_recent_activity.invalidate_all();
    }

    pub async fn invalidate_leaderboard(&self) {
        self.leaderboard_pages.invalidate_all();
        self.user_positions.invalidate_all();
    }

    pub async fn invalidate_rewards(&self) {
        self.rewards.invalidate_all();
        self.reward_by_name.invalidate_all();
    }

    // Invalidate everything (useful for admin operations)
    pub async fn invalidate_all(&self) {
        self.invalidate_challenges().await;
        self.invalidate_leaderboard().await;
        self.invalidate_rewards().await;
        self.user_completions.invalidate_all();
        self.user_completion_counts.invalidate_all();
        self.user_coins_earned.invalidate_all();
        self.user_completions_by_category.invalidate_all();
        self.user_completions_with_challenges.invalidate_all();
        self.user_recent_activity.invalidate_all();
    }
}
