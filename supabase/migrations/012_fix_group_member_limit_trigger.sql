-- =============================================================================
-- Migration 012: Fix enforce_group_member_limit trigger
-- =============================================================================
-- The original trigger used FOR UPDATE inside COUNT(*) which PostgreSQL
-- does not allow ("FOR UPDATE is not allowed with aggregate functions").
-- Fix: acquire the row lock separately with PERFORM, then count.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_group_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Lock existing rows for this group to prevent concurrent-insert race condition
  PERFORM 1 FROM group_members
  WHERE group_id = NEW.group_id
  FOR UPDATE;

  -- Now count (no FOR UPDATE here)
  IF (
    SELECT COUNT(*)
    FROM group_members
    WHERE group_id = NEW.group_id
  ) >= 4 THEN
    RAISE EXCEPTION 'Group is full (max 4 members)';
  END IF;

  RETURN NEW;
END;
$$;
