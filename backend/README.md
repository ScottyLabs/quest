## O-Quest Backend

## Seeding

Relative to this directory, create the challenges CSV in `./data/challenges.csv` and run:

```bash
cargo run --bin seed
```

## Database

You should install `sea-orm-cli` using `cargo install sea-orm-cli`. The following instructions assume you are in the `backend` directory:

### Initializing

```bash
sea-orm-cli migrate init
```

### Generating a new migration

```bash
sea-orm-cli migrate generate --migration-dir ./migration <name>
```

### Applying migrations

```bash
sea-orm-cli migrate up --migration-dir ./migration
```

### Generating entities from database

```bash
sea-orm-cli generate entity -o ./src/entities --with-serde both --model-extra-derives "utoipa::ToSchema"
```
