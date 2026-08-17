use crate::{enums::ChallengeCategory, geography::Point};
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "challenge")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub name: String,
    #[sea_orm(column_type = "Text")]
    pub tagline: String,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    pub category: ChallengeCategory,
    #[sea_orm(
        column_type = "custom(\"geography(Point, 4326)\")",
        select_as = "text",
        save_as = "geography",
        nullable
    )]
    pub location: Option<Point>,
    pub secret: bool,
    pub coin_value: i64,
    #[sea_orm(column_type = "Text", nullable, unique)]
    pub code: Option<String>,
    pub open_from: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::challenge_card::Entity")]
    ChallengeCard,
    #[sea_orm(has_many = "super::daily_challenge::Entity")]
    DailyChallenge,
    #[sea_orm(has_many = "super::tap_events::Entity")]
    TapEvents,
}

impl Related<super::challenge_card::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ChallengeCard.def()
    }
}

impl Related<super::daily_challenge::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::DailyChallenge.def()
    }
}

impl Related<super::tap_events::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TapEvents.def()
    }
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        super::daily_challenge::Relation::Users.def()
    }
    fn via() -> Option<RelationDef> {
        Some(super::daily_challenge::Relation::Challenge.def().rev())
    }
}

impl ActiveModelBehavior for ActiveModel {}
