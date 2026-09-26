# LoadLab Study Guide

Goal: understand how a web stack (nginx -> Node -> Postgres) degrades under load, and how to get more capacity without just buying a bigger machine.

How to use this: work through the phases in order. Each phase ends with a **Do it** task in this repo and an entry in `docs/RESULTS.md`. Write your prediction *before* every test run.

> Links were written from memory and not checked live; if one has moved, search the title.

---

## Phase 0: Core concepts

### Latency, throughput, percentiles
- **Latency**: time for one request. **Throughput**: requests per second (RPS).
- Averages hide pain. If 1% of requests take 5s, the average looks fine but 1 in 100 users is suffering. Track **p50, p95, p99**.
- Users often make many requests per page, so the slow tail affects far more than 1% of page views ("tail at scale").

### Little's Law
`L = λ × W` (requests in flight = arrival rate × time each spends in the system).
- 100 req/s at 50ms each -> ~5 requests in flight.
- If latency rises to 500ms at the same rate -> ~50 in flight. Those extra in-flight requests need connections, memory and threads. This is how a slowdown snowballs.

### The knee
As utilization of a resource approaches 100%, queueing makes latency rise slowly, then explosively. Below the knee, more load means slightly more latency. Past it, small load increases give huge latency and errors. Your job is to find the knee, name the resource behind it, and move it.

### Open vs closed load models
- **Closed** (fixed number of virtual users, each waits for a response before the next request): when the server slows down, the test *sends less*, hiding the problem.
- **Open** (fixed arrival rate, like real internet traffic): keeps sending even when the server is struggling, so queues and latency show up honestly.
- This repo uses `constant-arrival-rate` / `ramping-arrival-rate` in `loadtest/` for that reason. Ignoring this is called **coordinated omission**.

### USE method
For every resource (CPU, memory, disk, network, DB connections, pool slots) ask:
- **U**tilization: how busy is it?
- **S**aturation: is work queueing for it?
- **E**rrors: is it failing?

### Four golden signals (what to monitor)
Latency, traffic, errors, saturation.

### Vertical vs horizontal scaling
- Vertical: bigger machine. Simple, but expensive and has a ceiling.
- Horizontal: more copies behind a load balancer. Needs the app to be stateless and the DB to keep up.
- Often the best "scaling" is removing waste: better queries, caching, fewer round trips.

**Do it:** run `smoke.js` and `baseline.js` locally. For every metric in k6's output, explain in one sentence what it means.

---

## Phase 1: Baseline on real servers

Concepts:
- Why a separate load-generator machine matters (the generator competes for CPU otherwise).
- Same region + private VPC IP removes internet noise.
- The load box can itself be the bottleneck: watch its CPU.

Read the metrics you have:
- nginx log `rt=` (total request time) vs `urt=` (upstream/API time). A large gap suggests queueing at nginx or slow clients.
- `docker stats`: per-container CPU/memory.
- `/api/health` returns pool `total / idle / waiting`. `waiting > 0` means requests are queueing for a DB connection.

Test types (from k6): **smoke** (does it work), **load** (expected traffic), **stress** (beyond expected, find the limit), **spike** (sudden burst), **soak** (long duration).

**Do it:** create the droplets, seed 10k users / 200k posts, run `stress.js`. Record: max RPS with p95 < 500ms, p95 at the knee, and the first saturated resource.

---

## Phase 2: The database

Concepts:
- `EXPLAIN (ANALYZE, BUFFERS)`: read the plan bottom-up. Look for `Seq Scan` on big tables, big gaps between estimated and actual rows, and high `Buffers: read`.
- Indexes: B-tree basics, composite index column order, covering indexes (`INCLUDE`), and the cost of indexes on writes.
- **N+1 / correlated subqueries**: the feed does a `count(*)` per post. Understand why that scales with rows returned.
- **Denormalization**: store `like_count` on `posts`; trade write cost and consistency risk for cheap reads.
- **Connection pool sizing**: more connections is not faster. Past roughly the DB's core count (times a small factor), extra connections mostly add contention. Test `PG_POOL_MAX` at 5, 10, 25, 50.
- `pg_stat_statements`: which queries consume the most total time.

**Do it (one branch each, one RESULTS row each):**
1. Capture the feed query plan before any change.
2. Add/adjust an index.
3. Add denormalized `like_count`.
4. Sweep pool size.

---

## Phase 3: Node and nginx

