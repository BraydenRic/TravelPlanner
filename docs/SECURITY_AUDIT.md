# Final Security Audit Report

**Date:** 2026-03-25
**Auditor:** Security Agent
**Status:** PASS with fixes applied (5 issues found and resolved; 1 architectural risk noted)

---

## Audit Results

### Authentication ✅

**File:** `src/lib/auth.ts`

All requirements met:

- `expo-secure-store` is used exclusively via `ExpoSecureStoreAdapter` — no `AsyncStorage` usage for token storage. Tokens are stored in the OS Keychain (iOS) or EncryptedSharedPreferences (Android).
- `detectSessionInUrl: false` is set on the Supabase client, preventing URL-based session hijacking on native.
- `checkSessionTimeout()` is implemented with a 30-day (`SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000`) inactivity window. It reads/writes `last_activity` via `SecureStore`, forces sign-out on timeout, and handles corrupted or missing values gracefully.
- `AuthError` class is exported and used in all auth functions.

No issues found.

---

### Input Validation ✅ (after fixes)

**File:** `src/lib/validation.ts`

**Issues found and fixed:**

- `reviewSchema` was missing the HTML-blocking regex `/^[^<>&"'`]*$/`. **Fixed.**
- `captionSchema` was missing the HTML-blocking regex `/^[^<>&"'`]*$/`. **Fixed.**
- `notesSchema` was missing the HTML-blocking regex `/^[^<>&"'`]*$/`. **Fixed.**

All other requirements met:

- `countryCodeSchema`: enforces exactly 2 uppercase letters via `.length(2)` and `/^[A-Z]{2}$/`.
- `currencyCodeSchema`: enforces exactly 3 uppercase letters via `.length(3)` and `/^[A-Z]{3}$/`.
- `inviteCodeSchema`: enforces exactly 32 lowercase hex characters via `.length(32)` and `/^[0-9a-f]+$/`.
- `ratingScoreSchema`: constrained to integers 1–5 via `.int()`, `.min(1)`, `.max(5)`.
- `displayNameSchema` and `groupNameSchema` already had the HTML-blocking regex.
- All text fields now have both length constraints and HTML-character-blocking regex.

---

### Sanitization ✅

**File:** `src/lib/sanitize.ts`

All requirements met:

- `escapeHtml` escapes all 6 dangerous characters in the correct order:
  - `&` → `&amp;` (first, to prevent double-escaping)
  - `<` → `&lt;`
  - `>` → `&gt;`
  - `"` → `&quot;`
  - `'` → `&#x27;`
  - `` ` `` → `&#x60;`
- `sanitizeForStorage` combines: `input.trim()` → `stripHtml()` → `escapeHtml()` in correct order (strip then escape).
- All field-specific functions (`sanitizeDisplayName`, `sanitizeGroupName`, `sanitizeReview`, `sanitizeCaption`, `sanitizeNotes`) call `sanitizeForStorage` then enforce their respective DB length limits via `.slice()`.

No issues found.

---

### Photo Security ✅

**File:** `src/lib/photoSecurity.ts`

All requirements met:

- `validateImageMagicBytes` reads the first 12 actual bytes of the file via `FileSystem.readAsStringAsync` with `Base64` encoding and `length: 12`, then decodes with `Buffer.from(content, 'base64')`. This inspects real file content, not headers or MIME type strings. WebP additionally validates bytes 8–11 for the `WEBP` marker.
- `stripExifData` re-encodes the image through `ImageManipulator.manipulateAsync` with no transforms — this drops all EXIF metadata (including GPS) because the manipulator decodes to raw pixel data and re-encodes as a fresh JPEG.
- File size limit is 5 MB raw (`MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024`) and 1 MB post-compression (`MAX_UPLOAD_SIZE_BYTES = 1 * 1024 * 1024`).
- `processPhotoForUpload` calls all steps in correct order: `validateFileSize` → `validateImageMagicBytes` → `stripExifData` → `compressForUpload` → `createThumbnail`.

No issues found.

---

### RLS Policies ✅ (after fixes)

**File:** `supabase/migrations/004_rls_policies.sql`

**Issues found and fixed:**

- `place_photos` table was missing an UPDATE policy. **Fixed:** added `place_photos_update_own` (USING `auth.uid()::text = user_id::text`).
- `group_members` table was missing an UPDATE policy. **Fixed:** added `group_members_update_self_or_creator` allowing users to update their own row or the group creator to update any member's row.
- `group_places` table was missing an UPDATE policy. **Fixed:** added `group_places_update_own` (USING `auth.uid()::text = user_id::text`).

All other requirements met:

- `visited_places`: SELECT, INSERT, UPDATE, DELETE — all present, all scoped to `auth.uid()::text = user_id::text`.
- `place_ratings`: SELECT, INSERT, UPDATE, DELETE — all present, all verify ownership through the `visited_places` FK join.
- `cities`: SELECT only — no INSERT, UPDATE, or DELETE policies. Write attempts are denied by default.
- `achievements`: SELECT only for users — no INSERT, UPDATE, or DELETE policies. Writes are handled exclusively by `SECURITY DEFINER` functions.
- `groups`: SELECT (members), INSERT (creator check), UPDATE (creator only), DELETE (creator only).
- `group_members`: SELECT (members), INSERT (self only), UPDATE (self or creator — newly added), DELETE (self or creator).
- `push_tokens`: SELECT, INSERT, UPDATE, DELETE — all scoped to owner's `user_id`.

