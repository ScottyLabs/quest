use crate::entities::{prelude::*, reward};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

#[derive(Clone)]
pub struct RewardService {
    db: DatabaseConnection,
}

impl RewardService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_reward_by_name(
        &self,
        name: &str,
    ) -> Result<Option<reward::Model>, sea_orm::DbErr> {
        Reward::find()
            .filter(reward::Column::Name.eq(name))
            .one(&self.db)
            .await
    }

    pub async fn get_all_rewards(&self) -> Result<Vec<reward::Model>, sea_orm::DbErr> {
        Reward::find().all(&self.db).await
    }
}
