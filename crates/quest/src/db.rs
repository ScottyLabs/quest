//! Postgres, via `SeaORM`. Entities live in the `entity` crate and the schema
//! is owned by `migration`; run it with
//! `cargo run -p migration -- up`.

use std::time::Duration;

use migration::{Migrator, MigratorTrait};
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};

/// Connects and applies any pending migrations.
///
/// Migrating on boot keeps a single replica honest in development. It is the
/// wrong shape for a rollout of several replicas at once, where the migration
/// belongs in a job that runs before any of them start.
pub async fn connect(url: &str) -> Result<DatabaseConnection, DbErr> {
    let mut options = ConnectOptions::new(url.to_owned());
    options
        .max_connections(16)
        .acquire_timeout(Duration::from_secs(5))
        .sqlx_logging(false);

    let db = Database::connect(options).await?;
    Migrator::up(&db, None).await?;
    Ok(db)
}
