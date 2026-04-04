-- =============================================================================
-- Migration 009: Replace invite_code_hash with plaintext invite_code
-- =============================================================================
-- The hash-only design requires server-side hashing for every join lookup,
-- which adds cross-platform complexity without meaningful benefit for this app.
-- Plain invite codes (like Slack/Discord) are sufficient for this use case.
-- =============================================================================

ALTER TABLE groups
  DROP COLUMN IF EXISTS invite_code_hash,
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Regenerate the generate_invite_code function to store plaintext
CREATE OR REPLACE FUNCTION generate_invite_code(
  p_group_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_raw_code  TEXT;
  v_expiry    TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Only the group creator can generate an invite code
  IF NOT EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id AND created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Verify group is not full
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id) >= 4 THEN
    RAISE EXCEPTION 'Group is full (max 4 members)';
  END IF;

  -- Generate a short human-readable code (8 uppercase alphanumeric chars)
  v_raw_code := upper(substring(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 8));

  UPDATE groups
  SET invite_code       = v_raw_code,
      invite_expires_at = v_expiry
  WHERE id = p_group_id;

  RETURN v_raw_code;
END;
$$;
