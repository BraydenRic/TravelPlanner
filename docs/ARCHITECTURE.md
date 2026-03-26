# Driftmark — Architecture Overview

**Version**: 1.0
**Date**: 2026-03-24

---

## 1. System Overview

Driftmark is a dark-themed cross-platform travel logging and rating application. Users log countries and cities they have visited, rate them across 10 categories, and optionally compare their travels with up to 3 friends in a private group.

The system consists of:
- **Mobile app** (iOS + Android) — React Native via Expo
- **Web app** — React Native Web (same codebase, Metro bundler)
- **Backend** — Supabase (PostgreSQL 15, PostgREST, Auth, Storage, Realtime, Edge Functions)

All three surfaces share a single codebase. Platform-specific code is isolated behind `.web.ts` / `.native.ts` file extensions.

---

## 2. Tech Stack & Rationale

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Expo ~53 + Expo Router ~4 | File-based routing; unified iOS/Android/Web build pipeline; managed workflow reduces native complexity |
| Language | TypeScript 5.3 (strict mode) | Compile-time safety; eliminates entire classes of runtime bugs; required for RLS type safety |
| UI | React Native + NativeWind v4 | Tailwind-style styling with native renderer; dark theme system via `colors.ts` tokens |
| Animations | Moti + React Native Reanimated 3 | Declarative spring animations; runs on UI thread (no JS bridge jank) |
| State | Zustand v5 | Minimal boilerplate; no context provider hell; explicit slice pattern |
| Validation | Zod v3 | Runtime schema validation at API boundaries; transforms sanitize UGC (AS-06) |
| Backend | Supabase (PostgreSQL 15) | RLS, Auth, Storage, Realtime, Edge Functions in one platform; no custom auth server |
| Auth | Supabase Auth + Google OAuth | Supabase handles PKCE, state param, and token refresh; no custom OAuth logic (AS-01) |
| Token Storage | expo-secure-store (native) / sessionStorage (web) | Platform keystore encryption on native; sessionStorage limits XSS blast radius on web (AS-01, AS-08) |
| Maps | react-simple-maps + d3-geo | Lightweight SVG world map; no Google Maps API key required; GeoJSON loaded lazily |
| Charts | Victory Native 41 | Cross-platform rating radar charts |
| Lists | @shopify/flash-list | Virtualized lists with O(1) scroll performance |
| Photo security | expo-image-manipulator + piexifjs | EXIF stripping before upload (TOP-2, AS-03) |
| XSS prevention | DOMPurify + Zod transforms | All UGC sanitized before storage and render (AS-06) |
| Testing | Jest + jest-expo + Playwright | Unit, integration, and E2E coverage |

---

## 3. Directory Structure

```
/
├── src/
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── (auth)/             # Unauthenticated screens (login, onboarding)
│   │   ├── (tabs)/             # Main tab navigator screens
│   │   ├── country/[code]/     # Country detail screen
│   │   │   └── city/[cityId]/  # City detail screen
│   │   ├── group/              # Group management screens
│   │   ├── plan/               # Trip planning screens
│   │   └── settings/           # User settings screens
│   ├── components/
│   │   ├── map/                # World map, country outlines, markers
│   │   ├── ratings/            # Rating star/slider components, radar chart
│   │   ├── cards/              # Country card, city card, achievement card
│   │   ├── layout/             # ScreenWrapper, Header, TabBar
│   │   └── ui/                 # Button, Input, Modal, Toast, Avatar
│   ├── services/               # Supabase query functions (no business logic)
│   ├── stores/                 # Zustand state slices
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Shared utilities (auth, supabase client, sanitize, photoSecurity)
│   ├── types/                  # TypeScript type definitions
│   ├── constants/              # Rating categories, country list
│   ├── theme/                  # Design tokens (colors, spacing, typography, animations)
│   └── animations/             # Reusable animation components
├── supabase/
│   ├── migrations/             # Ordered SQL migrations
│   ├── functions/              # Deno Edge Functions
│   └── seed/                   # Reference data seeds (cities — not in v1 scaffold)
├── __tests__/
│   ├── unit/services/          # Service function unit tests
│   ├── components/             # Component render tests
│   ├── integration/            # Multi-layer integration tests
│   ├── performance/            # Performance budget tests
│   ├── e2e/web/                # Playwright browser tests
│   ├── e2e/mobile/             # Detox or Maestro mobile tests
│   ├── factories/              # Test data factories
│   └── mocks/                  # Module mocks (supabase, expo-secure-store)
├── docs/                       # Architecture, API, DB, Performance docs
├── assets/                     # Static assets
└── .github/workflows/          # CI/CD pipelines
```

---

## 4. Data Flow

### 4.1 User Authentication

