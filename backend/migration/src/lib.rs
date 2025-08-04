pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_tables;
mod m20250804_211352_add_geolocation_data;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_tables::Migration),
            Box::new(m20250804_211352_add_geolocation_data::Migration),
        ]
    }
}
