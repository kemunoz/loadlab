# Load tests (k6)

Run from the **load droplet**, targeting the app droplet's private IP:

```bash
k6 run -e BASE_URL=http://<app-private-ip> smoke.js
k6 run -e BASE_URL=http://<app-private-ip> -e RATE=50 baseline.js
k6 run -e BASE_URL=http://<app-private-ip> -e MAX_RATE=600 stress.js
k6 run -e BASE_URL=http://<app-private-ip> spike.js
k6 run -e BASE_URL=http://<app-private-ip> -e DURATION=1h soak.js
```

Seed first (on the app box): `docker compose run --rm api node dist/seed.js 10000 50 20 5`
Env `SEEDED_USERS` must match the seeded user count.

Arrival-rate executors are used on purpose: they keep sending at a fixed rate even when
the server slows down, so latency growth is visible (no coordinated omission).
While a run is going, watch on the app box: `docker stats`, `htop`, and the nginx `rt=`/`urt=` log fields.
Watch the load box's CPU too; if it's pegged, k6 is the bottleneck, not your server.
Log every run in `../docs/RESULTS.md`.
