-- ============================================================
-- Migration 006: Account Deletion & Data Export — Driftmark
-- Mitigates: AS-12 (GDPR — right to erasure, right to access)
-- ============================================================
-- account_delete(p_user_id):
--   Performs a full, ordered cascade delete of all user data,
--   removes storage files, and removes the auth.users row.
--   SECURITY DEFINER so it can call auth.admin_delete_user().
--   Caller verification: auth.uid() must equal p_user_id.
--
-- export_user_data(p_user_id):
--   Returns all user data as JSONB for GDPR Article 20
--   (data portability / right of access).
--   Caller verification: auth.uid() must equal p_user_id.
-- ============================================================

-- ------------------------------------------------------------
-- account_delete
-- Mitigates AS-12 T-12-A (M-12-A): complete data erasure on request.
-- Mitigates AS-12 T-12-B (M-12-B): cascade order prevents FK violations.
-- SECURITY DEFINER runs as the function owner (superuser), NOT as the
-- calling user — required to call auth.admin_delete_user().
-- search_path is pinned to prevent search_path injection attacks.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION account_delete(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  -- Step 1: Verify the caller is deleting their own account.
  -- This is the critical authorization check — prevents any user from
  -- deleting another user's account by passing a different UUID.
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'PGRST301';
  END IF;
  IF v_caller_id <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot delete another user''s account' USING ERRCODE = '42501';
  END IF;

  -- Step 2: Delete storage objects.
  -- Supabase Storage: delete all files in place-photos/{user_id}/ and avatars/{user_id}/.
  -- NOTE: storage.delete() is a Supabase internal function available in SECURITY DEFINER context.
  -- If the storage extension is not available in this schema context, these deletes should be
  -- performed via the Edge Function that calls this RPC (recommended pattern for production).
  DELETE FROM storage.objects
  WHERE bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = p_user_id::text;

  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = p_user_id::text;

  DELETE FROM storage.objects
  WHERE bucket_id = 'share-cards'
    AND (storage.foldername(name))[1] = p_user_id::text;

  -- Step 3: Delete application data in safe cascade order.
  -- Order is chosen to avoid FK constraint violations:
  --   push_tokens → achievements → place_photos (DB rows, storage deleted above)
  --   → place_ratings (via visited_places FK cascade) → group_members
  --   → group_places → visited_places → profiles
  --
  -- Most child tables have ON DELETE CASCADE set on their FK to profiles,
  -- so deleting profiles would cascade. However, we delete explicitly for
  -- auditability and to ensure storage cleanup fires before the cascade.

  -- Push tokens (no downstream dependencies)
  DELETE FROM push_tokens WHERE user_id = p_user_id;

  -- Achievements (no downstream dependencies)
  DELETE FROM achievements WHERE user_id = p_user_id;

  -- Photo DB rows (storage already deleted above)
  -- ON DELETE CASCADE from visited_places would handle this, but explicit is safer
  DELETE FROM place_photos WHERE user_id = p_user_id;

  -- Place ratings — deleted via ON DELETE CASCADE when visited_places is deleted,
  -- but explicit deletion here makes the audit trail clear
  DELETE FROM place_ratings
  WHERE visited_place_id IN (
    SELECT id FROM visited_places WHERE user_id = p_user_id
  );

  -- Group memberships — remove the user from all groups
  DELETE FROM group_members WHERE user_id = p_user_id;

  -- Group places contributed by this user
  DELETE FROM group_places WHERE user_id = p_user_id;

  -- Groups created by this user that now have no members
  -- (If other members remain, they keep their group — created_by becomes orphaned
  --  which is acceptable per product spec; alternatively reassign or delete group)
  -- Per THREAT_MODEL: groups are deleted when creator leaves with no other members.
  DELETE FROM groups
  WHERE created_by = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id
    );

  -- Visited places (ON DELETE CASCADE removes place_ratings and place_photos already deleted)
  DELETE FROM visited_places WHERE user_id = p_user_id;

  -- Profile — cascade will clean up any remaining child rows
  DELETE FROM profiles WHERE id = p_user_id;

  -- Step 4: Remove from Supabase Auth.
  -- auth.admin_delete_user() is available to SECURITY DEFINER functions.
  -- This removes the auth.users row, invalidating all JWTs for this user.
  PERFORM auth.admin_delete_user(p_user_id);

