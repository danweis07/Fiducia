-- Service account rate limiting table
-- Replaces unreliable in-memory Map with persistent, shared counters
-- that survive cold starts and work across serverless instances.

CREATE TABLE IF NOT EXISTS service_account_rate_limits (
  account_id UUID NOT NULL REFERENCES service_accounts(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (account_id, window_start)
);

-- Index for fast lookups by account + window
CREATE INDEX IF NOT EXISTS idx_sa_rate_limits_account_window
  ON service_account_rate_limits (account_id, window_start);

-- RPC function for atomic increment-and-check
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_account_id UUID,
  p_window_start TIMESTAMPTZ,
  p_limit INT
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO service_account_rate_limits (account_id, window_start, request_count)
  VALUES (p_account_id, p_window_start, 1)
  ON CONFLICT (account_id, window_start)
  DO UPDATE SET request_count = service_account_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;

-- Periodic cleanup: remove windows older than 24 hours
-- Run via pg_cron or a scheduled edge function
-- DELETE FROM service_account_rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
