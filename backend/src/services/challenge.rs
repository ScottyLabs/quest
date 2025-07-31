use crate::entities::{challenges, prelude::*};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

#[derive(Clone)]
pub struct ChallengeService {
    db: DatabaseConnection,
}

impl ChallengeService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_all_challenges(&self) -> Result<Vec<challenges::Model>, sea_orm::DbErr> {
        Challenges::find().all(&self.db).await
    }

    pub async fn get_challenge_by_name(
        &self,
        name: &str,
    ) -> Result<Option<challenges::Model>, sea_orm::DbErr> {
        Challenges::find()
            .filter(challenges::Column::Name.eq(name))
            .one(&self.db)
            .await
    }
}
