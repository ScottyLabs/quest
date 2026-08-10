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
                CREATE TABLE "wallet_pass" (
                    "user_id" UUID NOT NULL PRIMARY KEY
                        CONSTRAINT "wallet_pass_user_id_fkey" REFERENCES "users" ("id"),
                    "serial" TEXT NOT NULL UNIQUE,
                    "andrew_id" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "issued_at" BIGINT NOT NULL,
                    "public_key" TEXT NOT NULL,
                    "signature" TEXT NOT NULL,
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
                );

                CREATE INDEX "wallet_pass_andrew_id_idx" ON "wallet_pass" ("andrew_id");
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "wallet_pass";"#)
            .await?;
        Ok(())
    }
}
