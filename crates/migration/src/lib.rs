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
mod m20260810_000300_seed_items;
mod m20260811_000200_staff_group;
mod m20260813_000100_leaderboard_anonymity;
mod m20260815_000100_portal_assets;
mod m20260815_000200_challenge_code;
mod m20260815_000300_item_background;
mod m20260815_000400_item_options;
mod m20260815_000500_item_tints;
mod m20260815_000600_drop_item_tints;
mod m20260816_000100_icon_shade;
mod m20260816_000200_player_flag;
mod m20260817_000100_secret_challenges;

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
            Box::new(m20260811_000200_staff_group::Migration),
            Box::new(m20260813_000100_leaderboard_anonymity::Migration),
            Box::new(m20260815_000100_portal_assets::Migration),
            Box::new(m20260815_000200_challenge_code::Migration),
            Box::new(m20260815_000300_item_background::Migration),
            Box::new(m20260815_000400_item_options::Migration),
            Box::new(m20260815_000500_item_tints::Migration),
            Box::new(m20260815_000600_drop_item_tints::Migration),
            Box::new(m20260816_000100_icon_shade::Migration),
            Box::new(m20260816_000200_player_flag::Migration),
            Box::new(m20260810_000200_seed_challenges::Migration),
            Box::new(m20260810_000300_seed_items::Migration),
            Box::new(m20260817_000100_secret_challenges::Migration),
        ]
    }
}
