CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  usernameLower TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  picture TEXT,
  lastSeen INTEGER,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS convs (
  id TEXT PRIMARY KEY,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  status TEXT NOT NULL,
  requestedBy TEXT NOT NULL,
  createdAt INTEGER,
  acceptedAt INTEGER,
  lastMessageAt INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  convId TEXT NOT NULL,
  fromUser TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT,
  media TEXT,
  createdAt INTEGER,
  readBy TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  targetUserId TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_convs_users ON convs(a, b);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(convId, createdAt);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(targetUserId, createdAt);
