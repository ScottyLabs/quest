use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, Eq, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "challenge_card")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub card_id: String,
    pub challenge_id: Uuid,
    pub created_at: DateTimeWithTimeZone,
    pub retired_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::challenge::Entity",
        from = "Column::ChallengeId",
        to = "super::challenge::Column::Id",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Challenge,
    #[sea_orm(has_many = "super::tap_events::Entity")]
    TapEvents,
}

impl Related<super::challenge::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Challenge.def()
    }
}

impl Related<super::tap_events::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TapEvents.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
