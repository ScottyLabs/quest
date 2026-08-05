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
                CREATE TABLE "devices" (
                    "secure_key" TEXT        NOT NULL PRIMARY KEY,
                    "user_id"    UUID        NOT NULL
                        CONSTRAINT "devices_user_id_fkey" REFERENCES "users" ("id"),
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "devices";"#)
            .await?;
        Ok(())
    }
}
