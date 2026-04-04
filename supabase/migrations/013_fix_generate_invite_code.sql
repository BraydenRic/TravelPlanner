-- =============================================================================
-- Migration 013: Fix generate_invite_code — pgcrypto schema path
-- =============================================================================
-- gen_random_bytes lives in the extensions schema in Supabase.
-- SET search_path = public hides it. Replace with a pgcrypto-free approach
-- using md5 + random + clock_timestamp, which is built into PostgreSQL core.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code(p_group_id UUID)
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

  -- Generate 8-char uppercase code using md5 (no pgcrypto needed)
  v_raw_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  UPDATE groups
  SET invite_code       = v_raw_code,
      invite_expires_at = v_expiry
  WHERE id = p_group_id;

  RETURN v_raw_code;
END;
$$;
