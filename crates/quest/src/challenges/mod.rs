pub mod routes;

use std::collections::HashSet;

use entity::enums::ChallengeCategory;
use entity::{challenge, tap_events};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
};

use crate::auth::AuthError;

#[derive(Clone)]
pub struct Challenges {
    db: DatabaseConnection,
}

impl Challenges {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn list(
        &self,
        category: Option<ChallengeCategory>,
    ) -> Result<Vec<challenge::Model>, AuthError> {
        let mut query = challenge::Entity::find();

        if let Some(category) = category {
            query = query.filter(challenge::Column::Category.eq(category));
        }

        query
            .order_by_asc(challenge::Column::OpenFrom)
            .order_by_asc(challenge::Column::Name)
            .all(&self.db)
            .await
            .map_err(db_down)
    }

    pub async fn one(&self, id: Uuid) -> Result<challenge::Model, AuthError> {
        challenge::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::NotFound("challenge_unknown"))
    }

    pub async fn cleared(&self, user: Uuid) -> Result<HashSet<Uuid>, AuthError> {
        let ids: Vec<Uuid> = tap_events::Entity::find()
            .select_only()
            .column(tap_events::Column::ChallengeId)
            .filter(tap_events::Column::UserId.eq(user))
            .distinct()
            .into_tuple()
            .all(&self.db)
            .await
            .map_err(db_down)?;

        Ok(ids.into_iter().collect())
    }
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("challenges: {err}");
    AuthError::Upstream("database_unavailable")
}
