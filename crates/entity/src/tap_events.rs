use crate::geography::Point;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "tap_events")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    #[sea_orm(column_type = "Text", unique_key = "tap_events_card_id_counter_key")]
    pub card_id: String,
    #[sea_orm(unique_key = "tap_events_card_id_counter_key")]
    pub counter: i64,
    pub time: i64,
    #[sea_orm(
        column_type = "custom(\"geography(Point, 4326)\")",
        select_as = "text",
        save_as = "geography"
    )]
    pub location: Point,
    pub user_id: Uuid,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::challenge::Entity",
        from = "Column::CardId",
        to = "super::challenge::Column::CardId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Challenge,
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Users,
}

impl Related<super::challenge::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Challenge.def()
    }
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
