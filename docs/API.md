# Driftmark — API Reference

**Version**: 1.0
**Date**: 2026-03-24
**Backend**: Supabase (PostgREST + Edge Functions)

---

## 1. Supabase Client Setup

The Supabase client is initialized in `src/lib/supabase.ts`. It uses platform-appropriate storage:

- **Native** (iOS/Android): `expo-secure-store` via adapter — encrypted keystore storage
- **Web**: `sessionStorage` — tab-scoped, cleared on tab close (mitigates AS-01 T-01-D)

Security configuration:
```typescript
// src/lib/supabase.ts
{
  auth: {
    storage: secureStorage,    // Platform-appropriate encrypted storage (M-01-D, M-08-A)
    persistSession: true,
    autoRefreshToken: true,    // Supabase mutex handles concurrent refresh (M-01-E)
    detectSessionInUrl: true,  // For OAuth redirect handling
  }
}
```

---

## 2. Authentication Patterns

### 2.1 Sign In with Google

```typescript
// src/services/auth.ts
import { supabase } from '@lib/supabase'

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: process.env.EXPO_PUBLIC_OAUTH_REDIRECT,
      // Supabase handles PKCE and state internally — never customize (M-01-A)
    },
  })
  if (error) throw error
}
```

### 2.2 Sign Out

```typescript
export async function signOut(): Promise<void> {
  // Revokes refresh token server-side (M-01-C)
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) throw error
}
```

### 2.3 Get Current Session

```typescript
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) return null
  return session
}
```

---

## 3. Supabase Query Patterns

All service functions return `ApiResult<T>` (defined in `src/types/api.ts`) to avoid throwing across async boundaries.

### 3.1 Fetching Visited Places

```typescript
// src/services/visitedPlaces.ts
export async function getVisitedPlaces(
  userId: string,
  options?: { category?: PlaceCategory; limit?: number; cursor?: string }
): Promise<ApiResult<VisitedPlace[]>> {
  let query = supabase
    .from('visited_places')
    .select('id, user_id, country_code, city_id, category, overall_score, visited_date, created_at')
    .eq('user_id', userId)     // Belt-and-suspenders: RLS also enforces this
    .order('visited_date', { ascending: false })
    .limit(options?.limit ?? 20)

  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.cursor) {
    query = query.lt('visited_date', options.cursor)  // Cursor-based pagination
  }

  const { data, error } = await query
  if (error) return { data: null, error: normalizeError(error) }
  return { data, error: null }
}
```

### 3.2 Upserting a Visited Place

```typescript
export async function upsertVisitedPlace(
  place: Omit<VisitedPlace, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResult<VisitedPlace>> {
  const { data, error } = await supabase
    .from('visited_places')
    .upsert(place, { onConflict: 'user_id,city_id' })
    .select('id, country_code, city_id, category, overall_score, updated_at')
    .single()

  if (error) return { data: null, error: normalizeError(error) }
  return { data, error: null }
}
```

### 3.3 Batch Rating Upsert

```typescript
export async function upsertRatings(
  visitedPlaceId: string,
  ratings: Array<{ category: RatingCategory; score: 1 | 2 | 3 | 4 | 5 }>
): Promise<ApiResult<PlaceRating[]>> {
  const rows = ratings.map((r) => ({
    visited_place_id: visitedPlaceId,
    category: r.category,
    score: r.score,
  }))

  const { data, error } = await supabase
    .from('place_ratings')
    .upsert(rows, { onConflict: 'visited_place_id,category' })
    .select('id, visited_place_id, category, score')

  if (error) return { data: null, error: normalizeError(error) }
  return { data, error: null }
}
```

---

## 4. RPC Signatures

All RPC functions are called via `supabase.rpc(functionName, params)`.

### 4.1 `compute_country_ratings`

```typescript
const { data, error } = await supabase.rpc('compute_country_ratings', {
  p_country_code: 'JP',
  p_user_id: userId,
})
// Returns: CountryRatings (see src/types/api.ts)
```

### 4.2 `compute_group_country_ratings`

```typescript
const { data, error } = await supabase.rpc('compute_group_country_ratings', {
  p_group_id: groupId,
  p_country_code: 'JP',
})
// Returns: GroupCountryRatings
```

### 4.3 `get_country_city_status`

```typescript
const { data, error } = await supabase.rpc('get_country_city_status', {
  p_country_code: 'JP',
  p_user_id: userId,
})
// Returns: CityCityStatus[] (table-returning function, array result)
```

### 4.4 `get_country_fill_intensity`

```typescript
const { data, error } = await supabase.rpc('get_country_fill_intensity', {
  p_user_id: userId,
})
// Returns: CountryFillIntensity[] — call once on app load, cache in mapStore
```

### 4.5 `check_achievements`

```typescript
const { error } = await supabase.rpc('check_achievements', {
  p_user_id: userId,
})
// Returns: void — call after batch mutations, not per-mutation
```

### 4.6 `get_travel_stats`

