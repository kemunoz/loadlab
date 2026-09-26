export type User = { id: number; username: string };
export type Post = {
  id: number;
  user_id: number;
  username?: string;
  body: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
};

let token = localStorage.getItem("token") ?? "";
export const setToken = (t: string) => {
  token = t;
  t ? localStorage.setItem("token", t) : localStorage.removeItem("token");
};

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  login: (username: string) =>
    req<{ user: User; token: string }>("POST", "/auth/login", { username }),
  feed: () => req<Post[]>("GET", "/feed"),
  createPost: (body: string) => req<Post>("POST", "/posts", { body }),
  like: (id: number) => req<void>("POST", `/posts/${id}/like`),
  unlike: (id: number) => req<void>("DELETE", `/posts/${id}/like`),
  friends: () => req<User[]>("GET", "/friends"),
  addFriend: (id: number) => req<void>("POST", `/friends/${id}`),
  search: (q: string) => req<User[]>("GET", `/users/search?q=${encodeURIComponent(q)}`),
};
