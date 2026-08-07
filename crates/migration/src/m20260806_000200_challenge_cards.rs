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
                CREATE TABLE "challenge_card" (
                    "card_id"      TEXT        NOT NULL PRIMARY KEY,
                    "challenge_id" UUID        NOT NULL
                        CONSTRAINT "challenge_card_challenge_id_fkey"
                        REFERENCES "challenge" ("id"),
                    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "retired_at"   TIMESTAMPTZ     NULL
                );

                CREATE INDEX "challenge_card_challenge_id_idx"
                    ON "challenge_card" ("challenge_id");

                INSERT INTO "challenge_card" ("card_id", "challenge_id")
                SELECT "card_id", "id" FROM "challenge" WHERE "card_id" IS NOT NULL;

                ALTER TABLE "tap_events" ADD COLUMN "challenge_id" UUID NULL;

                UPDATE "tap_events"
                SET "challenge_id" = "challenge"."id"
                FROM "challenge"
                WHERE "challenge"."card_id" = "tap_events"."card_id";

                DELETE FROM "tap_events" WHERE "challenge_id" IS NULL;

                ALTER TABLE "tap_events"
                    ALTER COLUMN "challenge_id" SET NOT NULL,
                    ADD CONSTRAINT "tap_events_challenge_id_fkey"
                        FOREIGN KEY ("challenge_id") REFERENCES "challenge" ("id");

                CREATE INDEX "tap_events_challenge_id_idx"
                    ON "tap_events" ("challenge_id");

                ALTER TABLE "tap_events"
                    DROP CONSTRAINT "tap_events_card_id_fkey",
                    ADD CONSTRAINT "tap_events_card_id_fkey"
                        FOREIGN KEY ("card_id") REFERENCES "challenge_card" ("card_id");

                ALTER TABLE "tap_events"
                    DROP CONSTRAINT "tap_events_user_id_card_id_key",
                    ADD CONSTRAINT "tap_events_user_id_challenge_id_key"
                        UNIQUE ("user_id", "challenge_id");

                ALTER TABLE "challenge" DROP COLUMN "card_id";
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
                ALTER TABLE "challenge" ADD COLUMN "card_id" TEXT NULL UNIQUE;

                UPDATE "challenge"
                SET "card_id" = "live"."card_id"
                FROM (
                    SELECT DISTINCT ON ("challenge_id") "challenge_id", "card_id"
                    FROM "challenge_card"
                    WHERE "retired_at" IS NULL
                    ORDER BY "challenge_id", "created_at"
                ) AS "live"
                WHERE "live"."challenge_id" = "challenge"."id";

                DELETE FROM "tap_events" AS "orphan"
                WHERE NOT EXISTS (
                    SELECT 1 FROM "challenge"
                    WHERE "challenge"."card_id" = "orphan"."card_id"
                );

                DELETE FROM "tap_events" AS "dupe"
                USING "tap_events" AS "kept"
                WHERE "dupe"."user_id" = "kept"."user_id"
                  AND "dupe"."card_id" = "kept"."card_id"
                  AND ("kept"."time", "kept"."id") < ("dupe"."time", "dupe"."id");

                ALTER TABLE "tap_events"
                    DROP CONSTRAINT "tap_events_user_id_challenge_id_key",
                    ADD CONSTRAINT "tap_events_user_id_card_id_key"
                        UNIQUE ("user_id", "card_id");

                ALTER TABLE "tap_events"
                    DROP CONSTRAINT "tap_events_card_id_fkey",
                    ADD CONSTRAINT "tap_events_card_id_fkey"
                        FOREIGN KEY ("card_id") REFERENCES "challenge" ("card_id");

                DROP INDEX "tap_events_challenge_id_idx";

                ALTER TABLE "tap_events"
                    DROP CONSTRAINT "tap_events_challenge_id_fkey",
                    DROP COLUMN "challenge_id";

                DROP TABLE "challenge_card";
                "#,
            )
            .await?;
        Ok(())
    }
}
