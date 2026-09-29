# Tests

- `tests/unit` — pure unit tests (validation, RBAC, hashing/TOTP, rate limiting, timeline, upload validation). Run with `npx vitest run tests/unit`.
- `tests/integration` — service-level tests against MongoDB Atlas (`janSamasyaDB`). Requires `MONGODB_URI` and `RUN_INTEGRATION=true npx vitest run tests/integration`.
- End-to-end smoke: `npm run build && npm start`, then `curl -s localhost:3000/api/health` and walk through login → submit → track in the browser (see docs/API.md for cURL examples).
