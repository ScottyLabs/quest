use std::collections::HashMap;
use std::env;
use std::process;

use chrono::{FixedOffset, NaiveDateTime, TimeZone};
use entity::challenge;
use entity::enums::ChallengeCategory;
use sea_orm::{
    ActiveEnum, ActiveModelTrait, ActiveValue, ColumnTrait, Database, DatabaseConnection,
    EntityTrait, QueryFilter,
};

const CATEGORIES: [(&str, ChallengeCategory); 6] = [
    ("The Essentials", ChallengeCategory::Essentials),
    ("Cool Corners of Carnegie", ChallengeCategory::CoolCorners),
    ("Campus of Bridges", ChallengeCategory::Bridges),
    ("Let's Eat!", ChallengeCategory::LetsEat),
    ("Minor-Major General", ChallengeCategory::MinorMajorGeneral),
    (
        "Residence and Relaxation",
        ChallengeCategory::ResidenceAndRelaxation,
    ),
];

const WHEN: &str = "%m/%d/%Y %I:%M %p";

fn die(msg: &str) -> ! {
    eprintln!("quest-import: {msg}");
    process::exit(2);
}

struct Options {
    csv: String,
    coins: i64,
    offset_hours: i32,
    dry_run: bool,
}

fn options() -> Options {
    let args: Vec<String> = env::args().collect();
    let mut csv = None;
    let mut coins = 5i64;
    let mut offset_hours = -4i32;
    let mut dry_run = false;

    let mut iter = args.iter().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--csv" => csv = iter.next().cloned(),
            "--coins" => {
                coins = iter
                    .next()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or_else(|| die("--coins wants an integer"));
            }
            "--offset-hours" => {
                offset_hours = iter
                    .next()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or_else(|| die("--offset-hours wants an integer"));
            }
            "--dry-run" => dry_run = true,
            "-h" | "--help" => {
                println!(
                    "Usage: quest-import --csv <path> [--coins 5] [--offset-hours -4] [--dry-run]\n\
                     Reads DATABASE_URL from the environment."
                );
                process::exit(0);
            }
            other => die(&format!("unknown argument: {other}")),
        }
    }

    Options {
        csv: csv.unwrap_or_else(|| die("--csv <path> required")),
        coins,
        offset_hours,
        dry_run,
    }
}

struct Row {
    name: String,
    tagline: String,
    description: String,
    category: ChallengeCategory,
    open_from: chrono::DateTime<FixedOffset>,
}

fn parse(path: &str, zone: FixedOffset) -> (Vec<Row>, Vec<String>) {
    let labels: HashMap<&str, ChallengeCategory> = CATEGORIES.into_iter().collect();
    let mut reader =
        csv::Reader::from_path(path).unwrap_or_else(|e| die(&format!("read {path}: {e}")));

    let mut rows = Vec::new();
    let mut skipped = Vec::new();

    for (index, record) in reader.deserialize::<HashMap<String, String>>().enumerate() {
        let line = index + 2;
        let record = match record {
            Ok(record) => record,
            Err(e) => {
                skipped.push(format!("line {line}: {e}"));
                continue;
            }
        };

        let field = |key: &str| {
            record
                .get(key)
                .map(|v| v.trim().to_owned())
                .unwrap_or_default()
        };

        let name = field("Challenge Name");
        if name.is_empty() {
            skipped.push(format!("line {line}: blank Challenge Name"));
            continue;
        }

        let raw = field("Category");
        let Some(category) = labels.get(raw.as_str()).cloned() else {
            skipped.push(format!("line {line} ({name}): unknown category {raw:?}"));
            continue;
        };

        let when = field("Unlocks/Revealed On");
        let Ok(naive) = NaiveDateTime::parse_from_str(&when, WHEN) else {
            skipped.push(format!("line {line} ({name}): bad date {when:?}"));
            continue;
        };
        let Some(open_from) = zone.from_local_datetime(&naive).single() else {
            skipped.push(format!(
                "line {line} ({name}): ambiguous local time {when:?}"
            ));
            continue;
        };

        rows.push(Row {
            name,
            tagline: field("Tagline"),
            description: field("Description"),
            category,
            open_from,
        });
    }

    (rows, skipped)
}

async fn upsert(db: &DatabaseConnection, row: &Row, coins: i64) -> Result<bool, sea_orm::DbErr> {
    let existing = challenge::Entity::find()
        .filter(challenge::Column::Name.eq(row.name.as_str()))
        .one(db)
        .await?;

    let mut model = challenge::ActiveModel {
        name: ActiveValue::Set(row.name.clone()),
        tagline: ActiveValue::Set(row.tagline.clone()),
        description: ActiveValue::Set(row.description.clone()),
        category: ActiveValue::Set(row.category.clone()),
        coin_value: ActiveValue::Set(coins),
        open_from: ActiveValue::Set(row.open_from.into()),
        ..Default::default()
    };

    match existing {
        Some(found) => {
            model.id = ActiveValue::Unchanged(found.id);
            model.update(db).await?;
            Ok(false)
        }
        None => {
            model.id = ActiveValue::Set(uuid::Uuid::new_v4());
            model.insert(db).await?;
            Ok(true)
        }
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let opts = options();

    let zone = FixedOffset::east_opt(opts.offset_hours * 3600)
        .unwrap_or_else(|| die("--offset-hours out of range"));

    let (rows, skipped) = parse(&opts.csv, zone);
    println!("parsed {} row(s) from {}", rows.len(), opts.csv);

    for note in &skipped {
        eprintln!("  skipped {note}");
    }

    if opts.dry_run {
        for row in &rows {
            println!(
                "  would upsert [{}] {} - opens {}",
                row.category.to_value(),
                row.name,
                row.open_from.to_rfc3339()
            );
        }
        println!("dry run: nothing written");
        return;
    }

    let url = env::var("DATABASE_URL").unwrap_or_else(|_| die("DATABASE_URL must be set"));
    let db = Database::connect(url)
        .await
        .unwrap_or_else(|e| die(&format!("connect: {e}")));

    let mut inserted = 0usize;
    let mut updated = 0usize;

    for row in &rows {
        match upsert(&db, row, opts.coins).await {
            Ok(true) => inserted += 1,
            Ok(false) => updated += 1,
            Err(e) => die(&format!("{}: {e}", row.name)),
        }
    }

    println!(
        "inserted {inserted}, updated {updated}, skipped {}",
        skipped.len()
    );
}
