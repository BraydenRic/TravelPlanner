-- ============================================================
-- Migration 007: Auth Trigger — Driftmark
-- Automatically creates a profiles row when a new user signs up
-- via Supabase Auth (Google OAuth).
-- ============================================================
-- Mitigates AS-01 (M-01-A): profiles are created atomically on
-- signup — no window where a user exists in auth.users but not
-- in public.profiles.
--
-- SECURITY DEFINER: runs as the function owner, not as the
-- calling user. This is required because the trigger fires on
-- auth.users (a system table) and must write to public.profiles.
-- search_path is pinned to 'public' to prevent search_path
-- injection attacks (THREAT_MODEL AS-07).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, google_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- provider_id is the Google sub (subject) identifier
    NEW.raw_user_meta_data->>'provider_id',
    -- Prefer full_name, fall back to name, then default to 'Traveler'
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      'Traveler'
    ),
    -- Avatar URL from Google OAuth profile picture
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  -- ON CONFLICT: idempotent in case of trigger replay or duplicate calls.
  -- A conflict on `id` means the profile already exists — safe to skip.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the trigger if it already exists (idempotent migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
