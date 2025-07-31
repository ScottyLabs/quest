use crate::entities::{challenges, completion, prelude::*};
use chrono::{NaiveDateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, JoinType,
    QueryFilter, QuerySelect, RelationTrait,
};
use std::collections::HashMap;

#[derive(Clone)]
pub struct CompletionService {
    db: DatabaseConnection,
}

impl CompletionService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // Get completion timestamps for a user (map of challenge_name -> completed_at)
    pub async fn get_user_completion_map(
        &self,
        user_id: &str,
    ) -> Result<HashMap<String, NaiveDateTime>, sea_orm::DbErr> {
        let completions = Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .all(&self.db)
            .await?;

        Ok(completions
            .into_iter()
            .map(|c| (c.challenge_name, c.timestamp))
            .collect())
    }

    // Get total coins earned by user
    pub async fn get_user_total_coins_earned(&self, user_id: &str) -> Result<i32, sea_orm::DbErr> {
        let completions_with_coins = Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .join(JoinType::InnerJoin, completion::Relation::Challenges.def())
            .select_only()
            .column_as(challenges::Column::ScottyCoins, "coins")
            .into_tuple::<i32>()
            .all(&self.db)
            .await?;

        Ok(completions_with_coins.into_iter().sum())
    }

    // Create a new completion
    pub async fn create_completion(
        &self,
        user_id: &str,
        challenge_name: &str,
        s3_link: Option<String>,
        note: Option<String>,
    ) -> Result<completion::Model, sea_orm::DbErr> {
        let new_completion = completion::ActiveModel {
            user_id: Set(user_id.to_string()),
            challenge_name: Set(challenge_name.to_string()),
            timestamp: Set(Utc::now().naive_utc()),
            s3_link: Set(s3_link),
            note: Set(note),
        };

        new_completion.insert(&self.db).await
    }

    // Check if completion already exists
    pub async fn completion_exists(
        &self,
        user_id: &str,
        challenge_name: &str,
    ) -> Result<bool, sea_orm::DbErr> {
        let completion = Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .filter(completion::Column::ChallengeName.eq(challenge_name))
            .one(&self.db)
            .await?;

        Ok(completion.is_some())
    }

    // Get all completions for a user with challenge details
    pub async fn get_user_completions_with_challenges(
        &self,
        user_id: &str,
    ) -> Result<Vec<(completion::Model, challenges::Model)>, sea_orm::DbErr> {
        Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .find_also_related(challenges::Entity)
            .all(&self.db)
            .await
            .map(|results| {
                results
                    .into_iter()
                    .filter_map(|(completion, challenge)| challenge.map(|ch| (completion, ch)))
                    .collect()
            })
    }

    // Get a specific completion for a user with challenge details
    pub async fn get_user_completion_with_challenge(
        &self,
        user_id: &str,
        challenge_name: &str,
    ) -> Result<Option<(completion::Model, challenges::Model)>, sea_orm::DbErr> {
        let result = Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .filter(completion::Column::ChallengeName.eq(challenge_name))
            .find_also_related(challenges::Entity)
            .one(&self.db)
            .await?;

        match result {
            Some((completion, Some(challenge))) => Ok(Some((completion, challenge))),
            _ => Ok(None),
        }
    }

    // Update a completion's note
    pub async fn update_completion_note(
        &self,
        user_id: &str,
        challenge_name: &str,
        note: Option<String>,
    ) -> Result<Option<completion::Model>, sea_orm::DbErr> {
        // First find the completion
        let completion = Completion::find()
            .filter(completion::Column::UserId.eq(user_id))
            .filter(completion::Column::ChallengeName.eq(challenge_name))
            .one(&self.db)
            .await?;

        match completion {
            Some(completion) => {
                let mut active_completion: completion::ActiveModel = completion.into();
                active_completion.note = Set(note);
                let updated = active_completion.update(&self.db).await?;
                Ok(Some(updated))
            }
            None => Ok(None),
        }
    }
}
