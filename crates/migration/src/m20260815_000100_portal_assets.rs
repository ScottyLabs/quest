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
                CREATE TABLE "asset" (
                    "key"          TEXT PRIMARY KEY,
                    "url"          TEXT NOT NULL,
                    "kind"         TEXT NOT NULL,
                    "content_type" TEXT NOT NULL,
                    "bytes"        BIGINT NOT NULL,
                    "filename"     TEXT,
                    "uploaded_by"  TEXT NOT NULL,
                    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT "asset_bytes_check" CHECK ("bytes" >= 0)
                );

                CREATE INDEX "asset_created_at_idx" ON "asset" ("created_at" DESC);
                CREATE INDEX "asset_kind_idx" ON "asset" ("kind");
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE "asset";"#)
            .await?;
        Ok(())
    }
}
