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
