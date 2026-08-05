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
                ALTER TABLE "items"
                    ADD COLUMN "quantity_available" BIGINT NOT NULL DEFAULT 0
                        CONSTRAINT "items_quantity_available_check"
                        CHECK ("quantity_available" >= 0);
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"ALTER TABLE "items" DROP COLUMN IF EXISTS "quantity_available";"#,
            )
            .await?;
        Ok(())
    }
}
