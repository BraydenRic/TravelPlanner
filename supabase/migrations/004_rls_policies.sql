-- ============================================================
-- Migration 004: RLS Policies — Driftmark
-- Mitigates: AS-01 (BOLA), AS-02 (database access control)
-- ============================================================
-- These policies are the PRIMARY authorization boundary.
-- The Supabase anon key is embedded in the client bundle and is public.
-- RLS is the ONLY real guard against cross-user data access.
-- See THREAT_MODEL.md TOP-1, AS-02 (M-02-A through M-02-E).
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- Mitigates AS-02 T-02-E (M-02-E): publicly readable (for group
-- features, displaying member names), self-writable only.
-- ------------------------------------------------------------

-- Anyone can read profiles (needed for group member display names/avatars)
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- profiles are inserted by auth trigger handle_new_user() (007_auth_trigger.sql)
-- No INSERT policy for authenticated users — trigger runs as SECURITY DEFINER

-- ------------------------------------------------------------
-- CITIES
-- READ-ONLY reference table — no writes allowed by any user.
-- Mitigates AS-02 T-02-C (M-02-C): no INSERT/UPDATE/DELETE policies.
-- ------------------------------------------------------------

CREATE POLICY "cities_select_all" ON cities
  FOR SELECT USING (true);
-- COMMENT: No INSERT/UPDATE/DELETE policies — cities is read-only reference data.
-- Any write attempt by authenticated users is denied by default (no permissive policy).

-- ------------------------------------------------------------
-- VISITED_PLACES
-- Mitigates AS-02 T-02-A (M-02-A): strict owner-only access.
-- auth.uid() must match user_id on every operation.
-- ------------------------------------------------------------

CREATE POLICY "visited_places_select_own" ON visited_places
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "visited_places_insert_own" ON visited_places
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "visited_places_update_own" ON visited_places
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "visited_places_delete_own" ON visited_places
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ------------------------------------------------------------
-- PLACE_RATINGS
-- Mitigates AS-02 T-02-A (M-02-A): access controlled via
-- visited_place ownership (JOIN to visited_places).
-- Direct user_id column does not exist — ownership derived via FK.
-- ------------------------------------------------------------

CREATE POLICY "place_ratings_select_own" ON place_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM visited_places vp
      WHERE vp.id = visited_place_id
        AND vp.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "place_ratings_insert_own" ON place_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM visited_places vp
      WHERE vp.id = visited_place_id
        AND vp.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "place_ratings_update_own" ON place_ratings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM visited_places vp
      WHERE vp.id = visited_place_id
        AND vp.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "place_ratings_delete_own" ON place_ratings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM visited_places vp
      WHERE vp.id = visited_place_id
        AND vp.user_id::text = auth.uid()::text
    )
  );

-- ------------------------------------------------------------
-- GROUPS
-- Mitigates AS-02 T-02-B (M-02-B): members can read groups
-- they belong to. Only creator can update/delete.
-- invite_code_hash is never returned to non-members.
-- ------------------------------------------------------------

-- Members can read the group they belong to
CREATE POLICY "groups_select_member" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id
        AND gm.user_id::text = auth.uid()::text
    )
  );

-- Any authenticated user can create a group (they become creator)
CREATE POLICY "groups_insert_own" ON groups
  FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

-- Only the creator can update group settings (name, color_scheme, invite)
CREATE POLICY "groups_update_creator" ON groups
  FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Only the creator can delete the group
CREATE POLICY "groups_delete_creator" ON groups
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- ------------------------------------------------------------
-- GROUP_MEMBERS
-- Mitigates AS-02 T-02-B (M-02-B): only members of a group
-- can see its membership list.
-- Mitigates AS-05 T-05-D (M-05-D): combined with DB trigger
-- enforce_group_member_limit() for 4-member cap.
-- ------------------------------------------------------------

-- Members can see other members in their own groups
CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_id
        AND gm2.user_id::text = auth.uid()::text
    )
  );

-- Users can only add themselves (invite flow validates invite_code_hash externally)
CREATE POLICY "group_members_insert_self" ON group_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- A user can update their own membership record (e.g. color); creator can update any member
CREATE POLICY "group_members_update_self_or_creator" ON group_members
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id
        AND g.created_by::text = auth.uid()::text
    )
  );

-- A user can leave (delete own row), or the group creator can remove a member
CREATE POLICY "group_members_delete_self_or_creator" ON group_members
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id
        AND g.created_by::text = auth.uid()::text
    )
  );

-- ------------------------------------------------------------
-- GROUP_PLACES
-- Mitigates AS-02 T-02-B (M-02-B): only group members can
-- read or contribute to the shared group map.
-- ------------------------------------------------------------

-- Group members can see all places added to their group
CREATE POLICY "group_places_select_member" ON group_places
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id::text = auth.uid()::text
    )
  );

-- A group member can add a place, but only under their own user_id
CREATE POLICY "group_places_insert_member" ON group_places
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id::text = auth.uid()::text
    )
  );

-- Only the user who added the place can update it
CREATE POLICY "group_places_update_own" ON group_places
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Only the user who added the place can remove it
CREATE POLICY "group_places_delete_own" ON group_places
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ------------------------------------------------------------
-- PLACE_PHOTOS
-- Mitigates AS-03 (M-03-E, M-03-F): photo access is strictly
-- owner-only at DB level. Signed URLs for original images are
-- handled at the storage layer (005_storage_policies.sql).
-- ------------------------------------------------------------

-- Users can only see their own photos
CREATE POLICY "place_photos_select_own" ON place_photos
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can only upload photos to their own visited places
CREATE POLICY "place_photos_insert_own" ON place_photos
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
    AND EXISTS (
      SELECT 1 FROM visited_places vp
      WHERE vp.id = visited_place_id
        AND vp.user_id::text = auth.uid()::text
    )
  );

-- Users can only update (e.g. caption, sort_order) their own photos
CREATE POLICY "place_photos_update_own" ON place_photos
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can only delete their own photos
CREATE POLICY "place_photos_delete_own" ON place_photos
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ------------------------------------------------------------
-- ACHIEVEMENTS
-- Mitigates AS-02 T-02-D (M-02-D): readable by the owner.
-- No INSERT/UPDATE/DELETE for users — only SECURITY DEFINER
-- functions (check_achievements) may write to this table.
-- ------------------------------------------------------------

-- Users can read their own achievements
CREATE POLICY "achievements_select_own" ON achievements
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- No INSERT/UPDATE/DELETE policies for regular users.
-- Writes are performed exclusively by SECURITY DEFINER functions.

-- ------------------------------------------------------------
-- PUSH_TOKENS
-- Mitigates AS-09 T-09-A (M-09-A): push tokens are private
-- to the owning user. Edge Functions use service-role key to
-- read tokens for sending (bypasses RLS — handled separately).
-- ------------------------------------------------------------

CREATE POLICY "push_tokens_select_own" ON push_tokens
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "push_tokens_insert_own" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "push_tokens_update_own" ON push_tokens
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "push_tokens_delete_own" ON push_tokens
  FOR DELETE USING (auth.uid()::text = user_id::text);
