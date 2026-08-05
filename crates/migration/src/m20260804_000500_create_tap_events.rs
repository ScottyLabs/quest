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
                CREATE TABLE "tap_events" (
                    "id"       BIGINT                 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    "card_id"  TEXT                   NOT NULL
                        CONSTRAINT "tap_events_card_id_fkey" REFERENCES "challenge" ("card_id"),
                    "counter"  BIGINT                 NOT NULL,
                    "time"     BIGINT                 NOT NULL,
                    "location" geography(Point, 4326) NOT NULL,
                    "user_id"  UUID                   NOT NULL
                        CONSTRAINT "tap_events_user_id_fkey" REFERENCES "users" ("id"),
                    CONSTRAINT "tap_events_card_id_counter_key" UNIQUE ("card_id", "counter")
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "tap_events";"#)
            .await?;
        Ok(())
    }
}
