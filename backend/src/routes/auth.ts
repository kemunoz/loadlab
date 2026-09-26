import { Router } from "express";
import { pool } from "../db.js";
import { makeToken } from "../middleware/auth.js";

const router = Router();

// Username-only login: creates the user if missing.
router.post("/login", async (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  if (!/^[a-zA-Z0-9_]{1,32}$/.test(username)) {
    return res.status(400).json({ error: "username must be 1-32 chars: letters, digits, _" });
  }
  const { rows } = await pool.query(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username`,
    [username],
  );
  const user = rows[0];
  res.json({ user, token: makeToken(user.id) });
});

export default router;
