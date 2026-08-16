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
                    ADD COLUMN IF NOT EXISTS "icon_shade" TEXT NULL;

                ALTER TABLE "items"
                    DROP CONSTRAINT IF EXISTS "items_icon_shade_check";

                ALTER TABLE "items"
                    ADD CONSTRAINT "items_icon_shade_check"
                        CHECK ("icon_shade" IS NULL OR "icon_shade" ~ '^#[0-9a-fA-F]{6}$');
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
                ALTER TABLE "items"
                    DROP CONSTRAINT IF EXISTS "items_icon_shade_check",
                    DROP COLUMN IF EXISTS "icon_shade";
                "#,
            )
            .await?;
        Ok(())
    }
}
