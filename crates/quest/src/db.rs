use std::time::Duration;

use migration::{Migrator, MigratorTrait};
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};

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
