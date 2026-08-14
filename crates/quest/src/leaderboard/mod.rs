pub mod routes;

use std::sync::LazyLock;

use sea_orm::prelude::Uuid;
use sea_orm::{DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::Serialize;
use utoipa::ToSchema;

use crate::auth::AuthError;
use crate::day::GEM_DAY;

const DAILY_CAP: i64 = 10;

const DAILY_BONUS: i64 = 5;

const TARGETS: [(&str, i64); 9] = [
    ("donner", 18900),
    ("etower", 15225),
    ("hammershlag", 11325),
    ("mcgillboss", 18150),
    ("morewood", 14250),
    ("mudge", 21450),
    ("res", 10875),
    ("stever", 18300),
    ("whesco", 14325),
];

static TAP_DAY: LazyLock<String> = LazyLock::new(|| {
    let (head, tail) = GEM_DAY
        .split_once("now()")
        .expect("GEM_DAY must bucket now()");

    format!(r#"{head}to_timestamp("tap_events"."time"){tail}"#)
});

static STANDINGS: LazyLock<String> = LazyLock::new(|| {
    let tap_day = TAP_DAY.as_str();

    format!(
        r#"
WITH taps AS (
    SELECT
        "tap_events"."user_id" AS "user_id",
        "tap_events"."challenge_id" AS "challenge_id",
        {tap_day} AS "day"
    FROM "tap_events"
),
capped AS (
    SELECT taps."user_id" AS "user_id", LEAST(COUNT(*), $1)::BIGINT AS "stones"
    FROM taps
    GROUP BY taps."user_id", taps."day"
),
earned AS (
    SELECT capped."user_id" AS "user_id", SUM(capped."stones")::BIGINT AS "stones"
    FROM capped
    GROUP BY capped."user_id"
),
bonus AS (
    SELECT "daily_challenge"."user_id" AS "user_id", (COUNT(*) * $2)::BIGINT AS "stones"
    FROM "daily_challenge"
    JOIN taps
        ON taps."user_id" = "daily_challenge"."user_id"
        AND taps."challenge_id" = "daily_challenge"."challenge_id"
        AND taps."day" = "daily_challenge"."day"
    GROUP BY "daily_challenge"."user_id"
),
coins AS (
    SELECT "tap_events"."user_id" AS "user_id", SUM("challenge"."coin_value")::BIGINT AS "coins"
    FROM "tap_events"
    JOIN "challenge" ON "challenge"."id" = "tap_events"."challenge_id"
    GROUP BY "tap_events"."user_id"
),
spent AS (
    SELECT "purchases"."user_id" AS "user_id",
           SUM("purchases"."quantity" * "items"."cost")::BIGINT AS "spent"
    FROM "purchases"
    JOIN "items" ON "items"."id" = "purchases"."item_id"
    GROUP BY "purchases"."user_id"
),
totals AS (
    SELECT
        "users"."id" AS "id",
        "users"."andrew_id" AS "andrew_id",
        "users"."dorm" AS "community",
        "users"."anonymous" AS "anonymous",
        (COALESCE(earned."stones", 0) + COALESCE(bonus."stones", 0))::BIGINT AS "thistlestones",
        (COALESCE(coins."coins", 0) - COALESCE(spent."spent", 0))::BIGINT AS "scottycoins"
    FROM "users"
    LEFT JOIN earned ON earned."user_id" = "users"."id"
    LEFT JOIN bonus ON bonus."user_id" = "users"."id"
    LEFT JOIN coins ON coins."user_id" = "users"."id"
    LEFT JOIN spent ON spent."user_id" = "users"."id"
),
scored AS (
    SELECT
        totals.*,
        (CASE WHEN $4 THEN totals."scottycoins" ELSE totals."thistlestones" END)::BIGINT AS "score"
    FROM totals
)
SELECT
    ROW_NUMBER() OVER (
        ORDER BY scored."score" DESC, scored."andrew_id" ASC
    )::BIGINT AS "rank",
    scored."andrew_id" AS "andrew_id",
    scored."community" AS "community",
    scored."anonymous" AS "anonymous",
    scored."thistlestones" AS "thistlestones",
    scored."score" AS "score",
    (scored."id" = $3) AS "you"
FROM scored
ORDER BY "rank"
"#
    )
});

#[derive(Copy, Clone, Debug)]
pub enum Metric {
    Gems,
    Coins,
}

impl Metric {
    pub fn parse(raw: Option<&str>) -> Self {
        match raw {
            Some("coins") => Self::Coins,
            _ => Self::Gems,
        }
    }

    fn slug(self) -> &'static str {
        match self {
            Self::Gems => "gems",
            Self::Coins => "coins",
        }
    }
}

#[derive(Debug, FromQueryResult)]
struct Standing {
    rank: i64,
    andrew_id: String,
    community: Option<String>,
    anonymous: bool,
    thistlestones: i64,
    score: i64,
    you: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Row {
    pub rank: i64,
    pub name: String,
    pub community: Option<String>,
    pub score: i64,
    pub you: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Cup {
    pub community: String,
    pub earned: i64,
    pub target: i64,
    pub percent: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct You {
    pub rank: i64,
    pub score: i64,
    pub community: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Standings {
    pub metric: &'static str,
    pub cup: Option<Cup>,
    pub you: Option<You>,
    pub rows: Vec<Row>,
}

#[derive(Clone)]
pub struct Leaderboard {
    db: DatabaseConnection,
}

impl Leaderboard {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn standings(&self, user: Uuid, metric: Metric) -> Result<Standings, AuthError> {
        let coins = matches!(metric, Metric::Coins);

        let standings = Standing::find_by_statement(Statement::from_sql_and_values(
            DbBackend::Postgres,
            STANDINGS.as_str(),
            [
                DAILY_CAP.into(),
                DAILY_BONUS.into(),
                user.into(),
                coins.into(),
            ],
        ))
        .all(&self.db)
        .await
        .map_err(db_down)?;

        let mine = standings.iter().find(|row| row.you);

        let you = mine.map(|row| You {
            rank: row.rank,
            score: row.score,
            community: row.community.clone(),
        });

        let cup = mine
            .and_then(|row| row.community.as_deref())
            .and_then(|community| {
                let earned = standings
                    .iter()
                    .filter(|row| row.community.as_deref() == Some(community))
                    .map(|row| row.thistlestones)
                    .sum();

                cup_for(community, earned)
            });

        let rows = standings
            .into_iter()
            .map(|row| Row {
                name: if row.anonymous && !row.you {
                    format!("Anonymous #{}", row.rank)
                } else {
                    row.andrew_id
                },
                rank: row.rank,
                community: row.community,
                score: row.score,
                you: row.you,
            })
            .collect();

        Ok(Standings {
            metric: metric.slug(),
            cup,
            you,
            rows,
        })
    }
}

fn cup_for(community: &str, earned: i64) -> Option<Cup> {
    let target = TARGETS
        .iter()
        .find_map(|&(slug, target)| (slug == community).then_some(target))?;

    let percent = if target > 0 {
        (earned as f64 / target as f64 * 10_000.0).round() / 100.0
    } else {
        0.0
    };

    Some(Cup {
        community: community.to_owned(),
        earned,
        target,
        percent,
    })
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("leaderboard: {err}");
    AuthError::Upstream("database_unavailable")
}
