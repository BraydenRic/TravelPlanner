# Driftmark — Security Documentation

**Version**: 1.0
**Date**: 2026-03-24
**Author**: Security Agent
**Status**: ACTIVE — reflects Phase 1 security implementation

---

## Table of Contents

1. [Authentication Architecture](#1-authentication-architecture)
2. [RLS Policy Overview](#2-rls-policy-overview)
3. [Input Validation Pipeline](#3-input-validation-pipeline)
4. [Photo Security Pipeline](#4-photo-security-pipeline)
5. [Invite Code Security](#5-invite-code-security)
6. [Rate Limiting](#6-rate-limiting)
7. [Session Management](#7-session-management)
8. [GDPR Compliance](#8-gdpr-compliance)
9. [Known Limitations & Future Improvements](#9-known-limitations--future-improvements)
10. [Security Contact](#10-security-contact)

---

## 1. Authentication Architecture

### Overview

Driftmark uses Google OAuth 2.0 via Supabase Auth. There are no passwords — all authentication flows through Google's identity provider. Supabase issues a short-lived JWT (1 hour) and a refresh token (30 days of inactivity).

### Components

| Component | File | Role |
|---|---|---|
| Supabase Auth | Hosted service | Issues and validates JWTs, manages OAuth state |
| `src/lib/auth.ts` | Client module | Wraps Supabase client, exposes `signInWithGoogle`, `signOut`, `getSession`, `getCurrentUser`, `checkSessionTimeout` |
| `expo-secure-store` | Native library | Stores session tokens in OS Keychain (iOS) / EncryptedSharedPreferences (Android) |
| `supabase/migrations/007_auth_trigger.sql` | DB trigger | Auto-creates `profiles` row on new user signup |

### Token Storage

**Native (iOS / Android)**: Session tokens are stored via `expo-secure-store`, which uses hardware-backed secure storage (iOS Keychain, Android Keystore). This is explicitly **not** `AsyncStorage`, which writes to an unencrypted SQLite file readable on rooted devices. See `ExpoSecureStoreAdapter` in `src/lib/auth.ts`.

**Web**: The Supabase client should be configured to use `sessionStorage` (tab-scoped, cleared on tab close) rather than `localStorage` to limit XSS exposure. A future improvement is to use `httpOnly` cookies with a server-side session adapter.

### JWT Flow

```
User taps "Sign In with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: 'driftmark://auth/callback' })
  → Google OAuth consent
  → Supabase exchanges code for tokens
  → JWT + refresh token stored in SecureStore
  → handle_new_user() trigger creates profiles row
  → App receives authenticated session
```

### Session Profile Creation

The `handle_new_user()` trigger in `007_auth_trigger.sql` fires `AFTER INSERT ON auth.users`. It creates a `profiles` row atomically with the auth record, eliminating any window where a user exists in `auth.users` but not in `public.profiles`. The trigger uses `ON CONFLICT (id) DO NOTHING` for idempotency.

---

## 2. RLS Policy Overview

### Philosophy

The Supabase anon key is embedded in the client bundle and is therefore **public**. It cannot be revoked without deploying a new build. Row Level Security (RLS) is the **only** real authorization boundary between authenticated users' data.

Every table that holds user data has RLS enabled (see `003_enable_rls.sql`) and explicit `USING` / `WITH CHECK` policies (see `004_rls_policies.sql`). RLS is enabled before policies are added — the safe default is deny-all.

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Public (all authenticated) | Trigger only | Self only | — |
| `cities` | Public (all authenticated) | None | None | None |
| `visited_places` | Owner only | Owner only | Owner only | Owner only |
| `place_ratings` | Via visited_place owner | Via visited_place owner | Via visited_place owner | Via visited_place owner |
| `groups` | Members only | Self (created_by) | Creator only | Creator only |
| `group_members` | Members of same group | Self (user_id) | — | Self or creator |
| `group_places` | Members of same group | Self + member check | — | Owner only |
| `place_photos` | Owner only | Owner + visited_place check | — | Owner only |
| `achievements` | Owner only | SECURITY DEFINER only | SECURITY DEFINER only | SECURITY DEFINER only |
| `push_tokens` | Owner only | Owner only | Owner only | Owner only |

### Key Design Decisions

**`place_ratings` ownership via JOIN**: `place_ratings` does not have a `user_id` column. Ownership is established by joining to `visited_places` and checking `vp.user_id = auth.uid()`. This is correct and cannot be bypassed by manipulating `visited_place_id` to point to another user's place, because the EXISTS subquery checks both the FK match and the ownership.

**`achievements` no user INSERT**: The only way to earn a badge is via the `check_achievements()` SECURITY DEFINER function triggered by place writes. No RLS INSERT policy exists for authenticated users — even a direct PostgREST call with a valid JWT is rejected.

**`cities` read-only**: No INSERT/UPDATE/DELETE policies exist. The table comment and migration annotation both document this. Any future admin seeding must use the service-role key directly, never an RLS policy.

---

## 3. Input Validation Pipeline

### Layers

Every user input passes through three layers before reaching the database:

```
User Input
  → [Layer 1] Zod schema (src/lib/validation.ts)
      — Type checking, length limits, format regex, enum membership
  → [Layer 2] Sanitization (src/lib/sanitize.ts)
      — HTML entity escaping, tag stripping
  → [Layer 3] Database CHECK constraints (001_initial_schema.sql)
      — Last-resort enforcement (e.g. char_length <= 2000)
```

### Zod Schemas

All schemas in `src/lib/validation.ts` mirror the database constraints exactly:

- `countryCodeSchema`: exactly 2 uppercase ASCII letters (`^[A-Z]{2}$`)
- `currencyCodeSchema`: exactly 3 uppercase ASCII letters (`^[A-Z]{3}$`)
- `ratingScoreSchema`: integer 1–5 (matches `score BETWEEN 1 AND 5`)
- `displayNameSchema`: 1–30 chars, no HTML special characters (`^[^<>&"'\`]*$`)
- `groupNameSchema`: 1–50 chars, no HTML special characters
- `reviewSchema`: max 2000 chars (matches `char_length(review) <= 2000`)
- `inviteCodeSchema`: exactly 32 lowercase hex chars (prevents short guessable codes)

### XSS Prevention

The regex `^[^<>&"'\`]*$` on all free-text display fields rejects the characters necessary to construct HTML tags, script injection, and attribute-breaking payloads. Examples that are rejected:

- `<script>alert('xss')</script>` — contains `<`, `>`, `'`
- `"><img src=x onerror=alert(1)>` — contains `"`, `<`, `>`
- `javascript:alert(1)` — passes Zod (no special chars), but `sanitizeForStorage` strips it as plain text; it is never rendered as a URL

### SQL Injection Prevention

Supabase's PostgREST layer uses parameterized queries for all operations — string values are never interpolated into SQL. Zod schema validation provides an additional layer by:

- Rejecting non-UUID strings for UUID fields
- Rejecting values outside enum sets (e.g. `category` must be `been|want_to_go|lived`)
- Rejecting non-numeric values for numeric fields
- Validating country/currency codes to known safe formats

SQL injection via the PostgREST API is not a realistic attack vector, but Zod ensures that even internally constructed queries use typed, validated data.

---

## 4. Photo Security Pipeline

### The EXIF Problem

JPEG photos taken on smartphones embed a rich EXIF block that includes:
- `GPSLatitude` / `GPSLongitude` / `GPSAltitude` — precise physical location
- `DateTimeOriginal` — when (and implicitly where) the photo was taken
- `Make` / `Model` / `Software` — device fingerprinting
- `CameraSerialNumber` — unique device identifier

Supabase Storage serves files as-is. Without stripping, any user with a file URL (or any future public share feature) can extract these coordinates using freely available tools (`exiftool`, online EXIF viewers, etc.).

### Pipeline (`src/lib/photoSecurity.ts`)

```
User selects photo from gallery / camera
  → validateFileSize()   — reject if > 5 MB (prevents OOM during processing)
  → validateImageMagicBytes()  — confirm JPEG/PNG/WebP via file header bytes
                                  (prevents MIME type spoofing)
  → stripExifData()      — re-encode via expo-image-manipulator
                            (re-encoding from pixel data drops all metadata)
  → compressForUpload()  — compress to < 1 MB (quality 0.85, fallback 0.7)
  → createThumbnail()    — 200×200 JPEG for list/map display
  → upload to Supabase Storage at path: {user_id}/{uuid}.jpg
```

### Magic Byte Validation

File type is validated against cryptographic signatures (magic bytes), not file extension or Content-Type header:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- WebP: `52 49 46 46` + `57 45 42 50` at offset 8 (RIFF...WEBP)

A file named `malware.php` with a JPEG header that is actually PHP code will be rejected at the magic byte check if the first 3 bytes don't match, and will be re-encoded as a true JPEG if they do (which overwrites the embedded content).

### Storage Bucket Security

The `place-photos` bucket is **private** (`public: false`). Files are only accessible to:
1. The owning user (via Storage RLS policy in `005_storage_policies.sql`)
2. The application backend with service-role key (for generating signed URLs)

Original photos are served only via short-lived signed URLs generated server-side. Thumbnails are stored in the same bucket and served the same way. The `thumbnail_path` column is displayed by default in all UI; `storage_path` is only accessed when the user explicitly requests the full image.

---

## 5. Invite Code Security

### Design

Group invite codes are designed to resist enumeration attacks (TOP-4):

1. **Generation**: 16 bytes from `pgcrypto`'s `gen_random_bytes()` → hex-encoded = 32 hex characters. Entropy: 2^128 ≈ 3.4×10^38 combinations. Brute-force is computationally infeasible.

2. **Storage**: The SHA-256 hash of the plain code is stored in `groups.invite_code_hash`. The plain code is returned to the creator **once only** at generation time and never stored. Even a full database dump does not reveal any usable invite codes.

3. **Expiry**: `invite_expires_at` is set to 7 days from generation. The join flow checks `invite_expires_at > NOW()` before accepting. Expired codes are set to NULL in the database.

4. **Single-use**: After a successful join, `invite_code_hash` and `invite_expires_at` are set to NULL, invalidating the code. The creator must generate a new code for additional invites.

5. **Member limit**: The `enforce_group_member_limit()` DB trigger uses `FOR UPDATE` lock to prevent a race condition where two users join simultaneously with the same code and both succeed, exceeding the 4-member limit.

### Invite Code Schema

```
createGroupInvite() → gen_random_bytes(16) → encode as 32-char hex string (plain code)
                   → SHA-256(plain code)   → store as invite_code_hash
                   → return plain code to creator (displayed once, user must copy)

join_group(plain_code) → SHA-256(plain_code) → compare to invite_code_hash
                       → check invite_expires_at > NOW()
                       → check member count < 4 (atomic with FOR UPDATE)
                       → insert group_members row
                       → set invite_code_hash = NULL (single-use invalidation)
```

---

## 6. Rate Limiting

### Approach

Rate limiting is implemented at two layers:

**Layer 1 — Database constraints**: The `unique_user_city` and `unique_user_country_null_city` constraints prevent a user from flooding the database with duplicate place records. The `unique_user_badge` constraint prevents duplicate achievement rows.

**Layer 2 — Edge Function**: `supabase/functions/rate-limit/index.ts` enforces per-user request limits:
- Read operations (GET): 60 requests per 60-second window
- Write operations (POST/PUT/PATCH/DELETE): 20 requests per 60-second window

### JWT Validation on Edge Functions

Every Edge Function **must** validate the JWT before performing any operation. The service-role key used by Edge Functions bypasses all RLS policies. An Edge Function without JWT validation is effectively an unauthenticated backdoor with full database access (THREAT_MODEL TOP-3).

The pattern enforced in `rate-limit/index.ts` is:
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) return 401

const { data: { user }, error } = await supabase.auth.getUser(token)
if (error || !user) return 401

// Only now proceed with business logic
```

### Production Note

The current rate limiting implementation uses an in-memory approximation. For production, replace with Upstash Redis using atomic `INCR` + `EXPIRE` commands to prevent race conditions across multiple Edge Function instances.

---

## 7. Session Management

### Token Lifetimes

| Token | Lifetime | Storage |
|---|---|---|
| JWT (access token) | 1 hour | SecureStore (native), sessionStorage (web) |
| Refresh token | 30 days inactivity | SecureStore (native), sessionStorage (web) |

### Inactivity Timeout

`checkSessionTimeout()` in `src/lib/auth.ts` enforces automatic sign-out after 30 days of inactivity. It should be called:
- On every app foreground event (`AppState` change from `background` to `active`)
- On every authenticated navigation event (root layout `useEffect`)

The last activity timestamp is stored in SecureStore under `last_activity`. If a user opens the app after 30 days of inactivity, `checkSessionTimeout()` calls `signOut()` (which revokes the refresh token server-side) and throws `AuthError('Session expired due to inactivity')`, triggering a redirect to the login screen.

### Sign-Out Behavior

`signOut()` calls `supabase.auth.signOut()` which:
1. Sends a revocation request to Supabase Auth (server-side refresh token invalidation)
2. Clears the session from SecureStore
3. Clears the `last_activity` key from SecureStore

After sign-out, all outstanding JWTs remain valid until their 1-hour expiry. This is an accepted limitation of stateless JWTs. Users who suspect account compromise should use a future "Sign out all devices" feature (planned).

---

## 8. GDPR Compliance

### Right to Erasure (Article 17)

The `account_delete(p_user_id UUID)` function in `006_delete_account.sql` implements a complete, ordered account deletion:

1. Verifies `auth.uid() = p_user_id` (the user can only delete their own account)
2. Deletes storage files: `place-photos/{user_id}/`, `avatars/{user_id}/`, `share-cards/{user_id}/`
3. Deletes in cascade order: push_tokens → achievements → place_photos → place_ratings → group_members → group_places → visited_places → profiles
4. Calls `auth.admin_delete_user(p_user_id)` to remove from `auth.users`, invalidating all JWTs

The cascade is ordered to avoid FK constraint violations and to ensure storage files are deleted before the profile row that references them.

### Right to Data Portability (Article 20)

The `export_user_data(p_user_id UUID)` function returns all user data as a single JSONB document including:
- Profile information
- All visited/planned places with dates, budgets, reviews, notes
- All place ratings
- Photo metadata (storage paths for retrieval; not the files themselves)
- Group memberships
- Group places contributed
- Achievements earned
- Registered device types (push token device_type only — not the token itself)

Push tokens are not exported (they are device credentials, not personal data, and change frequently).

### Data Retention

No explicit retention policy is implemented in Phase 1. All data is retained until the user explicitly requests deletion. Future versions should implement:
- Automated deletion of orphaned `want_to_go` places after N years
- Push token cleanup for tokens that have not been used in 90 days

---

## 9. Known Limitations & Future Improvements

### Current Limitations

| ID | Limitation | Severity | Planned Fix |
|---|---|---|---|
| L-01 | Rate limiting uses in-memory approximation (not atomic) | Medium | Upstash Redis integration |
| L-02 | No "sign out all devices" / refresh token revocation for all sessions | Medium | Supabase Auth admin API endpoint |
| L-03 | Web session stored in sessionStorage (cleared on tab close, not truly secure) | Medium | httpOnly cookie adapter |
| L-04 | No CSP headers configured for web build | High | Next.js / Expo web security headers |
| L-05 | No HSTS header for web build | Medium | CDN/hosting layer configuration |
| L-06 | Photo EXIF stripping happens client-side only; server-side re-validation not yet implemented | Medium | Upload Edge Function with sharp/libvips |
| L-07 | `account_delete` deletes storage via SQL (requires storage extension access in same SECURITY DEFINER context) | Low | Edge Function wrapping `account_delete` RPC |
| L-08 | No monitoring/alerting on RLS policy violations (42501 errors) | Medium | Supabase log drain → Datadog alert |
| L-09 | Invite code join flow (rate limiting) not yet implemented | High | Rate limiter on `join_group` RPC |

### Planned Security Improvements (Phase 2)

- **Content Security Policy**: Configure CSP headers for the web build to prevent inline script execution and restrict script sources to known CDNs.
- **Subresource Integrity**: Add `integrity` attributes to all CDN-loaded scripts.
- **Certificate Pinning**: Implement certificate pinning on native builds to prevent MITM attacks on corporate proxies.
- **Biometric Re-authentication**: Require biometric confirmation for sensitive actions (account deletion, group creation).
- **Audit Log**: Record security-relevant events (sign-in, sign-out, account deletion, group joins) to a separate append-only table.
- **Server-Side EXIF Validation**: Implement an upload Edge Function using `sharp` to validate and re-strip EXIF server-side as a secondary check.
- **Realtime Channel Authorization**: Implement custom Supabase Realtime authorization to prevent channel subscription by non-members (AS-04).

---

## 10. Security Contact

To report a security vulnerability in Driftmark:

**Email**: security@driftmark.app *(placeholder — configure before public launch)*

**Response SLA**:
- Critical / High severity: 24-hour acknowledgement, 72-hour mitigation plan
- Medium severity: 72-hour acknowledgement, 7-day mitigation plan
- Low severity: 7-day acknowledgement, next release cycle

**Scope**: The Driftmark mobile app (iOS/Android), web app, Supabase database schema and functions, and Supabase Storage configuration are all in scope.

**Out of scope**: Supabase infrastructure itself, Google OAuth infrastructure, Expo's build service.

Please include steps to reproduce, impact assessment, and any proof-of-concept code. We do not currently offer a bug bounty program but will acknowledge researchers in release notes.
