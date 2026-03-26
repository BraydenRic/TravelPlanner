-- =============================================================================
-- Migration 001: Initial Schema
-- Driftmark — Travel Tracker & Planner
-- =============================================================================
-- Security requirements implemented per THREAT_MODEL.md:
--   - AS-02: RLS will be enabled in 003_enable_rls.sql
--   - AS-05: Group invite code hashed (SHA-256), never stored plaintext
--   - AS-06: Text length constraints as last-line defense (M-06-E)
--   - AS-11: Uniqueness constraints prevent review flooding (M-11-C)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

-- Defines how a user categorizes a location
CREATE TYPE place_category AS ENUM ('been', 'want_to_go', 'lived');

-- The 10 rating dimensions a user can score
CREATE TYPE rating_category AS ENUM (
  'overall_experience',
  'safety',
  'food_cuisine',
  'transportation',
  'friendliness',
  'affordability',
  'cleanliness',
  'nightlife_entertainment',
  'natural_beauty',
  'wifi_connectivity'
);

-- Badge types for the achievements system
CREATE TYPE badge_type AS ENUM (
  'first_stamp',
  'continental',
  'globe_trotter',
  'critic',
  'squad_goals',
  'home_away',
  'city_explorer'
);

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 (M-02-E): publicly readable, self-editable only.
-- push_tokens and google_id are restricted to separate tables.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id       TEXT        NOT NULL UNIQUE,
  display_name    TEXT        NOT NULL
    CONSTRAINT display_name_length CHECK (
      char_length(display_name) BETWEEN 1 AND 30
    ),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: cities
