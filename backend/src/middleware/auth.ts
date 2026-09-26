import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SECRET = process.env.TOKEN_SECRET ?? "dev-secret";

const sign = (id: string) => crypto.createHmac("sha256", SECRET).update(id).digest("hex");

export const makeToken = (userId: number | string) => `${userId}.${sign(String(userId))}`;

declare module "express-serve-static-core" {
  interface Request {
    userId: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [id, sig] = token.split(".");
  if (!id || !sig) return res.status(401).json({ error: "unauthorized" });
  const expected = sign(id);
  const ok =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: "unauthorized" });
  req.userId = Number(id);
  next();
}
