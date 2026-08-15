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
                ALTER TABLE "challenge" ADD COLUMN "code" TEXT;

                ALTER TABLE "challenge"
                    ADD CONSTRAINT "challenge_code_check"
                    CHECK ("code" IS NULL OR "code" ~ '^[A-Z]{2}[0-9]{2}$');

                CREATE UNIQUE INDEX "challenge_code_key" ON "challenge" ("code");
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
                DROP INDEX "challenge_code_key";
                ALTER TABLE "challenge" DROP CONSTRAINT "challenge_code_check";
                ALTER TABLE "challenge" DROP COLUMN "code";
                "#,
            )
            .await?;
        Ok(())
    }
}
