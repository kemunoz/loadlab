import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Intentionally naive baseline: correlated count(*) per post, no caching.
// This is the first expected bottleneck under load.
router.get("/feed", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
  const before = req.query.before ? new Date(String(req.query.before)) : new Date();
  if (Number.isNaN(before.getTime())) return res.status(400).json({ error: "bad before" });
  const { rows } = await pool.query(
    `SELECT p.id, p.user_id, u.username, p.body, p.created_at,
            (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS like_count,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked_by_me
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id IN (SELECT friend_id FROM friendships WHERE user_id = $1)
       AND p.created_at < $2
     ORDER BY p.created_at DESC
     LIMIT $3`,
    [req.userId, before, limit],
  );
  res.json(rows);
});

export default router;
