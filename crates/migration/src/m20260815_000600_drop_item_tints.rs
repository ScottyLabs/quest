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
                    DROP CONSTRAINT IF EXISTS "items_icon_shade_check",
                    DROP CONSTRAINT IF EXISTS "items_icon_tint_check",
                    DROP COLUMN IF EXISTS "icon_shade",
                    DROP COLUMN IF EXISTS "icon_tint";
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
                    ADD COLUMN "icon_tint"  TEXT NULL,
                    ADD COLUMN "icon_shade" TEXT NULL,
                    ADD CONSTRAINT "items_icon_tint_check"
                        CHECK ("icon_tint" IS NULL OR "icon_tint" ~ '^#[0-9a-fA-F]{6}$'),
                    ADD CONSTRAINT "items_icon_shade_check"
                        CHECK ("icon_shade" IS NULL OR "icon_shade" ~ '^#[0-9a-fA-F]{6}$');
                "#,
            )
            .await?;
        Ok(())
    }
}
