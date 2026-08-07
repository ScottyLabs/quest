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
                DELETE FROM "tap_events" AS "dupe"
                USING "tap_events" AS "kept"
                WHERE "dupe"."user_id" = "kept"."user_id"
                  AND "dupe"."card_id" = "kept"."card_id"
                  AND ("kept"."time", "kept"."id") < ("dupe"."time", "dupe"."id");

                ALTER TABLE "tap_events"
                    ADD CONSTRAINT "tap_events_user_id_card_id_key"
                    UNIQUE ("user_id", "card_id");
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
                    DROP CONSTRAINT IF EXISTS "tap_events_user_id_card_id_key";
                "#,
            )
            .await?;
        Ok(())
    }
}
