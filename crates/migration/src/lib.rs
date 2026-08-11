pub use sea_orm_migration::prelude::*;

mod m20260804_000100_initial_schema;
mod m20260806_000100_one_tap_per_challenge;
mod m20260806_000200_challenge_cards;
mod m20260806_000300_card_id_format;
mod m20260807_000100_tap_accuracy;
mod m20260809_000100_failed_taps;
mod m20260809_000200_card_locked_reason;
mod m20260810_000100_wallet_pass;
mod m20260810_000200_seed_challenges;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260804_000100_initial_schema::Migration),
            Box::new(m20260806_000100_one_tap_per_challenge::Migration),
            Box::new(m20260806_000200_challenge_cards::Migration),
            Box::new(m20260806_000300_card_id_format::Migration),
            Box::new(m20260807_000100_tap_accuracy::Migration),
            Box::new(m20260809_000100_failed_taps::Migration),
            Box::new(m20260809_000200_card_locked_reason::Migration),
            Box::new(m20260810_000100_wallet_pass::Migration),
            Box::new(m20260810_000200_seed_challenges::Migration),
        ]
    }
}
