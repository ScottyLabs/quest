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

## Adding New Endpoints

### 1. Add service method

Add your method to `./src/services/traits.rs` and implement it in `./src/services/your_module.rs`.

### 2. Create handler function

Add an API endpoint handler in `./src/handlers/your_module.rs`:

```rust
#[utoipa::path(
    get,
    path = "/api/your-endpoint",
    responses((status = 200, description = "Success", body = YourResponse)),
    tag = "your-tag"
)]
pub async fn your_handler(/* params */) -> Result<Json<YourResponse>, AppError> {
    // implementation
}
```

### 3. Derive `ToSchema` on response types

```rust
#[derive(Serialize, ToSchema)]
pub struct YourResponse {
    // fields
}
```

### 4. Register route in `./src/main.rs`

```rust
.routes(routes!(handlers::your_module::your_handler))
```

### 5. Update `./src/doc.rs`

Add handler and response schema:

```rust
// In paths:
handlers::your_module::your_handler,

// In schemas:
YourResponse,
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
