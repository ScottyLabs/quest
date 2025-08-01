# O-Quest Frontend

## API Client

Each of the following instructions assume you are in this directory.

1. When developing `frontend` locally, ensure that you have also started `backend`:

```bash
# in a new terminal window
cd ../backend
cargo run
```

2. If you make any update `backend` in any way that changes the OpenAPI spec, make sure to re-generate the schema in `frontend` with:

```bash
# this requires the backend to be running
bun run generate-types
```

3. Start the frontend:

```bash
bun run dev
```
