pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20250730_234518_store_name;
mod m20250730_234907_require_name;
mod m20250731_020813_add_trade_status;
mod m20250731_023602_replace_trade_with_transaction;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20250730_234518_store_name::Migration),
            Box::new(m20250730_234907_require_name::Migration),
            Box::new(m20250731_020813_add_trade_status::Migration),
            Box::new(m20250731_023602_replace_trade_with_transaction::Migration),
        ]
    }
}
