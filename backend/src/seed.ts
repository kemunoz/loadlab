// Bulk seed via set-based SQL. Usage: npm run seed -w backend -- [users] [friendsPerUser] [postsPerUser] [likesPerPost]
import { migrate, pool } from "./db.js";

const [users = 10000, friends = 50, postsPer = 20, likesPer = 5] = process.argv
  .slice(2)
  .map(Number);

await migrate();
console.time("seed");

await pool.query(
  `INSERT INTO users (username)
   SELECT 'user' || g FROM generate_series(1, $1::int) g
   ON CONFLICT DO NOTHING`,
  [users],
);

// Random mutual friendships (ids drawn from the seeded users).
await pool.query(
  `WITH u AS (SELECT array_agg(id) ids, count(*) n FROM users WHERE username LIKE 'user%'),
        pairs AS (
          SELECT DISTINCT LEAST(a, b) a, GREATEST(a, b) b FROM (
            SELECT u.ids[1 + (g % u.n)::int] a,
                   u.ids[1 + floor(random() * u.n)::int] b
            FROM u, generate_series(0, ($1::bigint * $2::bigint) - 1) g
          ) x WHERE a <> b)
   INSERT INTO friendships (user_id, friend_id)
   SELECT a, b FROM pairs UNION ALL SELECT b, a FROM pairs
   ON CONFLICT DO NOTHING`,
  [users, Math.ceil(friends / 2)],
);

await pool.query(
  `INSERT INTO posts (user_id, body, created_at)
   SELECT u.id, 'seed post ' || g || ' by ' || u.username,
          now() - (random() * interval '90 days')
   FROM users u, generate_series(1, $1::int) g
   WHERE u.username LIKE 'user%'`,
  [postsPer],
);

await pool.query(
  `INSERT INTO likes (user_id, post_id)
   SELECT 1 + floor(random() * (SELECT max(id) FROM users))::bigint, p.id
   FROM posts p, generate_series(1, $1::int) g
   ON CONFLICT DO NOTHING`,
  [likesPer],
);

await pool.query("ANALYZE");
console.timeEnd("seed");
for (const t of ["users", "friendships", "posts", "likes"]) {
  const { rows } = await pool.query(`SELECT count(*) FROM ${t}`);
  console.log(t, rows[0].count);
}
await pool.end();
