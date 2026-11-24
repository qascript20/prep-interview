CREATE TABLE IF NOT EXISTS studio_question_previews (
 user_id TEXT PRIMARY KEY,
 id TEXT NOT NULL UNIQUE,
 selection TEXT NOT NULL,
 questions_issued INTEGER NOT NULL DEFAULT 0,
 answers_received INTEGER NOT NULL DEFAULT 0,
 question TEXT NOT NULL DEFAULT '',
 summary TEXT NOT NULL DEFAULT '',
 pending_id TEXT,
 pending_at TEXT,
 request_count INTEGER NOT NULL DEFAULT 0,
 last_response TEXT,
 month TEXT NOT NULL,
 reserved_pence INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
