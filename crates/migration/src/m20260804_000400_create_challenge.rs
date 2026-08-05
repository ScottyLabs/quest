use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE TABLE "challenge" (
                    "id"          UUID                     NOT NULL PRIMARY KEY,
                    "name"        TEXT                     NOT NULL,
                    "description" TEXT                     NOT NULL,
                    "card_id"     TEXT                     NOT NULL UNIQUE,
                    "category"    VARCHAR(255)             NOT NULL
                        CONSTRAINT "challenge_category_check" CHECK ("category" IN (
                            'placeholder_a',
                            'placeholder_b',
                            'placeholder_c'
                        )),
                    "location"    geography(Point, 4326)   NOT NULL,
                    "coin_value"  BIGINT                   NOT NULL
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "challenge";"#)
            .await?;
        Ok(())
    }
}
