-- ══════════════════════════════════════════════════════════
-- MULTI-USER SETUP: users table columns + RLS on all tables
-- ══════════════════════════════════════════════════════════

-- Add new columns to users table (safe if already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_payment TEXT DEFAULT 'pix';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT NULL;

-- Set existing users (you) to onboarding complete
UPDATE users SET onboarding_step = 5 WHERE onboarding_step IS NULL;

-- ══════════════════════════════════════════════════════════
-- RLS: Enable on all tables and create policies
-- ══════════════════════════════════════════════════════════

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON transactions;
CREATE POLICY "Service role full access" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON categories;
CREATE POLICY "Service role full access" ON categories
  FOR ALL USING (true) WITH CHECK (true);

-- pending_actions
ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON pending_actions;
CREATE POLICY "Service role full access" ON pending_actions
  FOR ALL USING (true) WITH CHECK (true);

-- debug_logs (already has RLS from before, ensure it's there)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON debug_logs;
CREATE POLICY "Service role full access" ON debug_logs
  FOR ALL USING (true) WITH CHECK (true);

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON config;
CREATE POLICY "Service role full access" ON config
  FOR ALL USING (true) WITH CHECK (true);

-- transaction_log
ALTER TABLE transaction_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON transaction_log;
CREATE POLICY "Service role full access" ON transaction_log
  FOR ALL USING (true) WITH CHECK (true);
