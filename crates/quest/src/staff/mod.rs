pub mod routes;

use entity::challenge_card;
use entity::geography::Point;
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, DbErr, EntityTrait,
    QueryFilter, Statement, sea_query,
};

use crate::auth::AuthError;

#[derive(Clone)]
pub struct Staff {
    db: DatabaseConnection,
}

pub struct Placement {
    pub card_id: String,
    pub challenge_id: Option<Uuid>,
    pub location: Option<Point>,
}

impl Staff {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn placement(&self, card_id: &str) -> Result<Placement, AuthError> {
        let held = challenge_card::Entity::find_by_id(card_id)
            .one(&self.db)
            .await
            .map_err(db_down)?;

        let Some(card) = held else {
            return Ok(Placement {
                card_id: card_id.to_owned(),
                challenge_id: None,
                location: None,
            });
        };

        Ok(Placement {
            location: self.located(&card.card_id).await?,
            challenge_id: card.retired_at.is_none().then_some(card.challenge_id),
            card_id: card.card_id,
        })
    }

    async fn located(&self, card_id: &str) -> Result<Option<Point>, AuthError> {
        let found = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"SELECT ST_Y("challenge"."location"::geometry) AS "lat",
          ST_X("challenge"."location"::geometry) AS "lon"
   FROM "challenge"
   JOIN "challenge_card"
     ON "challenge_card"."challenge_id" = "challenge"."id"
   WHERE "challenge_card"."card_id" = $1
     AND "challenge"."location" IS NOT NULL"#,
                [card_id.into()],
            ))
            .await
            .map_err(db_down)?;

        let Some(row) = found else {
            return Ok(None);
        };

        let lat: f64 = row.try_get("", "lat").map_err(db_down)?;
        let lon: f64 = row.try_get("", "lon").map_err(db_down)?;

        Ok(Some(Point::new(lon, lat)))
    }

    pub async fn link(&self, card_id: &str, challenge_id: Uuid) -> Result<(), AuthError> {
        let fresh = challenge_card::ActiveModel {
            card_id: ActiveValue::Set(card_id.to_owned()),
            challenge_id: ActiveValue::Set(challenge_id),
            retired_at: ActiveValue::Set(None),
            ..Default::default()
        };

        challenge_card::Entity::insert(fresh)
            .on_conflict(
                sea_query::OnConflict::column(challenge_card::Column::CardId)
                    .update_columns([
                        challenge_card::Column::ChallengeId,
                        challenge_card::Column::RetiredAt,
                    ])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(foreign_key)?;

        Ok(())
    }

    pub async fn unlink(&self, card_id: &str) -> Result<(), AuthError> {
        let hit = challenge_card::Entity::update_many()
            .filter(challenge_card::Column::CardId.eq(card_id))
            .filter(challenge_card::Column::RetiredAt.is_null())
            .col_expr(
                challenge_card::Column::RetiredAt,
                sea_query::Expr::current_timestamp(),
            )
            .exec(&self.db)
            .await
            .map_err(db_down)?;

        if hit.rows_affected == 0 {
            return Err(AuthError::NotFound("card_unassigned"));
        }

        Ok(())
    }

    pub async fn place(&self, card_id: &str, at: Point) -> Result<(), AuthError> {
        let done = self
            .db
            .execute_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"UPDATE "challenge"
                   SET "location" = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
                   WHERE "id" = (
                        SELECT "challenge_id"
                        FROM "challenge_card"
                        WHERE "card_id" = $1)"#,
                [card_id.into(), at.lon.into(), at.lat.into()],
            ))
            .await
            .map_err(db_down)?;

        if done.rows_affected() == 0 {
            return Err(AuthError::NotFound("card_unassigned"));
        }

        Ok(())
    }
}

fn foreign_key(err: DbErr) -> AuthError {
    let text = err.to_string();

    if text.contains("challenge_card_challenge_id_fkey") {
        return AuthError::NotFound("challenge_unknown");
    }

    db_down(err)
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("staff: {err}");
    AuthError::Upstream("database_unavailable")
}
