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
                ALTER TABLE "tap_events"
                    ADD COLUMN "accuracy" REAL NULL,
                    ADD CONSTRAINT "tap_events_accuracy_check"
                    CHECK ("accuracy" IS NULL
                           OR ("accuracy" >= 0 AND "location" IS NOT NULL));
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE "tap_events"
                    DROP CONSTRAINT IF EXISTS "tap_events_accuracy_check",
                    DROP COLUMN IF EXISTS "accuracy";
                "#,
            )
            .await?;
        Ok(())
    }
}
