CREATE TABLE IF NOT EXISTS users (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_user_created_idx ON posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  user_id    BIGINT NOT NULL REFERENCES users(id),
  post_id    BIGINT NOT NULL REFERENCES posts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS likes_post_idx ON likes (post_id);

-- Mutual friendship: both directions are stored.
CREATE TABLE IF NOT EXISTS friendships (
  user_id    BIGINT NOT NULL REFERENCES users(id),
  friend_id  BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);