END;
$$;

-- Revoke direct execution from public; only authenticated users can call it
-- (and the function itself verifies auth.uid() = p_user_id)
REVOKE ALL ON FUNCTION account_delete(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION account_delete(UUID) TO authenticated;

-- ------------------------------------------------------------
-- export_user_data
-- Mitigates AS-12 T-12-C (M-12-C): GDPR Article 20 data portability.
-- Returns all data as a single JSONB document.
-- Caller verification: auth.uid() must equal p_user_id.
-- SECURITY DEFINER to ensure consistent access regardless of caller's RLS context.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_result    jsonb;
BEGIN
  -- Authorization: only the user can export their own data
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'PGRST301';
  END IF;
  IF v_caller_id <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot export another user''s data' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'export_generated_at', NOW(),
    'user_id', p_user_id,

    -- Profile information
    'profile', (
      SELECT row_to_json(p)
      FROM (
        SELECT id, display_name, avatar_url, created_at, updated_at
        FROM profiles WHERE id = p_user_id
      ) p
    ),

    -- All visited/planned places
    'visited_places', (
      SELECT jsonb_agg(row_to_json(vp))
      FROM (
        SELECT id, country_code, city_id, category, overall_score, review,
               visited_date, planned_date, planned_budget, daily_budget,
               currency_code, notes, created_at, updated_at
        FROM visited_places WHERE user_id = p_user_id
        ORDER BY created_at DESC
      ) vp
    ),

    -- All place ratings
    'place_ratings', (
      SELECT jsonb_agg(row_to_json(pr))
      FROM (
        SELECT pr.id, pr.visited_place_id, pr.category, pr.score, pr.created_at
        FROM place_ratings pr
        JOIN visited_places vp ON vp.id = pr.visited_place_id
        WHERE vp.user_id = p_user_id
        ORDER BY pr.created_at DESC
      ) pr
    ),

    -- Photos (metadata only — storage paths for user to retrieve files separately)
    'place_photos', (
      SELECT jsonb_agg(row_to_json(ph))
      FROM (
        SELECT id, visited_place_id, storage_path, thumbnail_path,
               caption, sort_order, created_at
        FROM place_photos WHERE user_id = p_user_id
        ORDER BY created_at DESC
      ) ph
    ),

    -- Group memberships
    'group_memberships', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'group_id', g.id,
          'group_name', g.name,
          'joined_at', gm.joined_at,
          'color', gm.color,
          'is_creator', (g.created_by = p_user_id)
        )
      )
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = p_user_id
    ),

    -- Group places contributed
    'group_places', (
      SELECT jsonb_agg(row_to_json(gpl))
      FROM (
        SELECT id, group_id, country_code, city_id, category, created_at
        FROM group_places WHERE user_id = p_user_id
        ORDER BY created_at DESC
      ) gpl
    ),

    -- Achievements / badges
    'achievements', (
      SELECT jsonb_agg(row_to_json(ach))
      FROM (
        SELECT id, badge_type, unlocked_at
        FROM achievements WHERE user_id = p_user_id
        ORDER BY unlocked_at DESC
      ) ach
    ),

    -- Push token device types (not the tokens themselves — security risk)
    'registered_devices', (
      SELECT jsonb_agg(row_to_json(pt))
      FROM (
        SELECT id, device_type, enabled, created_at
        FROM push_tokens WHERE user_id = p_user_id
        ORDER BY created_at DESC
      ) pt
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Revoke direct execution from public
REVOKE ALL ON FUNCTION export_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;
