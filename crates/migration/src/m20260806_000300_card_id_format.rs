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
                ALTER TABLE "challenge_card"
                    ADD CONSTRAINT "challenge_card_card_id_canonical"
                    CHECK ("card_id" ~ '^[0-9A-F]{14}$');
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
                ALTER TABLE "challenge_card"
                    DROP CONSTRAINT IF EXISTS "challenge_card_card_id_canonical";
                "#,
            )
            .await?;
        Ok(())
    }
}