-- READ-ONLY reference data. Never grant INSERT/UPDATE/DELETE to authenticated role.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-C (M-02-C): no write policies will be created in 003_enable_rls.sql.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cities (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code    CHAR(2)     NOT NULL
    CONSTRAINT country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  name            TEXT        NOT NULL,
  latitude        DECIMAL(9,6) NOT NULL,
  longitude       DECIMAL(9,6) NOT NULL,
  population_rank SMALLINT    NOT NULL,
  is_capital      BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE cities IS
  'READ-ONLY reference data. Never grant INSERT/UPDATE/DELETE to authenticated role.';

-- Index for fast country lookups (map drill-down)
CREATE INDEX IF NOT EXISTS idx_cities_country_code ON cities (country_code);

-- ---------------------------------------------------------------------------
-- Table: visited_places
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-A (M-02-A): all DML restricted to row owner via RLS.
-- Mitigates AS-06 T-06-E (M-06-E): text length hard limits.
-- Mitigates AS-11 T-11-C (M-11-C): unique constraints prevent flooding.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS visited_places (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_code    CHAR(2)       NOT NULL
    CONSTRAINT vp_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  city_id         UUID          REFERENCES cities(id) ON DELETE SET NULL,
  category        place_category NOT NULL DEFAULT 'been',
  overall_score   DECIMAL(3,2)  CHECK (overall_score BETWEEN 1 AND 5),
  review          TEXT
    CONSTRAINT review_max_length CHECK (char_length(review) <= 2000),
  visited_date    DATE,
  planned_date    DATE,
  planned_budget  DECIMAL(10,2)
    CONSTRAINT planned_budget_range CHECK (planned_budget >= 0 AND planned_budget <= 999999),
  daily_budget    DECIMAL(10,2)
    CONSTRAINT daily_budget_positive CHECK (daily_budget >= 0),
  currency_code   CHAR(3),
  notes           TEXT
    CONSTRAINT notes_max_length CHECK (char_length(notes) <= 1000),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Mitigates AS-11 T-11-C (M-11-C): one record per user per city
  CONSTRAINT unique_user_city UNIQUE (user_id, city_id),
  -- One country-level (no city) record per user per country
  CONSTRAINT unique_user_country_null_city UNIQUE NULLS NOT DISTINCT (user_id, country_code)
    DEFERRABLE INITIALLY IMMEDIATE
);

-- NOTE: The NULLS NOT DISTINCT constraint above requires PostgreSQL 15+.
-- Supabase runs PostgreSQL 15 — this is valid.

CREATE TRIGGER visited_places_set_updated_at
  BEFORE UPDATE ON visited_places
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_visited_places_user_country
  ON visited_places (user_id, country_code);
CREATE INDEX IF NOT EXISTS idx_visited_places_user_category
  ON visited_places (user_id, category);

-- ---------------------------------------------------------------------------
-- Table: place_ratings
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 (M-02-A): RLS enforces ownership via FK to visited_places.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS place_ratings (
  id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  visited_place_id  UUID           NOT NULL REFERENCES visited_places(id) ON DELETE CASCADE,
  category          rating_category NOT NULL,
  score             SMALLINT       NOT NULL
    CONSTRAINT score_range CHECK (score BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- One score per category per visited place
  CONSTRAINT unique_rating_per_category UNIQUE (visited_place_id, category)
);

CREATE INDEX IF NOT EXISTS idx_place_ratings_visited_place
  ON place_ratings (visited_place_id);

-- ---------------------------------------------------------------------------
-- Table: groups
-- ---------------------------------------------------------------------------
-- Mitigates AS-05 (M-05-A): invite code stored as SHA-256 hash, never plaintext.
-- The column is named invite_code_hash for clarity.
-- generate_invite_code() RPC (migration 002) returns the plain code once only.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL
    CONSTRAINT group_name_length CHECK (char_length(name) BETWEEN 1 AND 50),
  created_by          UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invite_code_hash    TEXT        UNIQUE,   -- SHA-256 hex of plain code; NULL after expiry or single use
  invite_expires_at   TIMESTAMPTZ,          -- NULL means no active invite
  color_scheme        JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Table: group_members
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-B (M-02-B): RLS restricts reads to group members.
-- Mitigates AS-05 T-05-D (M-05-D): trigger enforces 4-member limit atomically.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS group_members (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  color       TEXT        NOT NULL
    CONSTRAINT member_color_valid CHECK (
      color IN ('#00F5D4', '#F5A623', '#A78BFA', '#FF6B6B')
    ),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id
  ON group_members (group_id);

-- Group member limit trigger — Mitigates AS-05 T-05-D (M-05-D)
-- Uses FOR UPDATE lock to prevent race condition with concurrent inserts.
CREATE OR REPLACE FUNCTION enforce_group_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Lock existing rows for this group to prevent race condition
  IF (
    SELECT COUNT(*)
    FROM group_members
    WHERE group_id = NEW.group_id
    FOR UPDATE
  ) >= 4 THEN
    RAISE EXCEPTION 'Group is full (max 4 members)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_group_member_limit
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION enforce_group_member_limit();

-- ---------------------------------------------------------------------------
-- Table: group_places
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-B (M-02-B): RLS restricts access to group members.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS group_places (
  id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID           NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_code  CHAR(2)        NOT NULL
    CONSTRAINT gp_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  city_id       UUID           REFERENCES cities(id) ON DELETE SET NULL,
  category      place_category NOT NULL DEFAULT 'been',
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_places_group_country
  ON group_places (group_id, country_code);

-- ---------------------------------------------------------------------------
-- Table: place_photos
-- ---------------------------------------------------------------------------
-- Mitigates AS-03 (M-03-E, M-03-F): storage_path must be {user_id}/{uuid}.ext
-- Original images served via signed URL only; always display thumbnail_path.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS place_photos (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  visited_place_id  UUID        NOT NULL REFERENCES visited_places(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path      TEXT        NOT NULL, -- {user_id}/{uuid}.{ext} — path constructed server-side
  thumbnail_path    TEXT        NOT NULL,
  caption           TEXT
    CONSTRAINT caption_max_length CHECK (char_length(caption) <= 500),
  sort_order        SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Table: achievements
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-D (M-02-D): no user-facing INSERT policy.
-- Only SECURITY DEFINER functions (check_achievements) may write.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS achievements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type  badge_type  NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_type)
);

-- ---------------------------------------------------------------------------
-- Table: push_tokens
-- ---------------------------------------------------------------------------
-- Mitigates AS-09 T-09-A (M-09-A): RLS restricts to token owner.
-- Service-role key (Edge Functions) may read for sending.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_tokens (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token  TEXT        NOT NULL,
  device_type      TEXT        NOT NULL
    CONSTRAINT device_type_valid CHECK (device_type IN ('ios', 'android', 'web')),
  enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON push_tokens (user_id);
