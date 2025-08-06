use std::collections::HashMap;

use crate::entities::{
    challenges::{self, ActiveModel, Model},
    prelude::*,
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QuerySelect, prelude::Decimal,
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

    // #[axum::debug_handler]
    // // pub async fn update_transaction_status(
    //         &self,
    //         transaction_id: &str,
    //         status: &str,
    //     ) -> Result<Option<transaction::Model>, sea_orm::DbErr> {
    //         let transaction = self.get_transaction_by_id(transaction_id).await?;

    //         match transaction {
    //             Some(transaction) => {
    //                 let mut active_transaction: transaction::ActiveModel = transaction.into();
    //                 active_transaction.status = Set(status.to_string());
    //                 let updated = active_transaction.update(&self.db).await?;
    //                 Ok(Some(updated))
    //             }
    //             None => Ok(None),
    //         }
    //     }

    pub async fn update_challenge_geolocation(
        &self,
        name: &str,
        latitude: f64,
        longitude: f64,
        location_accuracy: f64,
    ) -> Result<Option<challenges::Model>, sea_orm::DbErr> {
        let challenge = self.get_challenge_by_name(name).await?;

        match challenge {
            Some(challenge) => {
                let mut active_challenge: challenges::ActiveModel = challenge.into();
                active_challenge.latitude = Set(Some(latitude));
                active_challenge.longitude = Set(Some(longitude));
                active_challenge.location_accuracy =
                    Set(Decimal::from_f64_retain(location_accuracy));
                let updated = active_challenge.update(&self.db).await?;
                return Ok(Some(updated));
            }
            None => return Ok(None),
        };
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
