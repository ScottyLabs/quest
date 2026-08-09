use crate::geography::Point;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "failed_taps")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub at: DateTimeWithTimeZone,
    #[sea_orm(column_type = "Text")]
    pub reason: String,
    pub user_id: Option<Uuid>,
    #[sea_orm(column_type = "Text", nullable)]
    pub device_key: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub card_id: Option<String>,
    pub challenge_id: Option<Uuid>,
    pub counter: Option<i64>,
    #[sea_orm(column_type = "Text", nullable)]
    pub url: Option<String>,
    #[sea_orm(
        column_type = "custom(\"geography(Point, 4326)\")",
        select_as = "text",
        save_as = "geography",
        nullable
    )]
    pub location: Option<Point>,
    #[sea_orm(column_type = "Float", nullable)]
    pub accuracy: Option<f32>,
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
