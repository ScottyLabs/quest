use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the old trade table
        manager
            .drop_table(Table::drop().table(Trade::Table).to_owned())
            .await?;

        // Create the new transaction table
        manager
            .create_table(
                Table::create()
                    .table(Transaction::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Transaction::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Transaction::UserId).text().not_null())
                    .col(ColumnDef::new(Transaction::RewardName).text().not_null())
                    .col(ColumnDef::new(Transaction::Count).integer().not_null())
                    .col(
                        ColumnDef::new(Transaction::Timestamp)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Transaction::Status)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_transaction_user_id")
                            .from(Transaction::Table, Transaction::UserId)
                            .to(User::Table, User::UserId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_transaction_reward_name")
                            .from(Transaction::Table, Transaction::RewardName)
                            .to(Reward::Table, Reward::Name)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop transaction table
        manager
            .drop_table(Table::drop().table(Transaction::Table).to_owned())
            .await?;

        // Recreate the original trade table
        manager
            .create_table(
                Table::create()
                    .table(Trade::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Trade::UserId).text().not_null())
                    .col(ColumnDef::new(Trade::RewardName).text().not_null())
                    .col(ColumnDef::new(Trade::Timestamp).timestamp().not_null())
                    .col(ColumnDef::new(Trade::Count).integer().not_null())
                    .col(
                        ColumnDef::new(Trade::Status)
                            .string()
                            .not_null()
                            .default("incomplete"),
                    )
                    .primary_key(Index::create().col(Trade::UserId).col(Trade::RewardName))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trade_user_id")
                            .from(Trade::Table, Trade::UserId)
                            .to(User::Table, User::UserId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_trade_reward_name")
                            .from(Trade::Table, Trade::RewardName)
                            .to(Reward::Table, Reward::Name)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Transaction {
    Table,
    Id,
    UserId,
    RewardName,
    Count,
    Timestamp,
    Status,
}

#[derive(DeriveIden)]
enum Trade {
    Table,
    UserId,
    RewardName,
    Timestamp,
    Status,
    Count,
}

#[derive(DeriveIden)]
enum User {
    Table,
    UserId,
}

#[derive(DeriveIden)]
enum Reward {
    Table,
    Name,
}
