-- =============================================================================
-- Migration 011: Fix groups RLS and add join_group_by_code RPC
-- =============================================================================
-- Two problems fixed:
--
-- 1. createGroup does INSERT then SELECT on groups before the creator is in
--    group_members, so groups_select_member denies the SELECT. Fix: add a
--    separate policy letting creators always read their own groups.
--
-- 2. joinGroup queries groups by invite_code but the non-member caller is
--    blocked by groups_select_member. Fix: move the whole join flow into a
--    SECURITY DEFINER RPC that bypasses RLS for the invite lookup.
-- =============================================================================

-- ------------------------------------------------------------
-- 1. Allow group creators to read their own groups (even before
--    they appear in group_members).
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "groups_select_creator" ON groups;

CREATE POLICY "groups_select_creator" ON groups
  FOR SELECT USING (auth.uid()::text = created_by::text);

-- ------------------------------------------------------------
-- 2. join_group_by_code — atomic invite code lookup + member insert.
--    SECURITY DEFINER so the invite_code lookup bypasses RLS.
--    Returns the group_id on success; raises on any failure.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION join_group_by_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  UUID := auth.uid();
  v_group      RECORD;
  v_member_cnt INTEGER;
  v_color      TEXT;
  v_colors     TEXT[] := ARRAY['#00F5D4', '#F5A623', '#A78BFA', '#FF6B6B'];
  v_used       TEXT[];
BEGIN
  -- Require authentication
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Find group by invite code (SECURITY DEFINER bypasses RLS here)
  SELECT id, name, created_by, invite_expires_at
  INTO v_group
  FROM groups
  WHERE invite_code = p_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite_code';
  END IF;

  -- Check expiry
  IF v_group.invite_expires_at IS NULL OR v_group.invite_expires_at < NOW() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group.id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  -- Check capacity
  SELECT COUNT(*) INTO v_member_cnt
  FROM group_members WHERE group_id = v_group.id;

  IF v_member_cnt >= 4 THEN
    RAISE EXCEPTION 'group_full';
  END IF;

  -- Assign next available color
  SELECT ARRAY_AGG(color) INTO v_used
  FROM group_members WHERE group_id = v_group.id;

  SELECT c INTO v_color
  FROM UNNEST(v_colors) AS c
  WHERE c <> ALL(COALESCE(v_used, '{}'))
  LIMIT 1;

  IF v_color IS NULL THEN
    v_color := '#00F5D4';
  END IF;

  -- Insert member
  INSERT INTO group_members (group_id, user_id, color)
  VALUES (v_group.id, v_caller_id, v_color);

  RETURN v_group.id;
END;
$$;
