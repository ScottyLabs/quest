use crate::enums::Dorm;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub andrew_id: String,
    pub dorm: Option<Dorm>,
    pub staff: bool,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::daily_challenge::Entity")]
    DailyChallenge,
    #[sea_orm(has_many = "super::devices::Entity")]
    Devices,
    #[sea_orm(has_many = "super::purchases::Entity")]
    Purchases,
    #[sea_orm(has_many = "super::tap_events::Entity")]
    TapEvents,
}

impl Related<super::daily_challenge::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::DailyChallenge.def()
    }
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl Related<super::purchases::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Purchases.def()
    }
}

impl Related<super::tap_events::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TapEvents.def()
    }
}

impl Related<super::challenge::Entity> for Entity {
    fn to() -> RelationDef {
        super::daily_challenge::Relation::Challenge.def()
    }
    fn via() -> Option<RelationDef> {
        Some(super::daily_challenge::Relation::Users.def().rev())
    }
}

impl ActiveModelBehavior for ActiveModel {}
