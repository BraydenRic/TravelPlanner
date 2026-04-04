-- =============================================================================
-- Migration 010: Fix infinite recursion in group_members RLS policy
-- =============================================================================
-- The original group_members_select_member policy queried group_members
-- from within a group_members policy, causing PostgreSQL infinite recursion.
--
-- Fix: check membership by looking at auth.uid() = user_id (own rows always
-- visible) OR by checking the groups table (which has no self-referential
-- policy). This breaks the recursion while keeping the security guarantee
-- that only group members can see the member list.
-- =============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "group_members_select_member" ON group_members;

-- Replace with a non-recursive policy:
-- A user can see all members of any group they personally belong to.
-- We determine "belongs to" by checking if their own row exists (user_id = auth.uid())
-- OR if the group_id is a group they created (via the groups table).
-- The simplest correct approach: a row is visible if auth.uid() = user_id
-- (you always see your own row) OR if the group has another row where user_id = auth.uid().
-- To avoid recursion, use a security definer function to check membership.

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
  );
$$;

CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT USING (is_group_member(group_id));
