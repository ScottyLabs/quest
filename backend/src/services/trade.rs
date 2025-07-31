use crate::entities::{prelude::*, reward, trade};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, JoinType,
    QueryFilter, QuerySelect, RelationTrait, sea_query::Expr,
};
use std::collections::HashMap;

#[derive(Clone)]
pub struct TradeService {
    db: DatabaseConnection,
}

impl TradeService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_trade(
        &self,
        user_id: &str,
        reward_name: &str,
        count: i32,
    ) -> Result<trade::Model, sea_orm::DbErr> {
        let new_trade = trade::ActiveModel {
            user_id: Set(user_id.to_string()),
            reward_name: Set(reward_name.to_string()),
            timestamp: Set(Utc::now().naive_utc()),
            count: Set(count),
        };

        new_trade.insert(&self.db).await
    }

    // Get trade counts for a user (map of reward_name -> total_count)
    pub async fn get_user_trade_counts(
        &self,
        user_id: &str,
    ) -> Result<HashMap<String, i32>, sea_orm::DbErr> {
        let trades = Trade::find()
            .filter(trade::Column::UserId.eq(user_id))
            .all(&self.db)
            .await?;

        Ok(trades
            .into_iter()
            .map(|t| (t.reward_name, t.count))
            .collect())
    }

    // Get total coins spent by user
    pub async fn get_user_total_coins_spent(&self, user_id: &str) -> Result<i32, sea_orm::DbErr> {
        let trades_with_costs = Trade::find()
            .filter(trade::Column::UserId.eq(user_id))
            .join(JoinType::InnerJoin, trade::Relation::Reward.def())
            .select_only()
            .column_as(
                Expr::col(reward::Column::Cost).mul(Expr::col(trade::Column::Count)),
                "total_cost",
            )
            .into_tuple::<i32>()
            .all(&self.db)
            .await?;

        Ok(trades_with_costs.into_iter().sum())
    }
}
