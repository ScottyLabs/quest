use std::collections::HashMap;

use crate::entities::{prelude::*, reward, transaction, user};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, JoinType,
    QueryFilter, QuerySelect, RelationTrait, prelude::Expr,
};
use uuid::Uuid;

#[derive(Clone)]
pub struct TransactionService {
    db: DatabaseConnection,
}

impl TransactionService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_ccup_total_purchased(&self, user_dorm: &str) -> Result<i64, sea_orm::DbErr> {
        let total: Option<i64> = Transaction::find()
            .inner_join(User)
            .filter(transaction::Column::RewardName.eq("Carnegie Cup Contribution"))
            .filter(user::Column::Dorm.eq(user_dorm))
            .select_only()
            .column_as(transaction::Column::Count.sum(), "total")
            .into_tuple::<i64>()
            .one(&self.db)
            .await
            .inspect_err(|f| {
                eprintln!(
                    "Failed to get total purchased for Carnegie Cup Contribution: {}",
                    f
                );
            })?;

        Ok(total.unwrap_or(0))
    }

    pub async fn create_transaction(
        &self,
        user_id: &str,
        reward_name: &str,
        count: i32,
    ) -> Result<transaction::Model, sea_orm::DbErr> {
        let transaction_id = Uuid::new_v4();

        let new_transaction = transaction::ActiveModel {
            id: Set(transaction_id),
            user_id: Set(user_id.to_string()),
            reward_name: Set(reward_name.to_string()),
            timestamp: Set(Utc::now().naive_utc()),
            status: Set("pending".to_string()),
            count: Set(count),
        };
        new_transaction.insert(&self.db).await
    }

    // Get total counts for a user across all transactions (for trade limits)
    pub async fn get_user_total_counts(
        &self,
        user_id: &str,
    ) -> Result<HashMap<String, i32>, sea_orm::DbErr> {
        let transactions = Transaction::find()
            .filter(transaction::Column::UserId.eq(user_id))
            .all(&self.db)
            .await?;

        let mut totals: HashMap<String, i32> = HashMap::new();
        for transaction in transactions {
            *totals.entry(transaction.reward_name).or_insert(0) += transaction.count;
        }

        Ok(totals)
    }

    // Get total coins spent by user
    pub async fn get_user_total_coins_spent(&self, user_id: &str) -> Result<i32, sea_orm::DbErr> {
        let transactions_with_costs = Transaction::find()
            .filter(transaction::Column::UserId.eq(user_id))
            .join(JoinType::InnerJoin, transaction::Relation::Reward.def())
            .select_only()
            .column_as(
                Expr::col(reward::Column::Cost).mul(Expr::col(transaction::Column::Count)),
                "total_cost",
            )
            .into_tuple::<i32>()
            .all(&self.db)
            .await?;

        Ok(transactions_with_costs.into_iter().sum())
    }

    // Get user transactions for a specific reward (for rewards page)
    pub async fn get_user_reward_transactions(
        &self,
        user_id: &str,
        reward_name: &str,
    ) -> Result<Vec<transaction::Model>, sea_orm::DbErr> {
        Transaction::find()
            .filter(transaction::Column::UserId.eq(user_id))
            .filter(transaction::Column::RewardName.eq(reward_name))
            .all(&self.db)
            .await
    }

    // Delete a transaction (for cancellation)
    pub async fn delete_transaction(&self, transaction_id: &str) -> Result<bool, sea_orm::DbErr> {
        let uuid = Uuid::parse_str(transaction_id)
            .map_err(|_| sea_orm::DbErr::Custom("Invalid UUID".to_string()))?;

        let result = Transaction::delete_many()
            .filter(crate::entities::transaction::Column::Id.eq(uuid))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // Get transaction by ID (for admin verification)
    pub async fn get_transaction_by_id(
        &self,
        transaction_id: &str,
    ) -> Result<Option<transaction::Model>, sea_orm::DbErr> {
        let uuid = Uuid::parse_str(transaction_id)
            .map_err(|_| sea_orm::DbErr::Custom("Invalid UUID".to_string()))?;

        Transaction::find()
            .filter(transaction::Column::Id.eq(uuid))
            .one(&self.db)
            .await
    }

    // Update transaction status (for admin verification)
    pub async fn update_transaction_status(
        &self,
        transaction_id: &str,
        status: &str,
    ) -> Result<Option<transaction::Model>, sea_orm::DbErr> {
        let Some(transaction) = self.get_transaction_by_id(transaction_id).await? else {
            return Ok(None);
        };

        let mut active_transaction: transaction::ActiveModel = transaction.into();
        active_transaction.status = Set(status.to_string());

        active_transaction.update(&self.db).await.map(Some)
    }
}
