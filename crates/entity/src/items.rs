use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "items")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub name: String,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    pub cost: i64,
    #[sea_orm(column_type = "Text", nullable)]
    pub image_url: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub background_url: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub icon_shade: Option<String>,
    pub quantity_available: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::purchases::Entity")]
    Purchases,
}

impl Related<super::purchases::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Purchases.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
