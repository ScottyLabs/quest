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
                CREATE TABLE "failed_taps" (
                    "id"           BIGINT      NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    "at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "reason"       TEXT        NOT NULL
                        CONSTRAINT "failed_taps_reason_check" CHECK ("reason" IN (
                            'tap_body_invalid',
                            'tap_url_malformed',
                            'tap_signature',
                            'card_unassigned',
                            'card_retired',
                            'challenge_row_missing',
                            'tap_out_of_range',
                            'tap_replayed'
                        )),
                    "user_id"      UUID            NULL
                        CONSTRAINT "failed_taps_user_id_fkey" REFERENCES "users" ("id"),
                    "device_key"   TEXT            NULL,
                    "card_id"      TEXT            NULL,
                    "challenge_id" UUID            NULL
                        CONSTRAINT "failed_taps_challenge_id_fkey" REFERENCES "challenge" ("id"),
                    "counter"      BIGINT          NULL,
                    "url"          TEXT            NULL
                        CONSTRAINT "failed_taps_url_length" CHECK (char_length("url") <= 512),
                    "location"     geography(Point, 4326) NULL,
                    "accuracy"     REAL            NULL
                );

                COMMENT ON TABLE "failed_taps" IS
                    'Append-only audit of rejected taps. Attacker-writable: prune on a retention window.';
                COMMENT ON COLUMN "failed_taps"."card_id" IS
                    'Deliberately not a foreign key: card_unassigned means the id is absent from challenge_card.';
                COMMENT ON COLUMN "failed_taps"."device_key" IS
                    'Deliberately not a foreign key: the record must outlive device revocation.';

                CREATE INDEX "failed_taps_at_idx" ON "failed_taps" ("at" DESC);

                CREATE INDEX "failed_taps_user_id_idx" ON "failed_taps" ("user_id", "at" DESC);

                CREATE INDEX "failed_taps_card_id_idx" ON "failed_taps" ("card_id", "at" DESC)
                    WHERE "card_id" IS NOT NULL;

                CREATE INDEX "failed_taps_reason_idx" ON "failed_taps" ("reason", "at" DESC);
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
                DROP TABLE IF EXISTS "failed_taps";
                "#,
            )
            .await?;
        Ok(())
    }
}
