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
                CREATE EXTENSION IF NOT EXISTS postgis;

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

                CREATE TABLE "devices" (
                    "public_key" TEXT        NOT NULL PRIMARY KEY
                        CONSTRAINT "devices_public_key_canonical"
                        CHECK ("public_key" ~ '^04[0-9a-f]{128}$'),
                    "user_id"    UUID        NOT NULL
                        CONSTRAINT "devices_user_id_fkey" REFERENCES "users" ("id"),
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "label"      TEXT            NULL
                        CONSTRAINT "devices_label_length" CHECK (char_length("label") <= 64)
                );

                CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id");

                CREATE TABLE "challenge" (
                    "id"          UUID                   NOT NULL PRIMARY KEY,
                    "name"        TEXT                   NOT NULL,
                    "tagline"     TEXT                   NOT NULL,
                    "description" TEXT                   NOT NULL,
                    "card_id"     TEXT                   NOT NULL UNIQUE,
                    "category"    VARCHAR(255)           NOT NULL
                        CONSTRAINT "challenge_category_check" CHECK ("category" IN (
                            'essentials',
                            'cool_corners',
                            'bridges',
                            'lets_eat',
                            'minor_major_general',
                            'residence_relaxation'
                        )),
                    "location"    geography(Point, 4326) NOT NULL,
                    "coin_value"  BIGINT                 NOT NULL,
                    "open_from"   TIMESTAMPTZ            NOT NULL DEFAULT now()
                );

                CREATE TABLE "tap_events" (
                    "id"       BIGINT                 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    "card_id"  TEXT                   NOT NULL
                        CONSTRAINT "tap_events_card_id_fkey" REFERENCES "challenge" ("card_id"),
                    "counter"  BIGINT                 NOT NULL,
                    "time"     BIGINT                 NOT NULL,
                    "location" geography(Point, 4326) NOT NULL,
                    "user_id"  UUID                   NOT NULL
                        CONSTRAINT "tap_events_user_id_fkey" REFERENCES "users" ("id"),
                    CONSTRAINT "tap_events_card_id_counter_key" UNIQUE ("card_id", "counter")
                );

                CREATE TABLE "items" (
                    "id"                 UUID   NOT NULL PRIMARY KEY,
                    "name"               TEXT   NOT NULL,
                    "description"        TEXT   NOT NULL,
                    "cost"               BIGINT NOT NULL,
                    "image_url"          TEXT       NULL,
                    "quantity_available" BIGINT NOT NULL DEFAULT 0
                        CONSTRAINT "items_quantity_available_check"
                        CHECK ("quantity_available" >= 0)
                );

                CREATE TABLE "purchases" (
                    "purchase_id"        BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    "user_id"            UUID   NOT NULL
                        CONSTRAINT "purchases_user_id_fkey" REFERENCES "users" ("id"),
                    "item_id"            UUID   NOT NULL
                        CONSTRAINT "purchases_item_id_fkey" REFERENCES "items" ("id"),
                    "quantity"           BIGINT NOT NULL,
                    "received_item_date" DATE       NULL
                );

                CREATE TABLE "daily_challenge" (
                    "user_id"      UUID NOT NULL
                        CONSTRAINT "daily_challenge_user_id_fkey" REFERENCES "users" ("id"),
                    "challenge_id" UUID NOT NULL
                        CONSTRAINT "daily_challenge_challenge_id_fkey" REFERENCES "challenge" ("id"),
                    "day"          DATE NOT NULL,
                    CONSTRAINT "daily_challenge_pkey" PRIMARY KEY ("user_id", "day")
                );
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
                DROP TABLE IF EXISTS "daily_challenge";
                DROP TABLE IF EXISTS "purchases";
                DROP TABLE IF EXISTS "items";
                DROP TABLE IF EXISTS "tap_events";
                DROP TABLE IF EXISTS "challenge";
                DROP TABLE IF EXISTS "devices";
                DROP TABLE IF EXISTS "users";

                DROP EXTENSION IF EXISTS postgis;
                "#,
            )
            .await?;
        Ok(())
    }
}
