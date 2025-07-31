# O-Quest Frontend

## API Client

The frontend currently relies on the production auth gateway, which is tied to the production backend. This means the backend must be deployed before schema changes can be synced to the frontend.

1. After making changes to the OpenAPI spec in `backend`, ensure the deployment has completed.

2. Then, re-generate the schema in `frontend` with:

```bash
bun run generate-types
```
