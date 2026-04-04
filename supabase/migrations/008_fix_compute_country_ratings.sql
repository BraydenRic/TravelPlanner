-- =============================================================================
-- Migration 008: Fix compute_country_ratings — nested aggregate bug
-- The original query used jsonb_object_agg(category, AVG(score)) which is
-- invalid in PostgreSQL (nested aggregate calls). Fixed by computing per-
-- category averages in a subquery first, then aggregating into JSONB.
-- =============================================================================

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
  v_overall  NUMERIC;
  v_cities   BIGINT;
  v_cats     JSONB;
BEGIN
  -- Mitigates AS-02 T-02-F (M-02-F): caller must be the queried user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate country code format
  IF p_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code';
  END IF;

  -- Overall score and city count from visited_places
  SELECT
    ROUND(AVG(vp.overall_score)::NUMERIC, 2),
    COUNT(DISTINCT vp.city_id) FILTER (WHERE vp.city_id IS NOT NULL)
  INTO v_overall, v_cities
  FROM visited_places vp
  WHERE vp.user_id = p_user_id
    AND vp.country_code = p_country_code;

  -- Per-category averages via subquery (avoids nested aggregate)
  SELECT COALESCE(jsonb_object_agg(cat, avg_score), '{}'::JSONB)
  INTO v_cats
  FROM (
    SELECT pr.category AS cat, ROUND(AVG(pr.score)::NUMERIC, 2) AS avg_score
    FROM visited_places vp
    JOIN place_ratings pr ON pr.visited_place_id = vp.id
    WHERE vp.user_id = p_user_id
      AND vp.country_code = p_country_code
    GROUP BY pr.category
  ) cat_avgs;

  RETURN jsonb_build_object(
    'country_code', p_country_code,
    'overall_score', v_overall,
    'cities_rated',  v_cities,
    'categories',    COALESCE(v_cats, '{}'::JSONB)
  );
END;
$$;
