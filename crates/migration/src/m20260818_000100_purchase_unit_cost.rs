use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Purchases {
    Table,
    UnitCost,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Purchases::Table)
                    .add_column(ColumnDef::new(Purchases::UnitCost).big_integer())
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
UPDATE "purchases" AS p
SET "unit_cost" = i."cost"
FROM "items" AS i
WHERE p."item_id" = i."id"
"#,
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
ALTER TABLE "purchases"
ALTER COLUMN "unit_cost" SET NOT NULL
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Purchases::Table)
                    .drop_column(Purchases::UnitCost)
                    .to_owned(),
            )
            .await
    }
}
