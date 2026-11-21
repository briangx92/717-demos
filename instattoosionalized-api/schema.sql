-- Requests from the website form. Every value is stored as plain text and never as markup.
CREATE TABLE IF NOT EXISTS requests (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id  TEXT    NOT NULL UNIQUE,
  client_key TEXT    NOT NULL UNIQUE,         -- set by the browser per send; makes a retry safe
  created_at INTEGER NOT NULL,            -- epoch milliseconds
  name       TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('tattoo','piercing','general')),
  artist     TEXT    NOT NULL DEFAULT '',
  services   TEXT    NOT NULL DEFAULT '[]', -- JSON array of strings
  size       TEXT    NOT NULL DEFAULT '',
  place      TEXT    NOT NULL DEFAULT '',
  idea       TEXT    NOT NULL DEFAULT '',
  when_text  TEXT    NOT NULL DEFAULT '',
  note       TEXT    NOT NULL DEFAULT '',
  source     TEXT    NOT NULL DEFAULT 'quick' CHECK (source IN ('quick','guided')),
  ip_hash    TEXT    NOT NULL,            -- keyed hash, never the address itself
  status     TEXT    NOT NULL DEFAULT 'New'
);
CREATE INDEX IF NOT EXISTS requests_created ON requests (created_at);

-- A solved challenge can be used once. Rows are purged after they expire.
CREATE TABLE IF NOT EXISTS used_challenges (
  challenge TEXT PRIMARY KEY,
  expires   INTEGER NOT NULL
);

-- One row per attempt that counts against a visitor's limit.
CREATE TABLE IF NOT EXISTS attempts (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT    NOT NULL,
  kind    TEXT    NOT NULL,               -- 'submit' | 'admin_fail'
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_lookup ON attempts (ip_hash, kind, ts);

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
