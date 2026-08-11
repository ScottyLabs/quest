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
                ALTER TABLE "users" DROP COLUMN "staff";

                ALTER TABLE "challenge_card"
                    ADD COLUMN "location" geography(Point, 4326) NULL;
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
                ALTER TABLE "challenge_card" DROP COLUMN "location";

                ALTER TABLE "users"
                    ADD COLUMN "staff" BOOLEAN NOT NULL DEFAULT false;
                "#,
            )
            .await?;
        Ok(())
    }
}
