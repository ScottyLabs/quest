## O-Quest Backend

The following instructions assuming you are in the `backend` directory.

## Seeding

Create the challenges CSV in `./data/challenges.csv` and run:

```bash
cargo run --bin seed
```

## Generating QR Codes

To create the `./data/qr.txt` file:

```bash
cargo run --bin qr-export
```

## Database

You should install `sea-orm-cli` using `cargo install sea-orm-cli`.

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
