use crate::entities::{prelude::*, reward};
use crate::services::traits::RewardServiceTrait;
use async_trait::async_trait;
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;
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

    async fn decrement_stock(
        &self,
        reward_name: &str,
        amount: i32,
    ) -> Result<Option<reward::Model>, sea_orm::DbErr> {
        let reward = self.get_reward_by_name(reward_name).await?;

        match reward {
            Some(reward) => {
                // Only decrement if stock tracking is enabled
                if reward.stock != -1 {
                    let new_stock = reward.stock - amount;

                    if new_stock < 0 {
                        return Err(sea_orm::DbErr::Custom(
                            "Insufficient stock for transaction".to_string(),
                        ));
                    }

                    let mut active_reward: reward::ActiveModel = reward.into();
                    active_reward.stock = Set(new_stock);

                    let updated = active_reward.update(&self.db).await?;
                    Ok(Some(updated))
                } else {
                    Ok(Some(reward))
                }
            }
            None => Ok(None),
        }
    }

    async fn increment_stock(
        &self,
        reward_name: &str,
        amount: i32,
    ) -> Result<Option<reward::Model>, sea_orm::DbErr> {
        let reward = self.get_reward_by_name(reward_name).await?;

        match reward {
            Some(reward) => {
                // Only increment if stock tracking is enabled
                if reward.stock != -1 {
                    let new_stock = reward.stock + amount;

                    let mut active_reward: reward::ActiveModel = reward.into();
                    active_reward.stock = Set(new_stock);

                    let updated = active_reward.update(&self.db).await?;
                    Ok(Some(updated))
                } else {
                    Ok(Some(reward))
                }
            }
            None => Ok(None),
        }
    }
}
