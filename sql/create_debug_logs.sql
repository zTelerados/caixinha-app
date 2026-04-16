-- Caixinha: Create debug_logs table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  incoming_message TEXT NOT NULL,
  detected_intent TEXT NOT NULL DEFAULT 'unknown',
  pending_action_found TEXT,
  handler_used TEXT NOT NULL DEFAULT 'none',
  parsed_data JSONB,
  response_sent TEXT NOT NULL DEFAULT '',
  error TEXT,
  processing_time_ms INTEGER DEFAULT 0
);

-- Index for fast lookups by timestamp (most common query)
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_debug_logs_user ON debug_logs(user_id);

-- Auto-cleanup: keep only last 7 days of logs
-- (optional, run manually or set up a cron)
-- DELETE FROM debug_logs WHERE timestamp < now() - interval '7 days';

-- Grant access to service role (should already have it, but just in case)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do everything
CREATE POLICY "Service role full access" ON debug_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
