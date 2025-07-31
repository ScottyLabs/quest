use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Trade::Table)
                    .add_column(
                        ColumnDef::new(Trade::Status)
                            .string()
                            .not_null()
                            .default("incomplete"),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Trade::Table)
                    .drop_column(Trade::Status)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Trade {
    Table,
    Status,
}