```
User taps "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })  [src/lib/supabase.ts]
  → Expo WebBrowser opens Google OAuth (Supabase handles PKCE + state)
  → Redirect to driftmark.app/auth/callback
  → Supabase exchanges code for JWT
  → JWT stored in expo-secure-store (native) or sessionStorage (web)  [M-01-D, M-08-A]
  → useAuth hook detects session change
  → Router navigates to (tabs) layout
```

### 4.2 Adding a Visited Place

```
User selects country on map → opens PlaceEntrySheet
  → PlaceEntryDraft state managed in Zustand (in-memory only, not persisted)
  → User fills form → Zod validation runs (sanitizeText transforms applied)
  → User taps Save
  → visitedPlacesService.upsert(draft) [src/services/visitedPlaces.ts]
    → supabase.from('visited_places').upsert({...})  [RLS: user_id = auth.uid()]
  → On success: invalidate Zustand cache, trigger check_achievements RPC
  → Map re-renders with updated country color
```

### 4.3 Photo Upload

```
User picks photo → expo-image-picker returns URI
  → photoSecurity.stripExifAndCompress(uri)  [src/lib/photoSecurity.ts]
    → expo-image-manipulator re-encodes to JPEG (strips EXIF by default)
    → Verify no GPS data remains (piexifjs parse check)
  → photoSecurity.validateImageMagicBytes(blob)  [checks FF D8 FF, etc.]
  → Edge Function: upload-photo (server-side path generation)
    → requireAuth(req)  [M-07-A]
    → Path: {auth.uid()}/{uuid4()}.jpg  [M-03-E]
    → supabase.storage.from('place-photos').upload(path, blob)
  → place_photos row inserted with storage_path + thumbnail_path
```

### 4.4 Group Realtime Sync

```
User opens group map
  → Membership verified: supabase.from('group_members').select().single()
  → Subscribe: supabase.channel('group-{id}').on('postgres_changes', ...)
    → Only postgres_changes (not broadcast) — RLS filters rows automatically  [M-04-A]
  → Cleanup on unmount: channel.unsubscribe()  [M-04-D]
```

---

## 5. Key Security Decisions

| Decision | Threat Mitigated | Notes |
|----------|-----------------|-------|
| RLS on every table | TOP-1 / AS-02 | The anon key is public; RLS is the only authorization boundary |
| expo-secure-store for JWT | AS-01, AS-08 | Platform keystore (AES-256 on Android, Secure Enclave on iOS) |
| sessionStorage on web (not localStorage) | AS-01 T-01-D | XSS can read localStorage; sessionStorage is tab-scoped |
| EXIF strip before upload | TOP-2 / AS-03 | Physical safety risk; must be client-side and server-validated |
| SHA-256 hash of invite codes | AS-05 | 128-bit entropy + hash means brute-force and replay are infeasible |
| DOMPurify on all UGC | TOP-5 / AS-06 | Web build renders HTML; native Text is immune but we sanitize anyway |
| requireAuth() in every Edge Function | TOP-3 / AS-07 | Service-role key bypasses RLS; JWT check is the only guard |
| SECURITY DEFINER only for achievements | AS-02 T-02-D | Users cannot self-award badges; DEFINER functions validate uid() first |
| No SELECT * | AS-02, Performance | Explicit column selection prevents over-exposure and improves query plans |
| No custom OAuth handler | AS-01 T-01-A | Supabase handles PKCE and state internally |

---

## 6. Offline-First Strategy

Driftmark targets PWA-level offline support on web and native.

### What works offline:
- Viewing previously loaded countries (Zustand in-memory cache)
- Editing a draft place entry (PlaceEntryDraft in memory)
- Reading cached ratings

### What requires connectivity:
- Saving to database (no offline queue for sensitive data — THREAT_MODEL M-08-B)
- Photo upload
- Group sync
- Achievement checks

### Implementation:
- `expo-network` detects connectivity state
- When offline: show banner, disable save actions, show stale data indicator
- No AsyncStorage persistence of user data (THREAT_MODEL M-08-C)
- Only non-sensitive UI state (selected tab, map zoom) may be persisted

---

## 7. Platform Adaptation

### Web vs Native differences handled via file extensions:
- `supabase.web.ts` — sessionStorage adapter
- `supabase.native.ts` — SecureStore adapter
- `PhotoPicker.web.tsx` — uses `<input type="file">` + canvas EXIF strip
- `PhotoPicker.native.tsx` — uses expo-image-picker + expo-image-manipulator

### React Native Web caveats:
- `expo-haptics` is a no-op on web (handled in wrapper)
- `expo-secure-store` falls back to sessionStorage on web
- SVG map uses react-simple-maps (works on web); native uses the same component via react-native-svg
- NativeWind compiles Tailwind classes to StyleSheet on native, CSS on web

---

## 8. CI/CD Pipeline

`.github/workflows/` contains:
- `ci.yml` — lint + typecheck + jest on every PR
- `e2e.yml` — Playwright tests on main branch merges
- `deploy.yml` — Expo EAS build + Vercel web deploy on release tags
