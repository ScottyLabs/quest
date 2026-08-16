use sea_orm::entity::prelude::*;

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(255))")]
pub enum Dorm {
    #[sea_orm(string_value = "morewood")]
    Morewood,
    #[sea_orm(string_value = "etower")]
    Etower,
    #[sea_orm(string_value = "whesco")]
    Whesco,
    #[sea_orm(string_value = "mcgillboss")]
    Mcgillboss,
    #[sea_orm(string_value = "hammershlag")]
    Hammershlag,
    #[sea_orm(string_value = "donner")]
    Donner,
    #[sea_orm(string_value = "stever")]
    Stever,
    #[sea_orm(string_value = "mudge")]
    Mudge,
    #[sea_orm(string_value = "res")]
    Res,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(255))")]
pub enum ChallengeCategory {
    #[sea_orm(string_value = "essentials")]
    Essentials,
    #[sea_orm(string_value = "cool_corners")]
    CoolCorners,
    #[sea_orm(string_value = "bridges")]
    Bridges,
    #[sea_orm(string_value = "lets_eat")]
    LetsEat,
    #[sea_orm(string_value = "minor_major_general")]
    MinorMajorGeneral,
    #[sea_orm(string_value = "residence_relaxation")]
    ResidenceAndRelaxation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(255))")]
pub enum OptionKind {
    #[sea_orm(string_value = "select")]
    Select,
    #[sea_orm(string_value = "dropdown")]
    Dropdown,
    #[sea_orm(string_value = "text")]
    Text,
}
