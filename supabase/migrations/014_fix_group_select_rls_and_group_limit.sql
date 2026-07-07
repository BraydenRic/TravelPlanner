-- =============================================================================
-- Migration 014: Fix ambiguous column references in group RLS + per-user group limit
-- =============================================================================
-- BUG 1 (groups invisible to joined members):
--   groups_select_member (004) used an unqualified `id` inside its subquery:
--     EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = id ...)
--   SQL resolves unqualified names innermost-first, so `id` bound to gm.id
--   (group_members' own PK), NOT groups.id. The condition gm.group_id = gm.id
--   is never true, so non-creator members could never SELECT the group row.
--   Symptom: after joining a group you can't see it in your groups list, but
--   rejoining says "already a member".
--
-- BUG 2 (cross-group data leak in group_places):
--   group_places policies had the same trap in reverse: `gm.group_id = group_id`
--   bound BOTH sides to gm.group_id (always true), so any user who belonged to
--   at least one group could read and insert map places in EVERY group.
--
-- Fix: rewrite all three policies on top of is_group_member() (SECURITY DEFINER
-- helper from migration 010) — no subquery, no ambiguity, no RLS recursion.
--
-- ALSO: add a per-user group limit (max 10 groups per user), enforced by a
-- BEFORE INSERT trigger on group_members (covers both create and join paths)
-- and checked explicitly in join_group_by_code for a clean error message.
-- =============================================================================

-- ------------------------------------------------------------
-- 1. groups: members can read groups they belong to
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "groups_select_member" ON groups;

CREATE POLICY "groups_select_member" ON groups
  FOR SELECT USING (is_group_member(groups.id));

-- ------------------------------------------------------------
-- 2. group_places: reads and writes scoped to the caller's groups
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "group_places_select_member" ON group_places;

CREATE POLICY "group_places_select_member" ON group_places
  FOR SELECT USING (is_group_member(group_places.group_id));

DROP POLICY IF EXISTS "group_places_insert_member" ON group_places;

CREATE POLICY "group_places_insert_member" ON group_places
  FOR INSERT WITH CHECK (
    auth.uid()::text = group_places.user_id::text
    AND is_group_member(group_places.group_id)
  );

-- ------------------------------------------------------------
-- 3. Per-user group limit (max 10 memberships per user)
--    Trigger is the hard guarantee; the RPC check below gives a
--    named error the client can map to a friendly message.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_user_group_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Lock this user's membership rows to prevent a concurrent-join race
  PERFORM 1 FROM group_members
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF (
    SELECT COUNT(*)
    FROM group_members
    WHERE user_id = NEW.user_id
  ) >= 10 THEN
    RAISE EXCEPTION 'group_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_group_limit ON group_members;

CREATE TRIGGER trg_enforce_user_group_limit
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION enforce_user_group_limit();

-- ------------------------------------------------------------
-- 4. join_group_by_code: add the group-limit check so joins past
--    the cap fail with a named, client-mappable error.
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

  -- Check the caller's own group count (max 10 groups per user)
  IF (
    SELECT COUNT(*) FROM group_members WHERE user_id = v_caller_id
  ) >= 10 THEN
    RAISE EXCEPTION 'group_limit_reached';
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
