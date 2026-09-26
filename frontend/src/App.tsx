import { useCallback, useEffect, useState } from "react";
import { api, setToken, type Post, type User } from "./api";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  if (!user) {
    return (
      <Login
        onLogin={(u, t) => {
          setToken(t);
          localStorage.setItem("user", JSON.stringify(u));
          setUser(u);
        }}
      />
    );
  }
  return (
    <Home
      user={user}
      onLogout={() => {
        setToken("");
        localStorage.removeItem("user");
        setUser(null);
      }}
    />
  );
}

function Login({ onLogin }: { onLogin: (u: User, t: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <main>
      <h1>LoadLab</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const { user, token } = await api.login(name);
            onLogin(user, token);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <input placeholder="username" value={name} onChange={(e) => setName(e.target.value)} />
        <button>Enter</button>
      </form>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

function Home({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [feed, setFeed] = useState<Post[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);

  const refresh = useCallback(async () => {
    const [f, fr] = await Promise.all([api.feed(), api.friends()]);
    setFeed(f);
    setFriends(fr);
  }, []);
  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const toggleLike = async (p: Post) => {
    await (p.liked_by_me ? api.unlike(p.id) : api.like(p.id));
    setFeed((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
          : x,
      ),
    );
  };

  return (
    <main>
      <header>
        <h1>LoadLab</h1>
        <span>
          @{user.username} <button onClick={onLogout}>log out</button>
        </span>
      </header>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          await api.createPost(draft);
          setDraft("");
          refresh();
        }}
      >
        <input placeholder="What's up?" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button>Post</button>
      </form>

      <section>
        <h2>Friends' feed</h2>
        {feed.length === 0 && <p className="muted">Nothing yet. Add some friends!</p>}
        {feed.map((p) => (
          <article key={p.id}>
            <b>@{p.username}</b> <span className="muted">{new Date(p.created_at).toLocaleString()}</span>
            <p>{p.body}</p>
            <button onClick={() => toggleLike(p)}>
              {p.liked_by_me ? "♥" : "♡"} {p.like_count}
            </button>
          </article>
        ))}
      </section>

      <section>
        <h2>Friends ({friends.length})</h2>
        <ul>{friends.map((f) => <li key={f.id}>@{f.username}</li>)}</ul>
        <input
          placeholder="find users by name"
          value={q}
          onChange={async (e) => {
            setQ(e.target.value);
            setResults(await api.search(e.target.value));
          }}
        />
        <ul>
          {results
            .filter((r) => r.id !== user.id && !friends.some((f) => f.id === r.id))
            .map((r) => (
              <li key={r.id}>
                @{r.username}{" "}
                <button
                  onClick={async () => {
                    await api.addFriend(r.id);
                    setResults([]);
                    setQ("");
                    refresh();
                  }}
                >
                  add
                </button>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
