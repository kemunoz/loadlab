import http from "k6/http";
import { check } from "k6";

export const BASE_URL = __ENV.BASE_URL || "http://localhost";
const USERS = Number(__ENV.SEEDED_USERS || 10000); // must match seed
const POSTS = Number(__ENV.SEEDED_POSTS || USERS * 20); // must match seed (users x posts/user)
const TOKEN_POOL = Number(__ENV.TOKEN_POOL || 200);

// A random friend id can be your own id (400); that is expected, not a failure.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 400));

export const thresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500"],
};

// Log in a pool of seeded users once (setup), reuse tokens in the hot path.
export function setupTokens() {
  const tokens = [];
  for (let i = 1; i <= TOKEN_POOL; i++) {
    const id = 1 + Math.floor(Math.random() * USERS);
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: `user${id}` }),
      { headers: { "Content-Type": "application/json" } },
    );
    if (res.status === 200) tokens.push(res.json("token"));
  }
  if (tokens.length === 0) throw new Error("no tokens - is the DB seeded?");
  return { tokens };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ~80% feed reads, 10% likes, 5% posts, 5% friend adds
export function mixed(data) {
  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pick(data.tokens)}`,
    },
  };
  const r = Math.random();
  if (r < 0.8) {
    const res = http.get(`${BASE_URL}/api/feed?limit=20`, params);
    check(res, { "feed 200": (x) => x.status === 200 });
  } else if (r < 0.9) {
    const postId = 1 + Math.floor(Math.random() * POSTS);
    const res = http.post(`${BASE_URL}/api/posts/${postId}/like`, null, {
      ...params,
      tags: { name: "like" },
    });
    check(res, { "like ok": (x) => x.status === 204 || x.status === 404 });
  } else if (r < 0.95) {
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({ body: `load test post ${Date.now()}` }),
      params,
    );
    check(res, { "post 201": (x) => x.status === 201 });
  } else {
    const friendId = 1 + Math.floor(Math.random() * USERS);
    const res = http.post(`${BASE_URL}/api/friends/${friendId}`, null, {
      ...params,
      tags: { name: "add_friend" },
    });
    check(res, { "friend ok": (x) => x.status === 204 || x.status === 400 });
  }
}
