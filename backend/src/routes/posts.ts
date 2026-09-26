import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/posts", requireAuth, async (req, res) => {
  const body = String(req.body?.body ?? "").trim();
  if (!body || body.length > 500) return res.status(400).json({ error: "body must be 1-500 chars" });
  const { rows } = await pool.query(
    "INSERT INTO posts (user_id, body) VALUES ($1, $2) RETURNING id, user_id, body, created_at",
    [req.userId, body],
  );
  res.status(201).json(rows[0]);
});

router.get("/users/:id/posts", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.user_id, p.body, p.created_at,
            (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS like_count,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $2) AS liked_by_me
     FROM posts p
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [req.params.id, req.userId],
  );
  res.json(rows);
});

router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, req.params.id],
    );
  } catch (e: any) {
    if (e.code === "23503") return res.status(404).json({ error: "post not found" });
    throw e;
  }
  res.status(204).end();
});

router.delete("/posts/:id/like", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [
    req.userId,
    req.params.id,
  ]);
  res.status(204).end();
});

export default router;
