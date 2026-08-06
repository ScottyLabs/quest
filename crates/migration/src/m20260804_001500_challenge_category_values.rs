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
                ALTER TABLE "challenge" DROP CONSTRAINT IF EXISTS "challenge_category_check";
                ALTER TABLE "challenge"
                    ADD CONSTRAINT "challenge_category_check" CHECK ("category" IN (
                        'essentials',
                        'cool_corners',
                        'bridges',
                        'lets_eat',
                        'minor_major_general',
                        'residence_relaxation'
                    ));
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
                ALTER TABLE "challenge" DROP CONSTRAINT IF EXISTS "challenge_category_check";
                ALTER TABLE "challenge"
                    ADD CONSTRAINT "challenge_category_check" CHECK ("category" IN (
                        'placeholder_a',
                        'placeholder_b',
                        'placeholder_c'
                    ));
                "#,
            )
            .await?;
        Ok(())
    }
}
