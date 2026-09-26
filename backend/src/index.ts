import express from "express";
import type { NextFunction, Request, Response } from "express";
import { migrate } from "./db.js";
import auth from "./routes/auth.js";
import posts from "./routes/posts.js";
import friends from "./routes/friends.js";
import feed from "./routes/feed.js";
import health from "./routes/health.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

const api = express.Router();
api.use("/auth", auth);
api.use(health);
api.use(friends);
api.use(posts);
api.use(feed);
app.use("/api", api);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = Number(process.env.PORT ?? 3000);
await migrate();
app.listen(port, () => console.log(`api listening on :${port}`));
