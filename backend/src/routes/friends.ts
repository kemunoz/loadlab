import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/friends", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY u.username`,
    [req.userId],
  );
  res.json(rows);
});

// Mutual and immediate: no request/accept flow.
router.post("/friends/:userId", requireAuth, async (req, res) => {
  const friendId = Number(req.params.userId);
  if (!Number.isInteger(friendId) || friendId === req.userId) {
    return res.status(400).json({ error: "invalid user" });
  }
  try {
    await pool.query(
      `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [req.userId, friendId],
    );
  } catch (e: any) {
    if (e.code === "23503") return res.status(404).json({ error: "user not found" });
    throw e;
  }
  res.status(204).end();
});

// Lookup by username so the UI can add friends by name.
router.get("/users/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);
  const { rows } = await pool.query(
    "SELECT id, username FROM users WHERE username ILIKE $1 ORDER BY username LIMIT 20",
    [`${q.replace(/[%_]/g, "")}%`],
  );
  res.json(rows);
});

export default router;
