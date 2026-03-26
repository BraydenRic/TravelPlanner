# Driftmark — Database Documentation

**Version**: 1.0
**Date**: 2026-03-24
**Database**: PostgreSQL 15 (Supabase)

---

## 1. Table Reference

### 1.1 `profiles`

Stores user profile data synced from Google OAuth.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | Matches `auth.users.id` |
| `google_id` | `TEXT` | NOT NULL, UNIQUE | Google subject claim |
| `display_name` | `TEXT` | NOT NULL, 1–30 chars | Sanitized via Zod + DOMPurify (AS-06) |
| `avatar_url` | `TEXT` | NULLABLE | Google profile photo URL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**RLS**: SELECT public (any authenticated user); UPDATE self only.
**Security note (M-02-E)**: `push_tokens` and `google_id` are restricted. `google_id` is in `profiles` but the RLS SELECT policy for other users should not expose it — consider a view that strips it.

---

### 1.2 `cities`

Read-only reference dataset of world cities. Pre-seeded; never writable by users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `country_code` | `CHAR(2)` | NOT NULL, `^[A-Z]{2}$` | ISO 3166-1 alpha-2 |
| `name` | `TEXT` | NOT NULL | City name |
| `latitude` | `DECIMAL(9,6)` | NOT NULL | WGS84 |
| `longitude` | `DECIMAL(9,6)` | NOT NULL | WGS84 |
| `population_rank` | `SMALLINT` | NOT NULL | Lower = larger city |
| `is_capital` | `BOOLEAN` | NOT NULL, DEFAULT false | National capital |

**RLS**: SELECT only (no INSERT/UPDATE/DELETE policies).
**Security note (M-02-C)**: `COMMENT ON TABLE cities IS 'READ-ONLY reference data. Never grant INSERT/UPDATE/DELETE to authenticated role.'`

**Indexes**:
- `idx_cities_country_code (country_code)` — used by `get_country_city_status()` and map drill-down

---

### 1.3 `visited_places`

A user's record of visiting (or planning to visit) a country or city.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | Owner |
| `country_code` | `CHAR(2)` | NOT NULL, `^[A-Z]{2}$` | |
| `city_id` | `UUID` | NULLABLE, FK→cities SET NULL | NULL = country-level record |
| `category` | `place_category` | NOT NULL, DEFAULT 'been' | Enum: been/want_to_go/lived |
| `overall_score` | `DECIMAL(3,2)` | CHECK 1–5 | Computed from ratings or manual |
| `review` | `TEXT` | ≤ 2000 chars | Sanitized UGC |
| `visited_date` | `DATE` | NULLABLE | When user visited |
| `planned_date` | `DATE` | NULLABLE | For want_to_go entries |
| `planned_budget` | `DECIMAL(10,2)` | ≥ 0, ≤ 999999 | Trip budget |
| `daily_budget` | `DECIMAL(10,2)` | ≥ 0 | Per-day spend |
| `currency_code` | `CHAR(3)` | NULLABLE | ISO 4217 |
| `notes` | `TEXT` | ≤ 1000 chars | Private notes |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Unique constraints**:
- `UNIQUE (user_id, city_id)` — prevents duplicate city records
- `UNIQUE NULLS NOT DISTINCT (user_id, country_code)` WHERE city_id IS NULL — one country-level record per user

**RLS**: Owner-only for all operations (SELECT/INSERT/UPDATE/DELETE).

**Indexes**:
- `idx_visited_places_user_country (user_id, country_code)` — map rendering
- `idx_visited_places_user_category (user_id, category)` — stats queries

---

### 1.4 `place_ratings`

Individual category scores for a visited place.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `visited_place_id` | `UUID` | NOT NULL, FK→visited_places CASCADE | |
| `category` | `rating_category` | NOT NULL | Enum of 10 categories |
| `score` | `SMALLINT` | NOT NULL, CHECK 1–5 | Star rating |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Unique**: `(visited_place_id, category)` — one score per category per place.

**RLS**: Accessible only to owner of the parent `visited_place` (verified via JOIN in policy).

**Indexes**:
- `idx_place_ratings_visited_place (visited_place_id)` — aggregation queries

---

### 1.5 `groups`

