-- =============================================================================
-- Migration 003: Enable Row Level Security
-- Driftmark — Travel Tracker & Planner
-- =============================================================================
-- Mitigates TOP-1 / AS-02 (M-02-A through M-02-E):
--   RLS is the primary authorization boundary. The Supabase anon key is
--   publicly embedded in the client bundle — RLS is the ONLY real guard.
--
-- NOTE: Actual RLS policies (USING / WITH CHECK clauses) are written by
--   the security agent in migration 004_rls_policies.sql.
--   Enabling RLS here without policies means all authenticated access is
--   DENIED by default until policies are added — this is the safe default.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all user-data tables
-- ---------------------------------------------------------------------------

-- User profiles — readable by all, writable by self only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reference data — SELECT only, no writes from any authenticated user
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- User travel records — strict owner-only access
ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;

-- Place ratings — owned by the visited_place owner
ALTER TABLE place_ratings ENABLE ROW LEVEL SECURITY;

-- Group data — readable/writable by members only
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_places ENABLE ROW LEVEL SECURITY;

-- Photos — owner only
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

-- Achievements — SELECT by owner; INSERT by SECURITY DEFINER functions only
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Push tokens — owner only (never exposed to other users)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Verification comment
-- ---------------------------------------------------------------------------
-- After applying this migration, verify with:
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected result: 0 rows (all tables have RLS enabled).
-- ---------------------------------------------------------------------------
