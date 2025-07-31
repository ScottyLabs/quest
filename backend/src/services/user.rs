use crate::entities::{prelude::*, user};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};

#[derive(Clone)]
pub struct UserService {
    db: DatabaseConnection,
}

impl UserService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_or_create_user(
        &self,
        user_id: &str,
        name: &str,
    ) -> Result<user::Model, sea_orm::DbErr> {
        // Try to find existing user
        if let Some(existing_user) = User::find_by_id(user_id).one(&self.db).await? {
            return Ok(existing_user);
        }

        // Create new user if doesn't exist
        let new_user = user::ActiveModel {
            user_id: Set(user_id.to_string()),
            dorm: Set(None),
            name: Set(name.to_string()),
        };

        let user = new_user.insert(&self.db).await?;
        Ok(user)
    }

    pub async fn update_dorm(
        &self,
        user_id: &str,
        dorm: Option<String>,
    ) -> Result<user::Model, sea_orm::DbErr> {
        let user = User::find_by_id(user_id)
            .one(&self.db)
            .await?
            .ok_or_else(|| sea_orm::DbErr::RecordNotFound("User not found".to_string()))?;

        let mut user: user::ActiveModel = user.into();
        user.dorm = Set(dorm);
        user.update(&self.db).await
    }
}