A travel group of up to 4 members.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `TEXT` | NOT NULL, 1–50 chars | |
| `created_by` | `UUID` | NOT NULL, FK→profiles RESTRICT | |
| `invite_code_hash` | `TEXT` | UNIQUE, NULLABLE | SHA-256 of plain code; NULL after use/expiry |
| `invite_expires_at` | `TIMESTAMPTZ` | NULLABLE | Expiry for current invite |
| `color_scheme` | `JSONB` | NOT NULL, DEFAULT '{}' | Member color assignments |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Security note (M-05-A)**: The column is `invite_code_hash`, not `invite_code`. The plain code is returned by `generate_invite_code()` once and never stored.

---

### 1.6 `group_members`

Membership join table between groups and users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `group_id` | `UUID` | NOT NULL, FK→groups CASCADE | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | |
| `color` | `TEXT` | CHECK IN 4 member colors | Map display color |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

**Unique**: `(group_id, user_id)`.

**Trigger**: `check_group_member_limit` BEFORE INSERT — raises exception if `COUNT(*) >= 4` with `FOR UPDATE` lock to prevent race conditions (M-05-D).

**Indexes**:
- `idx_group_members_group_id (group_id)` — membership checks

---

### 1.7 `group_places`

Places added to a group's shared map view.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `group_id` | `UUID` | NOT NULL, FK→groups CASCADE | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | |
| `country_code` | `CHAR(2)` | NOT NULL, `^[A-Z]{2}$` | |
| `city_id` | `UUID` | NULLABLE, FK→cities SET NULL | |
| `category` | `place_category` | NOT NULL, DEFAULT 'been' | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**RLS**: SELECT/INSERT/DELETE by group members only.

**Indexes**:
- `idx_group_places_group_country (group_id, country_code)` — group map rendering

---

### 1.8 `place_photos`

Photos attached to a visited place.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `visited_place_id` | `UUID` | NOT NULL, FK→visited_places CASCADE | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | |
| `storage_path` | `TEXT` | NOT NULL | `{user_id}/{uuid}.ext` — server-generated |
| `thumbnail_path` | `TEXT` | NOT NULL | Used for all display |
| `caption` | `TEXT` | NULLABLE, ≤ 500 chars | |
| `sort_order` | `SMALLINT` | NOT NULL, DEFAULT 0 | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Security notes**:
- `storage_path` path must start with `auth.uid()` (enforced by Storage RLS policy, M-03-E)
- `storage_path` (original) only served via signed URL with 300s TTL (M-03-F)
- App must always use `thumbnail_path` for display

---

### 1.9 `achievements`

Badges earned by users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | |
| `badge_type` | `badge_type` | NOT NULL | Enum |
| `unlocked_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

**Unique**: `(user_id, badge_type)`.

**RLS**: SELECT by owner; no user-facing INSERT (M-02-D). Only `check_achievements()` SECURITY DEFINER may write.

---

### 1.10 `push_tokens`

Expo push tokens for notification delivery.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | NOT NULL, FK→profiles CASCADE | |
| `expo_push_token` | `TEXT` | NOT NULL | ExponentPushToken[...] |
| `device_type` | `TEXT` | CHECK IN ('ios','android','web') | |
| `enabled` | `BOOLEAN` | NOT NULL, DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**RLS**: Owner-only for all operations (M-09-A). Service-role key (Edge Functions only) may bypass RLS to read tokens for sending.

**Indexes**:
- `idx_push_tokens_user_id (user_id)`

---

## 2. Relationships

```
profiles
  ├─< visited_places (user_id)
  │     ├─< place_ratings (visited_place_id)
  │     └─< place_photos (visited_place_id)
  ├─< group_members (user_id)
  ├─< group_places (user_id)
  ├─< achievements (user_id)
  └─< push_tokens (user_id)

groups
  ├─< group_members (group_id)
  └─< group_places (group_id)

cities
  ├─< visited_places (city_id)
  └─< group_places (city_id)
