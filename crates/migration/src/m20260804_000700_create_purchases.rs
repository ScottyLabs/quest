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
                CREATE TABLE "purchases" (
                    "purchase_id"        BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    "user_id"            UUID   NOT NULL
                        CONSTRAINT "purchases_user_id_fkey" REFERENCES "users" ("id"),
                    "item_id"            UUID   NOT NULL
                        CONSTRAINT "purchases_item_id_fkey" REFERENCES "items" ("id"),
                    "quantity"           BIGINT NOT NULL,
                    "received_item_date" DATE       NULL
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "purchases";"#)
            .await?;
        Ok(())
    }
}
