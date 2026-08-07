pub use sea_orm_migration::prelude::*;

mod m20260804_000100_initial_schema;
mod m20260806_000100_one_tap_per_challenge;
mod m20260806_000200_challenge_cards;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260804_000100_initial_schema::Migration),
            Box::new(m20260806_000100_one_tap_per_challenge::Migration),
            Box::new(m20260806_000200_challenge_cards::Migration),
        ]
    }
}
