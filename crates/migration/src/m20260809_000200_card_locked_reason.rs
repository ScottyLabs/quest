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
                ALTER TABLE "failed_taps"
                    DROP CONSTRAINT "failed_taps_reason_check",
                    ADD CONSTRAINT "failed_taps_reason_check" CHECK ("reason" IN (
                        'tap_body_invalid',
                        'tap_url_malformed',
                        'tap_signature',
                        'card_unassigned',
                        'card_retired',
                        'card_locked',
                        'challenge_row_missing',
                        'tap_out_of_range',
                        'tap_replayed'
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
                DELETE FROM "failed_taps" WHERE "reason" = 'card_locked';

                ALTER TABLE "failed_taps"
                    DROP CONSTRAINT "failed_taps_reason_check",
                    ADD CONSTRAINT "failed_taps_reason_check" CHECK ("reason" IN (
                        'tap_body_invalid',
                        'tap_url_malformed',
                        'tap_signature',
                        'card_unassigned',
                        'card_retired',
                        'challenge_row_missing',
                        'tap_out_of_range',
                        'tap_replayed'
                    ));
                "#,
            )
            .await?;
        Ok(())
    }
}
