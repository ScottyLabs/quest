pub mod assets;
pub mod routes;
pub mod script;
pub mod serve;
pub mod trade;

use std::sync::Arc;

use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, Statement, TransactionTrait};
use serde::{Deserialize, Serialize};
use serde_json::Value as Json;
use tokio::sync::RwLock;
use utoipa::ToSchema;

use crate::auth::AuthError;

use self::script::{Script, Step};

const CONSOLE_ROW_CAP: u64 = 2_000;

const PAGE_CAP: u64 = 200;

const STATEMENT_TIMEOUT: &str = "15s";

const MAX_STATEMENTS: usize = 500;

const CATALOG: &str = r#"
SELECT c.relname                                     AS "table",
       a.attname                                     AS "column",
       format_type(a.atttypid, a.atttypmod)          AS "kind",
       NOT a.attnotnull                              AS "nullable",
       pg_get_expr(d.adbin, d.adrelid)               AS "default_expr",
       (a.attidentity <> '' OR a.attgenerated <> '') AS "generated",
       COALESCE(k.ord, 0)::int4                      AS "key"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
LEFT JOIN (
    SELECT con.conrelid, u.att, u.ord
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u(att, ord)
    WHERE con.contype = 'p'
) k ON k.conrelid = c.oid AND k.att = a.attnum
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname, a.attnum
"#;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Column {
    pub name: String,
    pub kind: String,
    pub nullable: bool,
    pub default_expr: Option<String>,
    pub generated: bool,
    pub key: i32,
}

impl Column {
    fn spatial(&self) -> bool {
        self.kind.starts_with("geography") || self.kind.starts_with("geometry")
    }

    fn readable(&self) -> String {
        let name = quote(&self.name);

        if self.spatial() {
            format!("ST_AsText({name})::text")
        } else {
            format!("{name}::text")
        }
    }

    fn select(&self) -> String {
        let name = quote(&self.name);

        if self.spatial() {
            format!("ST_AsText({name})::text AS {name}")
        } else {
            name
        }
    }

    fn writable(&self) -> bool {
        !self.generated
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
}

impl Table {
    fn column(&self, name: &str) -> Result<&Column, PortalError> {
        self.columns
            .iter()
            .find(|column| column.name == name)
            .ok_or_else(|| PortalError::Sql(format!("no column {name:?} on {:?}", self.name)))
    }

    pub fn key(&self) -> Vec<&Column> {
        let mut key: Vec<&Column> = self.columns.iter().filter(|c| c.key > 0).collect();
        key.sort_by_key(|column| column.key);
        key
    }

    fn select_list(&self) -> String {
        self.columns
            .iter()
            .map(Column::select)
            .collect::<Vec<_>>()
            .join(", ")
    }
}

#[derive(Debug, Default)]
pub struct Catalog {
    tables: Vec<Table>,
}

impl Catalog {
    pub fn tables(&self) -> &[Table] {
        &self.tables
    }

    pub fn table(&self, name: &str) -> Result<&Table, PortalError> {
        self.tables
            .iter()
            .find(|table| table.name == name)
            .ok_or(PortalError::Auth(AuthError::NotFound("table_unknown")))
    }
}

#[derive(Clone)]
pub struct Portal {
    db: DatabaseConnection,
    catalog: Arc<RwLock<Option<Arc<Catalog>>>>,
}

#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct Browse {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
    pub order: Option<String>,
    pub desc: Option<bool>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Page {
    pub table: String,
    pub columns: Vec<Column>,
    pub key: Vec<String>,
    pub rows: Vec<Json>,
    pub total: i64,
    pub limit: u64,
    pub offset: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Outcome {
    pub columns: Vec<String>,
    pub rows: Vec<Json>,
    pub rows_affected: u64,
    pub read_only: bool,
    pub elapsed_ms: u64,
    pub truncated: bool,
}

#[derive(Debug, PartialEq, Eq)]
enum Shape {
    Rows,
    Plan,
    Count,
}

#[derive(Debug)]
pub enum PortalError {
    Auth(AuthError),
    Sql(String),
}

#[derive(Serialize, ToSchema)]
pub struct PortalErrBody {
    pub error: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl From<AuthError> for PortalError {
    fn from(err: AuthError) -> Self {
        Self::Auth(err)
    }
}

impl axum::response::IntoResponse for PortalError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Auth(err) => err.into_response(),
            Self::Sql(detail) => (
                axum::http::StatusCode::BAD_REQUEST,
                axum::Json(PortalErrBody {
                    error: "sql_failed",
                    detail: Some(detail),
                }),
            )
                .into_response(),
        }
    }
}