Concepts:
- Node runs JavaScript on one thread. One CPU-bound or slow-blocking request delays others. A 2-core box running one Node process leaves a core idle; check with `htop`.
- Options: `cluster` module, multiple API containers behind nginx, or both.
- nginx `upstream` load balancing, `keepalive` to the upstream (avoids a new TCP connection per request), gzip, and **microcaching** (cache a response for 1-2 seconds; huge win for hot read endpoints, at the cost of staleness).
- Per-user data can't be cached in a shared cache naively: cache keys must include the user (or the feed must be personalized elsewhere).

**Do it:** run 2 API replicas, then compare RPS and p95 to the single-instance result. Note whether the DB became the new bottleneck.

---

## Phase 4: Caching and connection management

Concepts:
- Cache-aside pattern, TTLs vs explicit invalidation, cache stampede (many requests miss at once and hit the DB together).
- What to cache in this app: friend lists (rarely change), feed pages (short TTL), like counts.
- **PgBouncer**: pooling connections in front of Postgres; transaction pooling and its caveats.
- Postgres tuning basics: `shared_buffers`, `work_mem`, `effective_cache_size`, `max_connections`.

**Do it:** add Redis for feed caching (or in-process cache first, for simplicity), measure hit rate and latency change.

---

## Phase 5: Failure and graceful degradation

Concepts:
- **Load shedding**: reject some requests early (fast 503) so the rest still succeed. Better than everyone timing out.
- Timeouts everywhere (client, nginx, API, DB `statement_timeout`), rate limiting, backpressure.
- **Retry storms**: naive client retries multiply load on a struggling server. Use backoff + jitter.
- Memory limits and OOM kills; leaks and slow bloat show up in soak tests.
- Recovery behavior: after a spike ends, does latency return to normal?

**Do it:** run `spike.js` and watch recovery. Then lower `DB_CPUS` / `API_MEM` to force failures and observe how each layer fails.

---

## Phase 6: Architecture

Concepts:
- **Fan-out on read** (what the feed does now) vs **fan-out on write** (precompute each user's feed when someone posts). This is the classic Twitter timeline problem.
- Read replicas and read/write splitting.
- Vertical scaling cost comparison: what did each optimization gain vs what a bigger droplet would have cost?

**Do it:** write a final summary in `docs/RESULTS.md`: capacity (RPS at p95 < 500ms) at each step, cost, and what you'd do next.

---

## Self-check questions
1. Why is p99 more useful than average latency?
2. If latency doubles at constant arrival rate, what happens to concurrent requests?
3. Why can a closed-model load test make a broken server look healthy?
4. How do you tell whether the API or the DB is the bottleneck?
5. Why might raising `PG_POOL_MAX` make things slower?
6. What does `rt` much greater than `urt` in the nginx log suggest?
7. What is the cost of microcaching, and where is it safe?
8. Why does the load generator need its own machine?

---

## Resources

### Load testing and k6
- k6 docs: https://grafana.com/docs/k6/latest/
- k6 test types guide: https://grafana.com/docs/k6/latest/testing-guides/test-types/
- k6 open vs closed models: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/
- k6 arrival-rate executors: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/
- Gil Tene, "How NOT to Measure Latency" (talk, search the title): the definitive explanation of coordinated omission.

### Performance thinking
- Brendan Gregg, The USE Method: https://www.brendangregg.com/usemethod.html
- Brendan Gregg, *Systems Performance* (book, 2nd ed.): deep reference for CPU/memory/disk/network analysis.
- Little's Law overview: https://en.wikipedia.org/wiki/Little%27s_law
- Google SRE Book, "Monitoring Distributed Systems" (four golden signals): https://sre.google/sre-book/monitoring-distributed-systems/
- Dean & Barroso, "The Tail at Scale" (CACM, 2013): why tail latency dominates at scale.
- Amazon Builders' Library, "Using load shedding to avoid overload": https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/

### Postgres
- Using EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- Performance tips: https://www.postgresql.org/docs/current/performance-tips.html
- pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- Indexes: https://www.postgresql.org/docs/current/indexes.html
- PgBouncer: https://www.pgbouncer.org/
- "Use The Index, Luke" (free book on SQL indexing): https://use-the-index-luke.com/

### Node and nginx
- node-postgres pooling: https://node-postgres.com/features/pooling
- Node `cluster` module: https://nodejs.org/api/cluster.html
- nginx proxy module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx upstream module (load balancing, keepalive): https://nginx.org/en/docs/http/ngx_http_upstream_module.html

### Architecture
- Martin Kleppmann, *Designing Data-Intensive Applications*: Chapter 1 has the Twitter home-timeline fan-out example; later chapters cover replication, partitioning and caching tradeoffs.
