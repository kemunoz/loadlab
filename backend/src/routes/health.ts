import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } });
});

export default router;
