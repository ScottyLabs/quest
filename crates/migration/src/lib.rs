pub use sea_orm_migration::prelude::*;

mod m20260804_000100_enable_postgis;
mod m20260804_000200_create_users;
mod m20260804_000300_create_devices;
mod m20260804_000400_create_challenge;
mod m20260804_000500_create_tap_events;
mod m20260804_000600_create_items;
mod m20260804_000700_create_purchases;
mod m20260804_000800_create_daily_challenge;
mod m20260804_000900_add_challenge_open_from;
mod m20260804_001000_add_items_image_url;
mod m20260804_001100_add_items_quantity_available;
mod m20260804_001200_devices_public_key_and_index;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260804_000100_enable_postgis::Migration),
            Box::new(m20260804_000200_create_users::Migration),
            Box::new(m20260804_000300_create_devices::Migration),
            Box::new(m20260804_000400_create_challenge::Migration),
            Box::new(m20260804_000500_create_tap_events::Migration),
            Box::new(m20260804_000600_create_items::Migration),
            Box::new(m20260804_000700_create_purchases::Migration),
            Box::new(m20260804_000800_create_daily_challenge::Migration),
            Box::new(m20260804_000900_add_challenge_open_from::Migration),
            Box::new(m20260804_001000_add_items_image_url::Migration),
            Box::new(m20260804_001100_add_items_quantity_available::Migration),
            Box::new(m20260804_001200_devices_public_key_and_index::Migration),
        ]
    }
}
