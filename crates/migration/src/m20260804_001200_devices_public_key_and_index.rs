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
                ALTER TABLE "devices" RENAME COLUMN "secure_key" TO "public_key";
                CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id");
                ALTER TABLE "devices"
                    ADD CONSTRAINT "devices_public_key_canonical"
                    CHECK ("public_key" ~ '^04[0-9a-f]{128}$');
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
                ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_public_key_canonical";
                DROP INDEX IF EXISTS "devices_user_id_idx";
                ALTER TABLE "devices" RENAME COLUMN "public_key" TO "secure_key";
                "#,
            )
            .await?;
        Ok(())
    }
}
