use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create user table
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(User::UserId).text().not_null().primary_key())
                    .col(ColumnDef::new(User::Dorm).text())
                    .to_owned(),
            )
            .await?;

        // Create reward table
        manager
            .create_table(
                Table::create()
                    .table(Reward::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Reward::Name).text().not_null().primary_key())
                    .col(ColumnDef::new(Reward::Slug).text().not_null())
                    .col(ColumnDef::new(Reward::Cost).integer().not_null())
                    .col(ColumnDef::new(Reward::Stock).integer().not_null())
                    .col(ColumnDef::new(Reward::TradeLimit).integer().not_null())
                    .to_owned(),
            )
            .await?;

        // Create challenges table
        manager
            .create_table(
                Table::create()
                    .table(Challenges::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Challenges::Name)
                            .text()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Challenges::Category).text().not_null())
                    .col(ColumnDef::new(Challenges::Location).text().not_null())
                    .col(ColumnDef::new(Challenges::ScottyCoins).integer().not_null())
                    .col(ColumnDef::new(Challenges::MapsLink).text().not_null())
                    .col(ColumnDef::new(Challenges::Tagline).text().not_null())
                    .col(ColumnDef::new(Challenges::Description).text().not_null())
                    .col(ColumnDef::new(Challenges::MoreInfoLink).text())
                    .col(
                        ColumnDef::new(Challenges::UnlockTimestamp)
                            .timestamp()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Challenges::Secret).text().not_null())
                    .to_owned(),
            )
            .await?;

        // Create completion table
        manager
            .create_table(
                Table::create()
                    .table(Completion::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Completion::UserId).text().not_null())
                    .col(ColumnDef::new(Completion::ChallengeName).text().not_null())
                    .col(ColumnDef::new(Completion::Timestamp).timestamp().not_null())
                    .col(ColumnDef::new(Completion::S3Link).text())
                    .col(ColumnDef::new(Completion::Note).text())
                    .primary_key(
                        Index::create()
                            .col(Completion::UserId)
                            .col(Completion::ChallengeName),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_completion_user_id")
                            .from(Completion::Table, Completion::UserId)
                            .to(User::Table, User::UserId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_completion_challenge_name")
                            .from(Completion::Table, Completion::ChallengeName)
                            .to(Challenges::Table, Challenges::Name)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create trade table
        manager
            .create_table(
                Table::create()
                    .table(Trade::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Trade::UserId).text().not_null())
                    .col(ColumnDef::new(Trade::RewardName).text().not_null())
                    .col(ColumnDef::new(Trade::Timestamp).timestamp().not_null())
                    .col(ColumnDef::new(Trade::Count).integer().not_null())
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
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Trade::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Completion::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Challenges::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Reward::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    UserId,
    Dorm,
}

#[derive(DeriveIden)]
enum Reward {
    Table,
    Name,
    Slug,
    Cost,
    Stock,
    TradeLimit,
}

#[derive(DeriveIden)]
enum Challenges {
    Table,
    Name,
    Category,
    Location,
    ScottyCoins,
    MapsLink,
    Tagline,
    Description,
    MoreInfoLink,
    UnlockTimestamp,
    Secret,
}

#[derive(DeriveIden)]
enum Completion {
    Table,
    UserId,
    ChallengeName,
    Timestamp,
    S3Link,
    Note,
}

#[derive(DeriveIden)]
enum Trade {
    Table,
    UserId,
    RewardName,
    Timestamp,
    Count,
}
