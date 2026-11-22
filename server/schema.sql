CREATE TABLE IF NOT EXISTS pilot_members (user_id TEXT PRIMARY KEY, joined_at TEXT NOT NULL, track TEXT NOT NULL DEFAULT 'backend', telemetry INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS pilot_invites (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, redeemed_by TEXT);
CREATE TABLE IF NOT EXISTS pilot_drafts (user_id TEXT NOT NULL, problem_id TEXT NOT NULL, language TEXT NOT NULL, revision INTEGER NOT NULL, files TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,problem_id,language));
CREATE TABLE IF NOT EXISTS pilot_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_version TEXT NOT NULL, language TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, files TEXT NOT NULL, assistance TEXT NOT NULL, explanation TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, day TEXT NOT NULL, month TEXT NOT NULL, reserved_pence INTEGER NOT NULL, charged_pence INTEGER NOT NULL DEFAULT 0, cancelled INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS pilot_attempts_owner ON pilot_attempts(user_id,created_at);
CREATE INDEX IF NOT EXISTS pilot_attempts_queue ON pilot_attempts(status,created_at);
CREATE INDEX IF NOT EXISTS pilot_attempts_budget ON pilot_attempts(month,day,user_id);
CREATE TABLE IF NOT EXISTS pilot_plans (user_id TEXT PRIMARY KEY, document TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pilot_reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_version TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS pilot_sandboxes (job_id TEXT PRIMARY KEY, sandbox_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pilot_costs (job_id TEXT PRIMARY KEY, month TEXT NOT NULL, reserved_pence INTEGER NOT NULL, charged_pence INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS pilot_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, attempt_id TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS pilot_events_owner ON pilot_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS pilot_cancellations (user_id TEXT NOT NULL, job_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,job_id));

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
CREATE TABLE IF NOT EXISTS studio_trials (
 user_id TEXT PRIMARY KEY,session_id TEXT UNIQUE NOT NULL,claimed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS billing_orders (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL,full_name TEXT NOT NULL,email TEXT NOT NULL,
 checkout_id TEXT UNIQUE,customer_id TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS billing_orders_owner ON billing_orders(user_id,created_at);
CREATE TABLE IF NOT EXISTS billing_subscriptions (
 user_id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,subscription_id TEXT UNIQUE NOT NULL,
 status TEXT NOT NULL,period_end INTEGER NOT NULL,cancel_at_period_end INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL
);
