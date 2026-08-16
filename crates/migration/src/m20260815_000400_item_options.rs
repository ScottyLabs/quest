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
                CREATE TABLE "item_option" (
                    "id"       UUID    NOT NULL PRIMARY KEY,
                    "item_id"  UUID    NOT NULL
                        CONSTRAINT "item_option_item_id_fkey"
                        REFERENCES "items" ("id") ON DELETE CASCADE,
                    "label"    TEXT    NOT NULL,
                    "kind"     VARCHAR(255) NOT NULL,
                    "choices"  JSONB   NOT NULL DEFAULT '[]'::jsonb,
                    "required" BOOLEAN NOT NULL DEFAULT true,
                    "position" INTEGER NOT NULL,
                    CONSTRAINT "item_option_kind_check"
                        CHECK ("kind" IN ('select', 'dropdown', 'text')),
                    CONSTRAINT "item_option_label_check"
                        CHECK (length(btrim("label")) > 0),
                    CONSTRAINT "item_option_choices_check"
                        CHECK (jsonb_typeof("choices") = 'array'),
                    CONSTRAINT "item_option_choices_needed_check"
                        CHECK ("kind" = 'text' OR jsonb_array_length("choices") > 0),
                    CONSTRAINT "item_option_item_id_position_key"
                        UNIQUE ("item_id", "position")
                );

                CREATE INDEX "item_option_item_id_idx" ON "item_option" ("item_id");

                CREATE TABLE "purchase_option" (
                    "purchase_id" BIGINT  NOT NULL
                        CONSTRAINT "purchase_option_purchase_id_fkey"
                        REFERENCES "purchases" ("purchase_id") ON DELETE CASCADE,
                    "position"    INTEGER NOT NULL,
                    "label"       TEXT    NOT NULL,
                    "value"       TEXT    NOT NULL,
                    PRIMARY KEY ("purchase_id", "position")
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
                DROP TABLE "purchase_option";
                DROP TABLE "item_option";
                "#,
            )
            .await?;
        Ok(())
    }
}
