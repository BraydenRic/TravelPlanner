-- =============================================================================
-- Migration 002: Database Functions (RPC)
-- Driftmark — Travel Tracker & Planner
-- =============================================================================
-- Security requirements implemented per THREAT_MODEL.md:
--   - AS-02 T-02-F (M-02-F): All functions validate auth.uid() = p_user_id
--     before any DML. SECURITY DEFINER only where required; SET search_path
--     is always explicit to prevent search_path injection.
--   - AS-05 T-05-A/B (M-05-A/B): generate_invite_code uses 128-bit entropy,
--     stores SHA-256 hash only, returns plain code once.
--   - Parameterized queries only — no string concatenation in SQL.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Function: compute_country_ratings
-- Returns per-category and overall average ratings for all of a user's
-- visits in a given country.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-F (M-02-F): SECURITY INVOKER — operates under caller's
-- RLS context. Auth check still performed explicitly.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION compute_country_ratings(
  p_country_code TEXT,
  p_user_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F): caller must be the queried user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate country code format
  IF p_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code';
  END IF;

  SELECT jsonb_build_object(
    'country_code',   p_country_code,
    'overall_score',  ROUND(AVG(vp.overall_score)::NUMERIC, 2),
    'cities_rated',   COUNT(DISTINCT vp.city_id) FILTER (WHERE vp.city_id IS NOT NULL),
    'categories',     COALESCE(
      jsonb_object_agg(pr.category, ROUND(AVG(pr.score)::NUMERIC, 2))
      FILTER (WHERE pr.category IS NOT NULL),
      '{}'::JSONB
    )
  )
  INTO v_result
  FROM visited_places vp
  LEFT JOIN place_ratings pr ON pr.visited_place_id = vp.id
  WHERE vp.user_id = p_user_id
    AND vp.country_code = p_country_code
  GROUP BY vp.user_id, vp.country_code;

  RETURN COALESCE(v_result, jsonb_build_object(
    'country_code', p_country_code,
    'overall_score', NULL,
    'cities_rated', 0,
    'categories', '{}'::JSONB
  ));
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: compute_group_country_ratings
-- Returns each member's ratings and group averages for a country.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-B (M-02-B): Verifies caller is a group member.
-- SECURITY INVOKER — relies on RLS for underlying table access.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION compute_group_country_ratings(
  p_group_id     UUID,
  p_country_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_result    JSONB;
BEGIN
  -- Verify caller is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate country code
  IF p_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code';
  END IF;

  WITH member_ratings AS (
    SELECT
      gm.user_id,
      gm.color,
      pr.category,
      AVG(pr.score)::NUMERIC AS avg_score,
      AVG(vp.overall_score)::NUMERIC AS overall
    FROM group_members gm
    JOIN visited_places vp
      ON vp.user_id = gm.user_id
      AND vp.country_code = p_country_code
    LEFT JOIN place_ratings pr ON pr.visited_place_id = vp.id
    WHERE gm.group_id = p_group_id
    GROUP BY gm.user_id, gm.color, pr.category, vp.user_id
  )
  SELECT jsonb_build_object(
    'country_code',   p_country_code,
    'group_overall',  ROUND(AVG(overall), 2),
    'group_average',  COALESCE(
      jsonb_object_agg(category, ROUND(AVG(avg_score), 2))
      FILTER (WHERE category IS NOT NULL),
      '{}'::JSONB
    ),
    'member_ratings', COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'user_id', user_id,
        'color',   color,
        'overall', ROUND(overall, 2),
        'categories', '{}'::JSONB
      )),
      '[]'::JSONB
    )
  )
  INTO v_result
  FROM member_ratings;

  RETURN COALESCE(v_result, jsonb_build_object(
    'country_code',   p_country_code,
    'group_overall',  NULL,
    'group_average',  '{}'::JSONB,
    'member_ratings', '[]'::JSONB
  ));
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: get_country_city_status
-- Returns all cities in a country with the user's visited status.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-F (M-02-F): explicit auth.uid() check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_country_city_status(
  p_country_code TEXT,
  p_user_id      UUID
)
RETURNS TABLE (
  city_id         UUID,
  city_name       TEXT,
  latitude        DECIMAL(9,6),
  longitude       DECIMAL(9,6),
  is_capital      BOOLEAN,
  population_rank SMALLINT,
  is_visited      BOOLEAN,
  category        place_category,
  overall_score   DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F)
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code';
  END IF;

  RETURN QUERY
  SELECT
    c.id              AS city_id,
    c.name            AS city_name,
    c.latitude,
    c.longitude,
    c.is_capital,
    c.population_rank,
    (vp.id IS NOT NULL) AS is_visited,
    vp.category,
    vp.overall_score
  FROM cities c
  LEFT JOIN visited_places vp
    ON vp.city_id = c.id
    AND vp.user_id = p_user_id
  WHERE c.country_code = p_country_code
  ORDER BY c.is_capital DESC, c.population_rank ASC;
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: get_country_fill_intensity
-- Returns per-country fill ratio for map choropleth coloring.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-F (M-02-F): explicit auth.uid() check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_country_fill_intensity(
  p_user_id UUID
)
RETURNS TABLE (
  country_code   CHAR(2),
  cities_visited BIGINT,
  total_cities   BIGINT,
  fill_ratio     DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F)
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    c.country_code,
    COUNT(vp.id)            AS cities_visited,
    COUNT(c.id)             AS total_cities,
    CASE WHEN COUNT(c.id) = 0 THEN 0::DECIMAL(5,4)
         ELSE ROUND((COUNT(vp.id)::DECIMAL / COUNT(c.id)::DECIMAL)::NUMERIC, 4)
    END                     AS fill_ratio
  FROM cities c
  LEFT JOIN visited_places vp
    ON vp.city_id = c.id
    AND vp.user_id = p_user_id
  GROUP BY c.country_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: check_achievements
