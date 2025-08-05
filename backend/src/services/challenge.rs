use std::collections::HashMap;

use crate::entities::{challenges, prelude::*};
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QuerySelect,
};

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

    pub async fn get_total_challenges_by_category(
        &self,
    ) -> Result<HashMap<String, i32>, sea_orm::DbErr> {
        let challenges = Challenges::find()
            .select_only()
            .column(challenges::Column::Category)
            .column_as(challenges::Column::Name.count(), "count")
            .group_by(challenges::Column::Category)
            .into_tuple::<(String, i64)>()
            .all(&self.db)
            .await?;

        Ok(challenges
            .into_iter()
            .map(|(category, count)| (category, count as i32))
            .collect())
    }

    pub async fn get_total_challenge_count(&self) -> Result<i32, sea_orm::DbErr> {
        let count = Challenges::find().count(&self.db).await?;

        Ok(count as i32)
    }
}
