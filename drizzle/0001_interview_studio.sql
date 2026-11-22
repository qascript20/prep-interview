CREATE TABLE IF NOT EXISTS studio_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL,
  reserved_pence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_sessions_owner ON studio_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS studio_sessions_budget ON studio_sessions(month);
CREATE TABLE IF NOT EXISTS studio_plans (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL,month TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL,reserved_pence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_plans_owner ON studio_plans(user_id,created_at);
CREATE INDEX IF NOT EXISTS studio_plans_month ON studio_plans(month);
