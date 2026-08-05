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
                CREATE TABLE "daily_challenge" (
                    "user_id"      UUID NOT NULL
                        CONSTRAINT "daily_challenge_user_id_fkey" REFERENCES "users" ("id"),
                    "challenge_id" UUID NOT NULL
                        CONSTRAINT "daily_challenge_challenge_id_fkey" REFERENCES "challenge" ("id"),
                    "day"          DATE NOT NULL,
                    CONSTRAINT "daily_challenge_pkey" PRIMARY KEY ("user_id", "day")
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "daily_challenge";"#)
            .await?;
        Ok(())
    }
}