---

### Storage Policies ✅

**File:** `supabase/migrations/005_storage_policies.sql`

All requirements met:

- `place-photos` policies require `(storage.foldername(name))[1] = auth.uid()::text`, enforcing that the first path segment equals the authenticated user's UUID.
- Bucket is created with `file_size_limit = 5242880` (exactly 5 MB) for `place-photos`.
- `allowed_mime_types` on `place-photos` bucket is `ARRAY['image/jpeg', 'image/png', 'image/webp']`.
- All four operations (INSERT, SELECT, UPDATE, DELETE) are defined for `place-photos`.

No issues found.

---

### Account Deletion ✅

**File:** `supabase/migrations/006_delete_account.sql`

All requirements met:

- `account_delete` verifies `auth.uid() = p_user_id` at the start, raising an exception if the caller is unauthenticated or attempting to delete a different user's account.
- All user data is deleted in cascade-safe order: storage objects (place-photos, avatars, share-cards) → push_tokens → achievements → place_photos → place_ratings → group_members → group_places → orphaned groups → visited_places → profiles.
- `auth.admin_delete_user(p_user_id)` is called as the final step to remove the auth.users row and invalidate all JWTs.
- `export_user_data` returns device type metadata for push tokens (`device_type`, `enabled`, `created_at`) but deliberately excludes `expo_push_token` values. The comment in the function confirms this is intentional ("not the tokens themselves — security risk").

No issues found.

---

### Services Security ✅ (after fixes)

**File:** `src/services/places.ts`

All requirements met:

- All inputs validated with Zod schemas (`createPlaceSchema.parse()`, `updatePlaceSchema.parse()`, `countryCodeSchema.parse()`).
- Text fields (`review`, `notes`) sanitized with `sanitizeReview()` / `sanitizeNotes()` before DB writes.
- `handleSupabaseError` used for all error paths.
- No `select('*')` calls — explicit column lists `PLACE_LIST_COLUMNS` and `PLACE_FULL_COLUMNS` used throughout.

**File:** `src/services/groups.ts`

All requirements met:

- Invite code validated with `inviteCodeSchema.parse(inviteCode)` (32-char hex format) before any DB lookup.
- Invite expiry checked: `new Date(typedGroup.invite_expires_at) < new Date()` before processing join.
- Group membership verified via RLS on the server side; client-side also checks `members.some((m) => m.user_id === userId)` before insert.
- `assignNextColor` uses `MEMBER_COLORS.find((c) => !existingColors.includes(c))` to return the first color not already in use, preventing duplicates.

**File:** `src/services/photos.ts` — **Critical bug fixed:**

- **Issue:** `storagePath` was set to `` `place-photos/${userId}/${visitedPlaceId}/${timestamp}.jpg` `` and then used as the object name within `.from('place-photos').upload(storagePath, ...)`. This made the actual bucket object key `place-photos/{userId}/...`, causing the first path segment to be `place-photos` instead of `{userId}`. The storage RLS policy `(storage.foldername(name))[1] = auth.uid()::text` would therefore always fail, blocking all uploads and rendering photo access control broken.
- **Fixed:** Path corrected to `` `${userId}/${visitedPlaceId}/${timestamp}.jpg` `` (bucket name removed from the path). The same fix applied to `thumbnailPath`.
- `processPhotoForUpload` is called before every upload (line 30).
- Signed URLs are used via `createSignedUrl(storagePath, 60 * 60)` for photo access.

---

### Offline Queue ✅

**File:** `src/lib/offline.ts`

All requirements met:

- `QueuedOperation.type` is a discriminated union limited to 6 safe operation types: `CREATE_PLACE`, `UPDATE_PLACE`, `DELETE_PLACE`, `UPSERT_RATINGS`, `UPDATE_PROFILE`, `UPLOAD_PHOTO`. Unknown types throw an error in `executeOperation`.
- `MAX_RETRIES = 3` is enforced: operations with `retryCount >= MAX_RETRIES` are dropped, not re-queued. No infinite retry possible.
- Queue payloads store only the data needed for the operation (place fields, profile updates, etc.). No JWT tokens, refresh tokens, or full user objects are stored.

**Architectural note (risk, not a code defect):** The offline queue uses `AsyncStorage` (unencrypted) rather than `SecureStore`. Queue payloads may contain user-authored text (reviews, notes). On a rooted/jailbroken device, these payloads are readable. This is an accepted trade-off: `SecureStore` has a value size limit (~2 KB) and does not support list/array storage, making it unsuitable for a queue. Queue contents are non-credential user data. This risk should be documented in the threat model.

---

### API Error Handling ✅ (after fix)

**File:** `src/lib/apiErrors.ts`