-- Inserts newly earned badges for a user. SECURITY DEFINER required because
-- the authenticated role has no INSERT policy on achievements.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-D (M-02-D): SECURITY DEFINER with strict auth check.
-- Mitigates AS-02 T-02-F (M-02-F): explicit auth.uid() validation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_achievements(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_count    INTEGER;
  v_city_count       INTEGER;
  v_rated_count      INTEGER;
  v_continent_count  INTEGER;
  v_lived_count      INTEGER;
  v_group_count      INTEGER;
  v_city_in_country  INTEGER;
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F): caller must be the user being checked
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Gather stats
  SELECT COUNT(DISTINCT country_code) INTO v_country_count
  FROM visited_places WHERE user_id = p_user_id AND category = 'been';

  SELECT COUNT(DISTINCT city_id) INTO v_city_count
  FROM visited_places WHERE user_id = p_user_id AND city_id IS NOT NULL;

  SELECT COUNT(*) INTO v_rated_count
  FROM visited_places WHERE user_id = p_user_id AND overall_score IS NOT NULL;

  SELECT COUNT(*) INTO v_group_count
  FROM group_members WHERE user_id = p_user_id;

  SELECT COUNT(DISTINCT country_code) INTO v_lived_count
  FROM visited_places WHERE user_id = p_user_id AND category = 'lived';

  -- Badge: first_stamp — any visited place
  IF EXISTS (SELECT 1 FROM visited_places WHERE user_id = p_user_id LIMIT 1) THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'first_stamp')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: critic — 10+ rated places
  IF v_rated_count >= 10 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'critic')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: globe_trotter — 50+ countries visited
  IF v_country_count >= 50 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'globe_trotter')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: squad_goals — member of any group
  IF v_group_count >= 1 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'squad_goals')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: home_away — lived in 2+ countries
  IF v_lived_count >= 2 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'home_away')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: continental — visited places on 4+ continents
  -- Uses the COUNTRIES reference via a simplified in-DB mapping
  -- (continent is stored in the app layer; DB approximates via city counts per region)
  -- For a full implementation, a country_continents lookup table is recommended.
  -- Placeholder logic: 4+ distinct country prefixes across broad ISO ranges
  SELECT COUNT(*) INTO v_continent_count
  FROM (
    SELECT DISTINCT
      CASE
        WHEN country_code IN ('AF','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','DJ',
                              'EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','CI','KE','LS','LR',
                              'LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN',
                              'SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW') THEN 'Africa'
        WHEN country_code IN ('AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY','GE','IN','ID','IR',
                              'IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MY','MV','MN','MM','NP',
                              'KP','OM','PK','PS','PH','QA','SA','SG','KR','LK','SY','TW','TJ','TH',
                              'TL','TR','TM','AE','UZ','VN','YE') THEN 'Asia'
        WHEN country_code IN ('AL','AD','AT','BY','BE','BA','BG','HR','CZ','DK','EE','FI','FR','DE',
                              'GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME',
                              'NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH',
                              'UA','GB','VA') THEN 'Europe'
        WHEN country_code IN ('AG','BS','BB','BZ','CA','CR','CU','DM','DO','SV','GD','GT','HT','HN',
                              'JM','MX','NI','PA','KN','LC','VC','TT','US') THEN 'North America'
        WHEN country_code IN ('AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE') THEN 'South America'
        WHEN country_code IN ('AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU') THEN 'Oceania'
        ELSE 'Unknown'
      END AS continent
    FROM visited_places
    WHERE user_id = p_user_id AND category = 'been'
  ) continents
  WHERE continent != 'Unknown';

  IF v_continent_count >= 4 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'continental')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Badge: city_explorer — 5+ cities rated in one country
  SELECT MAX(city_count) INTO v_city_in_country
  FROM (
    SELECT country_code, COUNT(DISTINCT city_id) AS city_count
    FROM visited_places
    WHERE user_id = p_user_id
      AND city_id IS NOT NULL
      AND overall_score IS NOT NULL
    GROUP BY country_code
  ) country_cities;

  IF COALESCE(v_city_in_country, 0) >= 5 THEN
    INSERT INTO achievements (user_id, badge_type)
    VALUES (p_user_id, 'city_explorer')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: get_travel_stats
