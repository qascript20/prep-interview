CREATE TABLE IF NOT EXISTS pilot_members (user_id TEXT PRIMARY KEY, joined_at TEXT NOT NULL, track TEXT NOT NULL DEFAULT 'backend', telemetry INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_invites (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, redeemed_by TEXT);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_drafts (user_id TEXT NOT NULL, problem_id TEXT NOT NULL, language TEXT NOT NULL, revision INTEGER NOT NULL, files TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,problem_id,language));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_version TEXT NOT NULL, language TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, files TEXT NOT NULL, assistance TEXT NOT NULL, explanation TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, day TEXT NOT NULL, month TEXT NOT NULL, reserved_pence INTEGER NOT NULL, charged_pence INTEGER NOT NULL DEFAULT 0, cancelled INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_attempts_owner ON pilot_attempts(user_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_attempts_queue ON pilot_attempts(status,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_attempts_budget ON pilot_attempts(month,day,user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_plans (user_id TEXT PRIMARY KEY, document TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_version TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_sandboxes (job_id TEXT PRIMARY KEY, sandbox_id TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_costs (job_id TEXT PRIMARY KEY, month TEXT NOT NULL, reserved_pence INTEGER NOT NULL, charged_pence INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, attempt_id TEXT, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_events_owner ON pilot_events(user_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_cancellations (user_id TEXT NOT NULL, job_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,job_id));
