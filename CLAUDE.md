# LoadLab: instructions for Claude

## Git workflow
- **For every new feature or task, create a new branch off an up-to-date `main` before making any changes.**
  Run `git checkout main && git pull` first, then `git checkout -b <type>/<short-description>`.
- Branch naming: `feat/…`, `fix/…`, `chore/…`, `perf/…`, `docs/…` (e.g. `perf/feed-like-count-index`).
- Never commit directly to `main`.
- Commit and push only when the user asks. Merging into `main` is done via PR unless the user says otherwise.
- One task per branch. If a new, unrelated task comes up, start a new branch off `main`, not off the current branch.

## Project notes
- Monorepo: `backend/` (Express 5 + TS), `frontend/` (React + Vite), `nginx/`, `loadtest/` (k6), `infra/`.
- Purpose is learning how the stack degrades under load, so change one thing at a time and log results in `docs/RESULTS.md`.
- Run locally: `docker compose up -d --build`; seed with `docker compose run --rm api node dist/seed.js 1000 20 10 3`.
- Local k6: `k6 run -e SEEDED_USERS=1000 -e SEEDED_POSTS=10000 loadtest/smoke.js`.