```

---

## 3. Enums

| Enum | Values |
|------|--------|
| `place_category` | `been`, `want_to_go`, `lived` |
| `rating_category` | `overall_experience`, `safety`, `food_cuisine`, `transportation`, `friendliness`, `affordability`, `cleanliness`, `nightlife_entertainment`, `natural_beauty`, `wifi_connectivity` |
| `badge_type` | `first_stamp`, `continental`, `globe_trotter`, `critic`, `squad_goals`, `home_away`, `city_explorer` |

---

## 4. Database Functions (RPC)

All functions are called via `supabase.rpc('function_name', { params })`.

### 4.1 `compute_country_ratings(p_country_code, p_user_id)`

Returns aggregated ratings for a user's visits to a country.

- **Security**: `SECURITY INVOKER`; `auth.uid() != p_user_id` raises exception
- **Returns**: `JSONB` with `overall_score`, `cities_rated`, `categories` map

### 4.2 `compute_group_country_ratings(p_group_id, p_country_code)`

Returns per-member and group average ratings for a country.

- **Security**: `SECURITY INVOKER`; verifies caller is a group member
- **Returns**: `JSONB` with `group_overall`, `group_average`, `member_ratings` array

### 4.3 `get_country_city_status(p_country_code, p_user_id)`

Returns all cities in a country with visited status.

- **Security**: `SECURITY INVOKER`; `auth.uid()` check
- **Returns**: `TABLE` with city details + visit status

### 4.4 `get_country_fill_intensity(p_user_id)`

Returns per-country fill ratio for map choropleth.

- **Security**: `SECURITY INVOKER`; `auth.uid()` check
- **Returns**: `TABLE (country_code, cities_visited, total_cities, fill_ratio)`

### 4.5 `check_achievements(p_user_id)`

Checks and inserts newly earned badges.

- **Security**: `SECURITY DEFINER` (needs to write achievements); strict `auth.uid()` check
- **Logic**: first_stamp, critic (10+ rated), globe_trotter (50+ countries), squad_goals (any group), home_away (2+ lived countries), continental (4+ continents), city_explorer (5+ cities in one country)

### 4.6 `get_travel_stats(p_user_id)`

Returns aggregate travel statistics.

- **Security**: `SECURITY INVOKER`; `auth.uid()` check
- **Returns**: `JSONB` with counts, percentages, averages

### 4.7 `get_group_map_data(p_group_id)`

Returns all members and their places for group map rendering.

- **Security**: `SECURITY INVOKER`; verifies caller is a group member
- **Returns**: `JSONB` with `members` and `places` arrays

### 4.8 `generate_invite_code(p_group_id)`

Generates a cryptographically secure invite code.

- **Security**: `SECURITY DEFINER`; only group creator may call; group must not be full
- **Returns**: `TEXT` — plain code returned ONCE; SHA-256 hash stored in DB
- **Entropy**: 128 bits via `gen_random_bytes(16)` — brute-force infeasible

---

## 5. Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `cities` | `idx_cities_country_code` | `(country_code)` | Map drill-down |
| `visited_places` | `idx_visited_places_user_country` | `(user_id, country_code)` | Map rendering |
| `visited_places` | `idx_visited_places_user_category` | `(user_id, category)` | Stats queries |
| `place_ratings` | `idx_place_ratings_visited_place` | `(visited_place_id)` | Aggregations |
| `group_members` | `idx_group_members_group_id` | `(group_id)` | Membership checks |
| `group_places` | `idx_group_places_group_country` | `(group_id, country_code)` | Group map |
| `push_tokens` | `idx_push_tokens_user_id` | `(user_id)` | Token lookup |

---

## 6. Performance Considerations

- **Never** use `SELECT *` — always specify columns to minimize row size and prevent over-exposure.
- `get_country_fill_intensity()` scans the entire `cities` table joined with `visited_places`. Cache the result in the Zustand store and invalidate on `visited_places` mutations.
- `compute_country_ratings()` uses a GROUP BY — ensure `visited_places(user_id, country_code)` index is used (verified via `EXPLAIN ANALYZE`).
- `check_achievements()` runs multiple COUNT queries — call once after a batch of saves, not after each individual save.
- For timeline pagination, use cursor-based pagination on `visited_date DESC, id` to avoid offset scans.
- The `cities` table (~3,000 rows) fits in the PostgreSQL shared buffer pool — no special caching needed.