fn sql_failed(err: DbErr) -> PortalError {
    let text = err.to_string();
    let detail = text
        .split_once("error returned from database: ")
        .map_or(text.as_str(), |(_, rest)| rest)
        .trim()
        .to_owned();

    PortalError::Sql(detail)
}

fn db_down(err: DbErr) -> PortalError {
    eprintln!("portal: {err}");
    PortalError::Auth(AuthError::Upstream("database_unavailable"))
}

fn quote(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn parameter(value: &Json, kind: &str) -> Option<String> {
    match value {
        Json::Null => None,
        Json::String(text) => Some(text.clone()),
        Json::Bool(flag) => Some(flag.to_string()),
        Json::Number(number) => Some(number.to_string()),
        Json::Array(items) if kind.ends_with("[]") => Some(pg_array(items)),
        other => Some(other.to_string()),
    }
}

fn pg_array(items: &[Json]) -> String {
    let mut out = String::from("{");

    for (position, item) in items.iter().enumerate() {
        if position > 0 {
            out.push(',');
        }

        match item {
            Json::Null => out.push_str("NULL"),
            Json::String(text) => {
                out.push('"');
                for character in text.chars() {
                    if character == '"' || character == '\\' {
                        out.push('\\');
                    }
                    out.push(character);
                }
                out.push('"');
            }
            other => out.push_str(&other.to_string()),
        }
    }

    out.push('}');
    out
}

fn leading_keyword(sql: &str) -> String {
    let mut rest = sql.trim_start();

    loop {
        if let Some(tail) = rest.strip_prefix("--") {
            rest = tail
                .split_once('\n')
                .map_or("", |(_, tail)| tail)
                .trim_start();
            continue;
        }

        if let Some(tail) = rest.strip_prefix("/*") {
            rest = tail
                .split_once("*/")
                .map_or("", |(_, tail)| tail)
                .trim_start();
            continue;
        }

        break;
    }

    rest.split(|c: char| !c.is_ascii_alphabetic())
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase()
}

fn shape_of(sql: &str) -> Shape {
    match leading_keyword(sql).as_str() {
        "select" | "with" | "table" | "values" => Shape::Rows,
        "explain" => Shape::Plan,
        _ => Shape::Count,
    }
}

fn rows_of(aggregate: Json) -> Vec<Json> {
    match aggregate {
        Json::Array(rows) => rows,
        Json::Null => Vec::new(),
        single => vec![single],
    }
}

fn columns_of(rows: &[Json]) -> Vec<String> {
    rows.first()
        .and_then(Json::as_object)
        .map(|row| row.keys().cloned().collect())
        .unwrap_or_default()
}

impl Portal {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            catalog: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn catalog(&self) -> Result<Arc<Catalog>, PortalError> {
        if let Some(cached) = self.catalog.read().await.clone() {
            return Ok(cached);
        }

        self.refresh().await
    }

    pub async fn refresh(&self) -> Result<Arc<Catalog>, PortalError> {
        let rows = self
            .db
            .query_all_raw(Statement::from_string(DbBackend::Postgres, CATALOG))
            .await
            .map_err(db_down)?;

        let mut tables: Vec<Table> = Vec::new();

        for row in rows {
            let table: String = row.try_get("", "table").map_err(db_down)?;
            let column = Column {
                name: row.try_get("", "column").map_err(db_down)?,
                kind: row.try_get("", "kind").map_err(db_down)?,
                nullable: row.try_get("", "nullable").map_err(db_down)?,
                default_expr: row.try_get("", "default_expr").map_err(db_down)?,
                generated: row.try_get("", "generated").map_err(db_down)?,
                key: row.try_get("", "key").map_err(db_down)?,
            };

            match tables.last_mut() {
                Some(last) if last.name == table => last.columns.push(column),
                _ => tables.push(Table {
                    name: table,
                    columns: vec![column],
                }),
            }
        }

        let catalog = Arc::new(Catalog { tables });
        *self.catalog.write().await = Some(Arc::clone(&catalog));
        Ok(catalog)
    }

    pub async fn user_id(&self, andrew_id: &str) -> Result<sea_orm::prelude::Uuid, PortalError> {
        let found = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"SELECT "id" FROM "users" WHERE "andrew_id" = $1"#,
                [andrew_id.into()],
            ))
            .await
            .map_err(db_down)?;

        found
            .ok_or(PortalError::Auth(AuthError::NotFound("user_unknown")))?
            .try_get("", "id")
            .map_err(db_down)
    }

    pub async fn rows(&self, table: &Table, browse: &Browse) -> Result<Page, PortalError> {
        let name = format!("\"public\".{}", quote(&table.name));
        let limit = browse.limit.unwrap_or(50).clamp(1, PAGE_CAP);
        let offset = browse.offset.unwrap_or(0);

        let search = browse
            .search
            .as_deref()
            .map(str::trim)
            .filter(|needle| !needle.is_empty());

        let filter = match search {
            Some(_) => {
                let clauses = table
                    .columns
                    .iter()
                    .map(|column| format!("{} ILIKE $1", column.readable()))
                    .collect::<Vec<_>>()
                    .join(" OR ");

                format!(" WHERE ({clauses})")
            }
            None => String::new(),
        };

        let values: Vec<sea_orm::Value> = search
            .map(|needle| vec![format!("%{needle}%").into()])
            .unwrap_or_default();

        let order = match browse.order.as_deref() {
            Some(wanted) => vec![table.column(wanted)?],
            None => table.key(),
        };

        let ordering = if order.is_empty() {
            String::new()
        } else {
            let direction = if browse.desc.unwrap_or(false) {
                "DESC"
            } else {
                "ASC"
            };
            let columns = order
                .iter()
                .map(|column| format!("{} {direction}", quote(&column.name)))
                .collect::<Vec<_>>()
                .join(", ");

            format!(" ORDER BY {columns}")
        };

        let total = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                format!("SELECT count(*)::bigint AS \"total\" FROM {name}{filter}"),
                values.clone(),
            ))
            .await
            .map_err(sql_failed)?
            .ok_or_else(|| PortalError::Sql("count returned nothing".to_owned()))?
            .try_get::<i64>("", "total")
            .map_err(db_down)?;

        let page = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                format!(
                    "SELECT coalesce(json_agg(row_to_json(_page)), '[]'::json) AS \"rows\" \
                     FROM (SELECT {select} FROM {name}{filter}{ordering} \
                     LIMIT {limit} OFFSET {offset}) AS _page",
                    select = table.select_list(),
                ),
                values,
            ))
            .await
            .map_err(sql_failed)?
            .ok_or_else(|| PortalError::Sql("page returned nothing".to_owned()))?
            .try_get::<Json>("", "rows")
            .map_err(db_down)?;

        Ok(Page {
            table: table.name.clone(),
            columns: table.columns.clone(),
            key: table.key().iter().map(|c| c.name.clone()).collect(),
            rows: rows_of(page),
            total,
            limit,
            offset,
        })
    }

    pub async fn insert(
        &self,
        table: &Table,
        values: &serde_json::Map<String, Json>,
    ) -> Result<Vec<Json>, PortalError> {
        if values.is_empty() {
            return Err(PortalError::Auth(AuthError::BadRequest("row_empty")));
        }

        let mut names = Vec::with_capacity(values.len());
        let mut casts = Vec::with_capacity(values.len());
        let mut bound: Vec<sea_orm::Value> = Vec::with_capacity(values.len());

        for (name, value) in values {
            let column = table.column(name)?;

            if !column.writable() {
                return Err(PortalError::Sql(format!(
                    "{name:?} is generated by the database"
                )));
            }

            names.push(quote(name));
            casts.push(format!("${}::{}", bound.len() + 1, column.kind));
            bound.push(parameter(value, &column.kind).into());
        }

        let sql = format!(
            "WITH _written AS (INSERT INTO \"public\".{table_name} ({columns}) \
             VALUES ({placeholders}) RETURNING *) \
             SELECT coalesce(json_agg(row_to_json(_row)), '[]'::json) AS \"rows\" \
             FROM (SELECT {select} FROM _written) AS _row",
            table_name = quote(&table.name),
            columns = names.join(", "),
            placeholders = casts.join(", "),
            select = table.select_list(),
        );

        self.written(sql, bound).await
    }

    pub async fn update(
        &self,
        table: &Table,
        key: &serde_json::Map<String, Json>,
        set: &serde_json::Map<String, Json>,
    ) -> Result<Vec<Json>, PortalError> {
        if set.is_empty() {
            return Err(PortalError::Auth(AuthError::BadRequest("row_empty")));
        }

        let mut bound: Vec<sea_orm::Value> = Vec::with_capacity(set.len() + key.len());
        let mut assignments = Vec::with_capacity(set.len());

        for (name, value) in set {
            let column = table.column(name)?;

            if !column.writable() {
                return Err(PortalError::Sql(format!(
                    "{name:?} is generated by the database"
                )));
            }

            assignments.push(format!(
                "{} = ${}::{}",
                quote(name),
                bound.len() + 1,
                column.kind
            ));
            bound.push(parameter(value, &column.kind).into());
        }

        let filter = self.key_filter(table, key, &mut bound)?;

        let sql = format!(
            "WITH _written AS (UPDATE \"public\".{table_name} SET {assignments} \
             WHERE {filter} RETURNING *) \
             SELECT coalesce(json_agg(row_to_json(_row)), '[]'::json) AS \"rows\" \
             FROM (SELECT {select} FROM _written) AS _row",
            table_name = quote(&table.name),
            assignments = assignments.join(", "),
            select = table.select_list(),
        );

        self.written(sql, bound).await
    }

    pub async fn delete(
        &self,
        table: &Table,
        key: &serde_json::Map<String, Json>,
    ) -> Result<Vec<Json>, PortalError> {
        let mut bound: Vec<sea_orm::Value> = Vec::with_capacity(key.len());
        let filter = self.key_filter(table, key, &mut bound)?;

        let sql = format!(
            "WITH _written AS (DELETE FROM \"public\".{table_name} WHERE {filter} RETURNING *) \
             SELECT coalesce(json_agg(row_to_json(_row)), '[]'::json) AS \"rows\" \
             FROM (SELECT {select} FROM _written) AS _row",
            table_name = quote(&table.name),
            select = table.select_list(),
        );

        self.written(sql, bound).await
    }

    fn key_filter(
        &self,
        table: &Table,
        key: &serde_json::Map<String, Json>,
        bound: &mut Vec<sea_orm::Value>,
    ) -> Result<String, PortalError> {
        let expected = table.key();

        if expected.is_empty() {
            return Err(PortalError::Sql(format!(
                "{:?} has no primary key, so rows cannot be addressed",
                table.name
            )));
        }

        let mut clauses = Vec::with_capacity(expected.len());

        for column in expected {
            let Some(value) = key.get(&column.name) else {
                return Err(PortalError::Auth(AuthError::BadRequest("key_incomplete")));
            };

            clauses.push(format!(
                "{} = ${}::{}",
                quote(&column.name),
                bound.len() + 1,
                column.kind
            ));
            bound.push(parameter(value, &column.kind).into());
        }

        Ok(clauses.join(" AND "))
    }

    async fn written(
        &self,
        sql: String,
        bound: Vec<sea_orm::Value>,
    ) -> Result<Vec<Json>, PortalError> {
        let row = self
            .db
            .query_one_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                sql,
                bound,
            ))
            .await
            .map_err(sql_failed)?
            .ok_or_else(|| PortalError::Sql("write returned nothing".to_owned()))?;

        Ok(rows_of(row.try_get::<Json>("", "rows").map_err(db_down)?))
    }

    async fn open(&self, write: bool) -> Result<sea_orm::DatabaseTransaction, PortalError> {
        let txn = self.db.begin().await.map_err(db_down)?;

        if !write {
            txn.execute_raw(Statement::from_string(
                DbBackend::Postgres,
                "SET TRANSACTION READ ONLY",
            ))
            .await
            .map_err(db_down)?;
        }

        txn.execute_raw(Statement::from_string(
            DbBackend::Postgres,
            format!("SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT}'"),
        ))
        .await
        .map_err(db_down)?;

        Ok(txn)
    }

    pub async fn console(&self, sql: &str, write: bool) -> Result<Outcome, PortalError> {
        let sql = sql.trim().trim_end_matches(';').trim();

        if sql.is_empty() {
            return Err(PortalError::Auth(AuthError::BadRequest("sql_empty")));
        }

        let count = script::split(sql).len();
        if count > 1 {
            return Err(PortalError::Sql(format!(
                "this is {count} statements, and Run sends one at a time. \
                 Use Run script to execute them in order as a single transaction."
            )));
        }

        let shape = shape_of(sql);
        let started = std::time::Instant::now();
        let txn = self.open(write).await?;

        let mut outcome = match run(&txn, sql, write).await {
            Ok(outcome) => outcome,
            Err(err) => {
                txn.rollback().await.ok();
                return Err(err);
            }
        };

        txn.commit().await.map_err(sql_failed)?;

        outcome.elapsed_ms = started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64;

        if shape == Shape::Count && write {
            self.refresh().await.ok();
        }

        Ok(outcome)
    }

    pub async fn script(&self, sql: &str, write: bool) -> Result<Script, PortalError> {
        let statements = script::split(sql);

        if statements.is_empty() {
            return Err(PortalError::Auth(AuthError::BadRequest("sql_empty")));
        }

        if statements.len() > MAX_STATEMENTS {
            return Err(PortalError::Sql(format!(
                "{} statements is more than the {MAX_STATEMENTS} a script may carry",
                statements.len()
            )));
        }

        let started = std::time::Instant::now();
        let txn = self.open(write).await?;

        let mut steps = Vec::with_capacity(statements.len());
        let mut failed = None;

        for (index, one) in statements.iter().enumerate() {
            match run(&txn, one, write).await {
                Ok(outcome) => steps.push(Step {
                    statement: one.clone(),
                    outcome: Some(outcome),
                    error: None,
                }),
                Err(err) => {
                    steps.push(Step {
                        statement: one.clone(),
                        outcome: None,
                        error: Some(match err {
                            PortalError::Sql(detail) => detail,
                            PortalError::Auth(auth) => auth.code().to_owned(),
                        }),
                    });
                    failed = Some(index);
                    break;
                }
            }
        }

        let committed = if failed.is_none() {
            txn.commit().await.map_err(sql_failed)?;
            true
        } else {
            txn.rollback().await.ok();
            false
        };

        if committed && write {
            self.refresh().await.ok();
        }

        Ok(Script {
            statements: statements.len(),
            steps,
            committed,
            failed,
            read_only: !write,
            elapsed_ms: started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64,
        })
    }
}

