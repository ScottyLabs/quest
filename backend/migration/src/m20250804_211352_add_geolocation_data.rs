use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Challenges::Table)
                    .add_column(ColumnDef::new(Challenges::Latitude).double().null())
                    .add_column(ColumnDef::new(Challenges::Longitude).double().null())
                    .add_column(
                        ColumnDef::new(Challenges::LocationAccuracy)
                            .decimal_len(8, 2)
                            .null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Challenges::Table)
                    .drop_column(Challenges::Latitude)
                    .drop_column(Challenges::Longitude)
                    .drop_column(Challenges::LocationAccuracy)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Challenges {
    Table,
    Latitude,
    Longitude,
    LocationAccuracy,
}
