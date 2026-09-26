# LoadLab

A tiny social app (users, posts, likes, friends, friend feed) built as a **load-testing target**.
Goal: find where the stack degrades and fix it without just buying a bigger machine.

```
nginx (:80) -> Express API (:3000) -> Postgres
```

- `backend/` Express 5 + TypeScript, `frontend/` React + Vite (built and served by nginx)
- `loadtest/` k6 scenarios, `infra/` droplet setup scripts, `docs/RESULTS.md` experiment log

## Local
```bash
cp .env.example .env
docker compose up -d --build           # http://localhost
docker compose run --rm api node dist/seed.js 10000 50 20 5   # users, friends/user, posts/user, likes/post
```
Dev without docker: run Postgres, then `npm run dev:backend` and `npm run dev:frontend`.

## Tuning knobs (`.env`)
`PG_POOL_MAX`, `API_CPUS`, `API_MEM`, `DB_CPUS`, `DB_MEM`: change one at a time and log the result.

## Remote
1. Create two DigitalOcean droplets in the **same region and VPC** (app, load generator).
2. App: `infra/setup-app-droplet.sh <repo-url> <load-private-ip>`, then seed.
3. Load: `infra/setup-load-droplet.sh`, then see `loadtest/README.md`.
