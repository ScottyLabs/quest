use crate::entities::{prelude::*, reward};
use crate::services::traits::RewardServiceTrait;
use async_trait::async_trait;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, sea_query::OnConflict};

#[derive(Clone)]
pub struct RewardService {
    db: DatabaseConnection,
}

impl RewardService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl RewardServiceTrait for RewardService {
    async fn get_all_rewards(&self) -> Result<Vec<reward::Model>, sea_orm::DbErr> {
        Reward::find().all(&self.db).await
    }

    async fn get_reward_by_name(
        &self,
        name: &str,
    ) -> Result<Option<reward::Model>, sea_orm::DbErr> {
        Reward::find()
            .filter(reward::Column::Name.eq(name))
            .one(&self.db)
            .await
    }

    async fn upsert_rewards_batch(
        &self,
        rewards: Vec<reward::ActiveModel>,
    ) -> Result<usize, sea_orm::DbErr> {
        let count = rewards.len();

        // Use insert_many with ON CONFLICT DO UPDATE
        Reward::insert_many(rewards)
            .on_conflict(
                OnConflict::column(reward::Column::Name)
                    .update_columns([
                        reward::Column::Cost,
                        reward::Column::Stock,
                        reward::Column::TradeLimit,
                    ])
                    .to_owned(),
            )
            .exec(&self.db)
            .await?;

        Ok(count)
    }
}
