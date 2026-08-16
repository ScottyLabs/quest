use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "purchase_option")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub purchase_id: i64,
    #[sea_orm(primary_key, auto_increment = false)]
    pub position: i32,
    #[sea_orm(column_type = "Text")]
    pub label: String,
    #[sea_orm(column_type = "Text")]
    pub value: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::purchases::Entity",
        from = "Column::PurchaseId",
        to = "super::purchases::Column::PurchaseId",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Purchases,
}

impl Related<super::purchases::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Purchases.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
