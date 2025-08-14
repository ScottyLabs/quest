use std::collections::HashMap;

use crate::entities::{challenges, prelude::*};
use crate::services::traits::ChallengeServiceTrait;
use async_trait::async_trait;
use rust_decimal::Decimal;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QuerySelect, sea_query::OnConflict,
};

#[derive(Clone)]
pub struct ChallengeService {
    db: DatabaseConnection,
}

impl ChallengeService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ChallengeServiceTrait for ChallengeService {
    async fn get_all_challenges(&self) -> Result<Vec<challenges::Model>, sea_orm::DbErr> {
        Challenges::find().all(&self.db).await
    }

    async fn get_challenge_by_name(
        &self,
        name: &str,
    ) -> Result<Option<challenges::Model>, sea_orm::DbErr> {
        Challenges::find()
            .filter(challenges::Column::Name.eq(name))
            .one(&self.db)
            .await
    }

    async fn update_challenge_geolocation(
        &self,
        name: &str,
        latitude: f64,
        longitude: f64,
        location_accuracy: f64,
    ) -> Result<Option<challenges::Model>, sea_orm::DbErr> {
        let Some(challenge) = self.get_challenge_by_name(name).await? else {
            return Ok(None);
        };

        let mut active_challenge: challenges::ActiveModel = challenge.into();
        active_challenge.latitude = Set(Some(latitude));
        active_challenge.longitude = Set(Some(longitude));
        active_challenge.location_accuracy = Set(Decimal::from_f64_retain(location_accuracy));

        active_challenge.update(&self.db).await.map(Some)
    }

    async fn get_total_challenges_by_category(
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

    async fn get_total_challenge_count(&self) -> Result<i32, sea_orm::DbErr> {
        let count = Challenges::find().count(&self.db).await?;
        Ok(count as i32)
    }

    async fn upsert_challenges_batch(
        &self,
        challenges: Vec<challenges::ActiveModel>,
    ) -> Result<usize, sea_orm::DbErr> {
        let count = challenges.len();

        // Use insert_many with ON CONFLICT DO UPDATE
        Challenges::insert_many(challenges)
            .on_conflict(
                OnConflict::column(challenges::Column::Name)
                    .update_columns([
                        challenges::Column::Category,
                        challenges::Column::Location,
                        challenges::Column::ScottyCoins,
                        challenges::Column::MapsLink,
                        challenges::Column::Tagline,
                        challenges::Column::Description,
                        challenges::Column::MoreInfoLink,
                        challenges::Column::UnlockTimestamp,
                        challenges::Column::Secret,
                    ])
                    .to_owned(),
            )
            .exec(&self.db)
            .await?;

        Ok(count)
    }
}
