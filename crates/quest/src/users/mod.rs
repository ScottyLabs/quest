pub mod routes;

use entity::enums::Dorm;
use entity::users;
use sea_orm::sea_query::{Expr, OnConflict};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait,
    QueryFilter, SqlErr,
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
            sub: ActiveValue::Set(user.sub.clone()),
            andrew_id: ActiveValue::Set(user.andrew_id.clone()),
            staff: ActiveValue::Set(user.admin),
            ..Default::default()
        };

        let inserted = users::Entity::insert(fresh)
            .on_conflict(
                OnConflict::column(users::Column::Sub)
                    .update_columns([users::Column::AndrewId, users::Column::Staff])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await;

        match inserted {
            Ok(_) => {}
            Err(err) if unique_violation(&err) => self.adopt(user).await?,
            Err(err) => return Err(db_down(err)),
        }

        self.by_sub(&user.sub)
            .await?
            .ok_or(AuthError::Upstream("user_row_missing"))
    }

    async fn adopt(&self, user: &SessionUser) -> Result<(), AuthError> {
        let moved = users::Entity::update_many()
            .col_expr(users::Column::Sub, Expr::value(user.sub.clone()))
            .col_expr(users::Column::Staff, Expr::value(user.admin))
            .filter(users::Column::AndrewId.eq(&user.andrew_id))
            .exec(&self.db)
            .await;

        match moved {
            Err(err) if unique_violation(&err) => Ok(()),
            other => other.map(|_| ()).map_err(db_down),
        }
    }

    async fn by_sub(&self, sub: &str) -> Result<Option<users::Model>, AuthError> {
        users::Entity::find()
            .filter(users::Column::Sub.eq(sub))
            .one(&self.db)
            .await
            .map_err(db_down)
    }

    pub async fn row(&self, user: &SessionUser) -> Result<users::Model, AuthError> {
        match self.by_sub(&user.sub).await? {
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
}

fn unique_violation(err: &DbErr) -> bool {
    matches!(err.sql_err(), Some(SqlErr::UniqueConstraintViolation(_)))
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("users: {err}");
    AuthError::Upstream("database_unavailable")
}