**Issue found and fixed:**

- Only 7 Postgres error codes were explicitly mapped. The common `23502` (not-null violation) was missing. **Fixed:** added `23502` to the constraint violation block.

All other requirements met:

- In production (`!__DEV__`), `getUserFacingMessage` returns `'An unexpected error occurred'` for raw `Error` objects. For `ApiError` instances, it returns the pre-approved user-facing message string (e.g., "Access denied", "Authentication required") — these strings are crafted to be safe for display and do not leak internal details.
- All 8 Postgres error codes are now mapped: `42501`, `PGRST301`, `PGRST116`, `429`, `23514`, `23505`, `23503`, `23502`.
- `isApiError` type guard correctly uses `instanceof ApiError`, which works across the module boundary because `ApiError` is a named class exported from this file.

---

## Fixes Applied

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `src/lib/validation.ts` | `reviewSchema` missing HTML-blocking regex | Added `.regex(/^[^<>&"'\`]*$/)` |
| 2 | `src/lib/validation.ts` | `captionSchema` missing HTML-blocking regex | Added `.regex(/^[^<>&"'\`]*$/)` |
| 3 | `src/lib/validation.ts` | `notesSchema` missing HTML-blocking regex | Added `.regex(/^[^<>&"'\`]*$/)` |
| 4 | `src/services/photos.ts` | Storage path included bucket name (`place-photos/{userId}/...`) causing RLS policy to always reject (first path segment was `place-photos` not `{userId}`) | Removed bucket name prefix; path is now `{userId}/{visitedPlaceId}/{timestamp}.jpg` |
| 5 | `supabase/migrations/004_rls_policies.sql` | `place_photos` table missing UPDATE policy — no complete CRUD coverage | Added `place_photos_update_own` policy |
| 6 | `supabase/migrations/004_rls_policies.sql` | `group_members` table missing UPDATE policy | Added `group_members_update_self_or_creator` policy |
| 7 | `supabase/migrations/004_rls_policies.sql` | `group_places` table missing UPDATE policy | Added `group_places_update_own` policy |
| 8 | `src/lib/apiErrors.ts` | Only 7 Postgres error codes mapped; `23502` (not-null violation) absent | Added `23502` to the constraint violation block |

---

## Remaining Risks

The following items cannot be fixed in code and require manual Supabase dashboard configuration or operational controls:

1. **Supabase RLS must be enabled on all tables.** The migration files define policies but RLS must be explicitly enabled per table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Verify in the Supabase dashboard that RLS is enabled for: `profiles`, `cities`, `visited_places`, `place_ratings`, `groups`, `group_members`, `group_places`, `place_photos`, `achievements`, `push_tokens`.

2. **Bucket MIME type enforcement is advisory, not cryptographic.** `allowed_mime_types` on the storage bucket rejects uploads by declared content-type, but a sophisticated attacker who has already bypassed client-side magic byte validation (e.g., via a compromised client) could still attempt uploads. Defense-in-depth via server-side virus/content scanning (e.g., Supabase Webhooks → ClamAV) is recommended for production.

3. **Offline queue uses AsyncStorage (unencrypted).** As noted in the Offline Queue audit section, queue payloads containing user-authored text (reviews, notes, place data) are stored in unencrypted SQLite on the device. This is readable on rooted/jailbroken devices. This is an accepted architectural trade-off due to `SecureStore` storage limitations and should be documented in `THREAT_MODEL.md`.

4. **`auth.admin_delete_user` availability.** The `account_delete` function calls `auth.admin_delete_user(p_user_id)`. This function requires the `SECURITY DEFINER` context with a superuser role. Verify this function is available and correctly permissioned in the target Supabase project before production deployment.

5. **Invite codes stored in plaintext.** `groups.invite_code` stores the raw 32-char hex invite code in the database. A DB compromise exposes active invite codes. For higher security, store only a bcrypt hash of the code (similar to password storage). This is noted in the threat model as a known trade-off for operational simplicity.

6. **Rate limiting on auth endpoints.** No application-level rate limiting exists in the codebase; this must be configured in Supabase Auth settings (email OTP rate limits, OAuth rate limits) and at the API gateway level.

---

## Security Sign-off

**Overall Assessment:** The codebase demonstrates a strong security posture with consistent defense-in-depth across authentication, input validation, sanitization, photo security, RLS policies, and error handling. The architecture correctly separates concerns (Zod validation → sanitization → DB write) and avoids common pitfalls (no `select('*')`, SecureStore for tokens, signed URLs for private photos).

**5 fixes were required before ship:**
- 3 missing HTML-blocking regex validators (medium risk — defense-in-depth gap, sanitize.ts still protects the DB layer)
- 1 critical storage path bug that would have broken photo upload RLS entirely (high risk)
- 3 missing RLS UPDATE policies (medium risk — default-deny means writes would fail, but the gap is a correctness issue)
- 1 missing Postgres error code mapping (low risk)

**With these fixes applied, the codebase is cleared for Phase 6 release** subject to the operational/configuration items listed under Remaining Risks being verified before deployment.
