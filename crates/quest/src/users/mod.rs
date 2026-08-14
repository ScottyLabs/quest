pub mod routes;

use entity::enums::Dorm;
use entity::users;
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
};

use crate::auth::AuthError;
use crate::auth::session::SessionUser;

#[derive(Clone)]
pub struct Users {
    db: DatabaseConnection,
}

impl Users {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn upsert(&self, user: &SessionUser) -> Result<users::Model, AuthError> {
        let fresh = users::ActiveModel {
            andrew_id: ActiveValue::Set(user.andrew_id.clone()),
            ..Default::default()
        };

        users::Entity::insert(fresh)
            .on_conflict(
                OnConflict::column(users::Column::AndrewId)
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(db_down)?;

        self.by_andrew_id(&user.andrew_id)
            .await?
            .ok_or(AuthError::Upstream("user_row_missing"))
    }

    async fn by_andrew_id(&self, andrew_id: &str) -> Result<Option<users::Model>, AuthError> {
        users::Entity::find()
            .filter(users::Column::AndrewId.eq(andrew_id))
            .one(&self.db)
            .await
            .map_err(db_down)
    }

    pub async fn row(&self, user: &SessionUser) -> Result<users::Model, AuthError> {
        match self.by_andrew_id(&user.andrew_id).await? {
            Some(row) => Ok(row),
            None => self.upsert(user).await,
        }
    }

    async fn set_dorm(&self, user: &SessionUser, dorm: Dorm) -> Result<(), AuthError> {
        let row = self.row(user).await?;

        users::ActiveModel {
            id: ActiveValue::Unchanged(row.id),
            dorm: ActiveValue::Set(Some(dorm)),
            ..Default::default()
        }
        .update(&self.db)
        .await
        .map_err(db_down)?;

        Ok(())
    }

    async fn set_anonymous(&self, user: &SessionUser, anonymous: bool) -> Result<(), AuthError> {
        let row = self.row(user).await?;

        users::ActiveModel {
            id: ActiveValue::Unchanged(row.id),
            anonymous: ActiveValue::Set(anonymous),
            ..Default::default()
        }
        .update(&self.db)
        .await
        .map_err(db_down)?;

        Ok(())
    }
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("users: {err}");
    AuthError::Upstream("database_unavailable")
}
