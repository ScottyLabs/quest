use sea_orm::{ConnectionTrait, DatabaseConnection, FromQueryResult, Statement};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, FromQueryResult, Serialize, ToSchema)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub user_id: String,
    pub name: String,
    pub dorm: Option<String>,
    pub coins_earned: i64,
    pub coins_spent: i64,
    pub challenges_completed: i64,
}

#[derive(Clone)]
pub struct LeaderboardService {
    db: DatabaseConnection,
}

impl LeaderboardService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_leaderboard_page(
        &self,
        limit: u64,
        after_rank: Option<i64>,
    ) -> Result<Vec<LeaderboardEntry>, sea_orm::DbErr> {
        let after_clause = if let Some(rank) = after_rank {
            format!("AND rank > {rank}")
        } else {
            String::new()
        };

        let query = format!(
            r#"
            WITH user_stats AS (
                SELECT
                    u.user_id,
                    u.name,
                    u.dorm,
                    COALESCE(earned.total_earned, 0) as coins_earned,
                    COALESCE(spent.total_spent, 0) as coins_spent,
                    COALESCE(completed.challenge_count, 0) as challenges_completed
                FROM "user" u
                LEFT JOIN (
                    SELECT
                        c.user_id,
                        SUM(ch.scotty_coins) as total_earned
                    FROM completion c
                    JOIN challenges ch ON c.challenge_name = ch.name
                    GROUP BY c.user_id
                ) earned ON u.user_id = earned.user_id
                LEFT JOIN (
                    SELECT
                        t.user_id,
                        SUM(t.count * r.cost) as total_spent
                    FROM transaction t
                    JOIN reward r ON t.reward_name = r.name
                    GROUP BY t.user_id
                ) spent ON u.user_id = spent.user_id
                LEFT JOIN (
                    SELECT
                        user_id,
                        COUNT(*) as challenge_count
                    FROM completion
                    GROUP BY user_id
                ) completed ON u.user_id = completed.user_id
            ),
            ranked_users AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (ORDER BY (COALESCE(coins_earned, 0) - COALESCE(coins_spent, 0)) DESC, challenges_completed DESC, name ASC) as rank
                FROM user_stats
            )
            SELECT * FROM ranked_users
            WHERE 1=1 {after_clause}
            ORDER BY rank
            LIMIT {limit}
            "#
        );

        LeaderboardEntry::find_by_statement(Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            query,
        ))
        .all(&self.db)
        .await
    }

    pub async fn get_user_leaderboard_position(
        &self,
        user_id: &str,
    ) -> Result<i64, sea_orm::DbErr> {
        let query = format!(
            r#"
			WITH user_stats AS (
				SELECT
					u.user_id,
					u.name,
					u.dorm,
					COALESCE(earned.total_earned, 0) as coins_earned,
					COALESCE(spent.total_spent, 0) as coins_spent,
					COALESCE(completed.challenge_count, 0) as challenges_completed
				FROM "user" u
				LEFT JOIN (
					SELECT
						c.user_id,
						SUM(ch.scotty_coins) as total_earned
					FROM completion c
					JOIN challenges ch ON c.challenge_name = ch.name
					GROUP BY c.user_id
				) earned ON u.user_id = earned.user_id
				LEFT JOIN (
					SELECT
						t.user_id,
						SUM(t.count * r.cost) as total_spent
					FROM transaction t
					JOIN reward r ON t.reward_name = r.name
					GROUP BY t.user_id
				) spent ON u.user_id = spent.user_id
				LEFT JOIN (
					SELECT
						user_id,
						COUNT(*) as challenge_count
					FROM completion
					GROUP BY user_id
				) completed ON u.user_id = completed.user_id
			),
			ranked_users AS (
				SELECT
					user_id,
					ROW_NUMBER() OVER (
						ORDER BY
							(COALESCE(coins_earned, 0) - COALESCE(coins_spent, 0)) DESC,
							challenges_completed DESC,
							name ASC
					) as rank
				FROM user_stats
			)
			SELECT rank FROM ranked_users WHERE user_id = $1
			"#
        );

        let rank = self
            .db
            .query_one(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                query,
                vec![user_id.into()],
            ))
            .await?
            .ok_or_else(|| sea_orm::DbErr::Custom("User not found".to_string()))?
            .try_get_by_index(0)?;

        Ok(rank)
    }
}