async fn run<C: ConnectionTrait>(conn: &C, sql: &str, write: bool) -> Result<Outcome, PortalError> {
    match shape_of(sql) {
        Shape::Rows => {
            let wrapped = format!(
                "SELECT coalesce(json_agg(row_to_json(_console)), '[]'::json) AS \"rows\" \
                 FROM (SELECT * FROM ({sql}) AS _statement LIMIT {cap}) AS _console",
                cap = CONSOLE_ROW_CAP + 1,
            );

            let row = conn
                .query_one_raw(Statement::from_string(DbBackend::Postgres, wrapped))
                .await
                .map_err(sql_failed)?
                .ok_or_else(|| PortalError::Sql("statement returned nothing".to_owned()))?;

            let mut rows = rows_of(row.try_get::<Json>("", "rows").map_err(db_down)?);
            let truncated = rows.len() as u64 > CONSOLE_ROW_CAP;
            rows.truncate(CONSOLE_ROW_CAP as usize);

            Ok(Outcome {
                columns: columns_of(&rows),
                rows_affected: rows.len() as u64,
                rows,
                read_only: !write,
                elapsed_ms: 0,
                truncated,
            })
        }
        Shape::Plan => {
            let found = conn
                .query_all_raw(Statement::from_string(DbBackend::Postgres, sql))
                .await
                .map_err(sql_failed)?;

            let mut rows = Vec::with_capacity(found.len());

            for row in &found {
                let line: String = row.try_get("", "QUERY PLAN").map_err(sql_failed)?;
                rows.push(serde_json::json!({ "QUERY PLAN": line }));
            }

            Ok(Outcome {
                columns: vec!["QUERY PLAN".to_owned()],
                rows_affected: rows.len() as u64,
                rows,
                read_only: !write,
                elapsed_ms: 0,
                truncated: false,
            })
        }
        Shape::Count => conn
            .execute_raw(Statement::from_string(DbBackend::Postgres, sql))
            .await
            .map_err(sql_failed)
            .map(|done| Outcome {
                columns: Vec::new(),
                rows: Vec::new(),
                rows_affected: done.rows_affected(),
                read_only: !write,
                elapsed_ms: 0,
                truncated: false,
            }),
    }
}