```typescript
const { data, error } = await supabase.rpc('get_travel_stats', {
  p_user_id: userId,
})
// Returns: TravelStats
```

### 4.7 `get_group_map_data`

```typescript
const { data, error } = await supabase.rpc('get_group_map_data', {
  p_group_id: groupId,
})
// Returns: GroupMapData
```

### 4.8 `generate_invite_code`

```typescript
const { data: plainCode, error } = await supabase.rpc('generate_invite_code', {
  p_group_id: groupId,
})
// Returns: string — display to user immediately, never store
// plainCode is like "dRk2mQpLxN8sJ4wA"
```

---

## 5. Realtime Channel Structure

### 5.1 Group Places Channel

One channel per group. Always use `postgres_changes` (not broadcast) for data sync — RLS filters rows automatically (M-04-A).

```typescript
// src/services/groups.ts

export function subscribeToGroupPlaces(
  groupId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<GroupPlace>) => void
): RealtimeChannel {
  // Step 1: Verify membership BEFORE subscribing (M-04-B)
  // (verification done in calling hook before calling this function)

  const channel = supabase
    .channel(`group-places-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_places',
        filter: `group_id=eq.${groupId}`,
      },
      onUpdate
    )
    .subscribe()

  return channel
}

// Cleanup — MUST be called on component unmount (M-04-D)
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel)
}
```

### 5.2 Usage in Hook

```typescript
// src/hooks/useGroupPlaces.ts
useEffect(() => {
  if (!groupId) return

  // Verify membership first
  let channel: RealtimeChannel | null = null

  verifyGroupMembership(groupId).then((isMember) => {
    if (!isMember) return
    channel = subscribeToGroupPlaces(groupId, handleUpdate)
  })

  return () => {
    if (channel) unsubscribeFromChannel(channel)  // M-04-D cleanup
  }
}, [groupId])
```

---

## 6. Error Handling Patterns

### 6.1 Error Normalization

All Supabase errors are normalized to `ApiError` before being returned:

```typescript
// src/lib/errors.ts
import type { PostgrestError } from '@supabase/supabase-js'
import type { ApiError } from '@/types/api'

export function normalizeError(error: PostgrestError | Error): ApiError {
  if ('code' in error && 'message' in error) {
    // PostgrestError
    return {
      code: error.code,
      message: error.message,
      details: error.details ?? undefined,
    }
  }
  return {
    code: 'UNKNOWN',
    message: error.message,
  }
}
```

### 6.2 RLS Policy Violations

When a user attempts an unauthorized operation, PostgREST returns:
```json
{ "code": "42501", "message": "new row violates row-level security policy" }
```

Handle this in the UI layer:
```typescript
if (error?.code === '42501') {
  showToast({ type: 'error', title: 'Access denied' })
  return
}
```

### 6.3 Group Full Error

```typescript
if (error?.message?.includes('Group is full')) {
  showToast({ type: 'error', title: 'This group is full (max 4 members)' })
  return
}
```

### 6.4 Invite Code Expired

Edge Function returns HTTP 410 Gone for expired codes:
```typescript
const response = await fetch('/functions/v1/join-group', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ inviteCode }),
})
if (response.status === 410) {
  showToast({ type: 'error', title: 'Invite code has expired' })
  return
}
```

---

## 7. Pagination Conventions

All list endpoints use cursor-based pagination. Never use offset-based pagination.

### Request pattern:

```typescript
const { data } = await supabase
  .from('visited_places')
  .select('id, country_code, category, overall_score, visited_date')
  .eq('user_id', userId)
  .lt('visited_date', cursor ?? '9999-12-31')  // cursor = last item's visited_date
  .order('visited_date', { ascending: false })
  .order('id', { ascending: false })           // tie-breaker for same date
  .limit(PAGE_SIZE)
```

### Response wrapper:

```typescript
// Returns PaginatedResponse<VisitedPlace>
{
  data: VisitedPlace[],
  nextCursor: data[data.length - 1]?.visited_date ?? null,
  hasMore: data.length === PAGE_SIZE,
}
```

---

## 8. Edge Function Endpoints

All Edge Functions are in `supabase/functions/`. Every function must call `requireAuth(req)` as its first operation (TOP-3, M-07-A).

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `upload-photo` | POST | EXIF-stripped photo upload | Yes |
| `join-group` | POST | Join group via invite code | Yes |
| `send-push-notification` | POST | Group activity notification | Yes (service-triggered) |
| `delete-account` | POST | GDPR right-to-erasure | Yes |
| `export-data` | GET | GDPR data export | Yes |

### Standard Edge Function structure:

```typescript
// supabase/functions/example-function/index.ts
import { requireAuth } from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  // Step 1: JWT validation — MUST be first (TOP-3, M-07-A)
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(req)
  } catch (response) {
    return response as Response
  }

  // Step 2: Parse and validate request body
  const body = await req.json()
  // ... Zod validation

  // Step 3: Business logic using user-scoped client (not service role)
  const { data, error } = await auth.client.from('...').select('...')

  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
})
```
