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
                CREATE TABLE "gemstone_correction" (
                    "user_id" UUID NOT NULL
                        CONSTRAINT "gemstone_correction_user_id_fkey"
                        REFERENCES "users" ("id")
                        ON DELETE CASCADE,
                    "day" DATE NOT NULL,
                    "target" BIGINT NOT NULL
                        CONSTRAINT "gemstone_correction_target_check"
                        CHECK ("target" BETWEEN 1 AND 15),
                    "reason" TEXT NOT NULL
                        CONSTRAINT "gemstone_correction_reason_check"
                        CHECK (
                            char_length(trim("reason")) BETWEEN 1 AND 200
                        ),
                    "changed_by" TEXT NOT NULL,
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

                    CONSTRAINT "gemstone_correction_pkey"
                    PRIMARY KEY ("user_id", "day")
                );

                CREATE INDEX "gemstone_correction_day_idx"
                    ON "gemstone_correction" ("day");
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
                DROP TABLE IF EXISTS "gemstone_correction";
                "#,
            )
            .await?;

        Ok(())
    }
}