-- Returns aggregate travel statistics for a user.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-F (M-02-F): explicit auth.uid() check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_travel_stats(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F)
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'countries_visited',     COUNT(DISTINCT country_code) FILTER (WHERE category = 'been'),
    'cities_visited',        COUNT(DISTINCT city_id) FILTER (WHERE city_id IS NOT NULL AND category = 'been'),
    'countries_want',        COUNT(DISTINCT country_code) FILTER (WHERE category = 'want_to_go'),
    'countries_lived',       COUNT(DISTINCT country_code) FILTER (WHERE category = 'lived'),
    'world_percentage',      ROUND(
      (COUNT(DISTINCT country_code) FILTER (WHERE category = 'been')::DECIMAL / 195) * 100, 1
    ),
    'average_global_rating', ROUND(AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL)::NUMERIC, 2),
    'continents_visited',    '[]'::JSONB  -- Populated by application layer from country list
  )
  INTO v_stats
  FROM visited_places
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_stats, jsonb_build_object(
    'countries_visited',     0,
    'cities_visited',        0,
    'countries_want',        0,
    'countries_lived',       0,
    'world_percentage',      0,
    'average_global_rating', NULL,
    'continents_visited',    '[]'::JSONB
  ));
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: get_group_map_data
-- Returns all members and their places for group map rendering.
-- ---------------------------------------------------------------------------
-- Mitigates AS-02 T-02-B (M-02-B): caller must be a group member.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_group_map_data(
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_result    JSONB;
BEGIN
  -- Verify caller is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'group_id', p_group_id,
    'members', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id',      gm.user_id,
          'color',        gm.color,
          'display_name', p.display_name
        ))
        FROM group_members gm
        JOIN profiles p ON p.id = gm.user_id
        WHERE gm.group_id = p_group_id
      ),
      '[]'::JSONB
    ),
    'places', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id',      gm.user_id,
          'color',        gm.color,
          'country_code', gp.country_code,
          'city_id',      gp.city_id,
          'category',     gp.category
        ))
        FROM group_places gp
        JOIN group_members gm
          ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
        WHERE gp.group_id = p_group_id
      ),
      '[]'::JSONB
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: generate_invite_code
-- Generates a cryptographically secure invite code for a group.
-- Returns the plain code ONCE — only the SHA-256 hash is stored.
-- ---------------------------------------------------------------------------
-- Mitigates AS-05 T-05-A (M-05-A): 128-bit entropy via gen_random_bytes(16).
-- Mitigates AS-05 T-05-B (M-05-B): expiry enforced server-side.
-- SECURITY DEFINER: needed to write invite_code_hash without exposing the column.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_invite_code(
  p_group_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_raw_code  TEXT;
  v_code_hash TEXT;
  v_expiry    TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Only the group creator can generate an invite code
  IF NOT EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id AND created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Verify group is not full (no point generating a code for a full group)
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id) >= 4 THEN
    RAISE EXCEPTION 'Group is full (max 4 members)';
  END IF;

  -- Generate 128 bits of cryptographic randomness (Mitigates AS-05 T-05-A, M-05-A)
  -- encode as base64url produces ~22 characters — brute-force infeasible
  v_raw_code := encode(gen_random_bytes(16), 'base64');

  -- Store SHA-256 hash only — plain code is never persisted (Mitigates AS-05 M-05-A)
  v_code_hash := encode(digest(v_raw_code, 'sha256'), 'hex');

  UPDATE groups
  SET invite_code_hash  = v_code_hash,
      invite_expires_at = v_expiry
  WHERE id = p_group_id;

  -- Return plain code ONCE — caller must display it to the user immediately
  RETURN v_raw_code;
END;
$$;
