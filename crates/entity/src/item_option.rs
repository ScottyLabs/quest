use sea_orm::entity::prelude::*;

use super::enums::OptionKind;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "item_option")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub item_id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub label: String,
    pub kind: OptionKind,
    pub choices: Json,
    pub required: bool,
    pub position: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::items::Entity",
        from = "Column::ItemId",
        to = "super::items::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Items,
}

impl Related<super::items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Items.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
