use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "asset")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub key: String,
    #[sea_orm(column_type = "Text")]
    pub url: String,
    #[sea_orm(column_type = "Text")]
    pub kind: String,
    #[sea_orm(column_type = "Text")]
    pub content_type: String,
    pub bytes: i64,
    #[sea_orm(column_type = "Text", nullable)]
    pub filename: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub uploaded_by: String,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
