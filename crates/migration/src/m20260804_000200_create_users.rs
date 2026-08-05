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
                CREATE TABLE "users" (
                    "id"         UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
                    "sub"        TEXT         NOT NULL UNIQUE,
                    "andrew_id"  VARCHAR(255) NOT NULL UNIQUE,
                    "dorm"       VARCHAR(255)     NULL
                        CONSTRAINT "users_dorm_check" CHECK ("dorm" IN (
                            'morewood',
                            'etower',
                            'whesco',
                            'mcgillboss',
                            'hammershlag',
                            'donner',
                            'stever',
                            'mudge',
                            'res'
                        )),
                    "staff"      BOOLEAN      NOT NULL DEFAULT false,
                    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now()
                );
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(r#"DROP TABLE IF EXISTS "users";"#)
            .await?;
        Ok(())
    }
}
