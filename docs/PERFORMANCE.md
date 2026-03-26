# Driftmark — Performance Guide

**Version**: 1.0
**Date**: 2026-03-24

---

## 1. Performance Budgets

These are hard requirements. Features that exceed a budget must be optimized before shipping.

| Metric | Budget | Measurement Method |
|--------|--------|--------------------|
| App cold start (iOS/Android) | < 2.0s to interactive | Expo profiler, hermes startup trace |
| Web FCP (First Contentful Paint) | < 1.5s on 4G | Lighthouse, Playwright trace |
| Web LCP (Largest Contentful Paint) | < 2.5s on 4G | Lighthouse |
| Web TTI (Time to Interactive) | < 3.5s on 4G | Lighthouse |
| Initial JS bundle (web) | < 250KB gzipped | `expo export --platform web` + analysis |
| World map GeoJSON | < 120KB gzipped | Pre-processed at build time |
| Per-screen JS chunk | < 50KB gzipped | Webpack bundle analyzer |
| Flash-list frame time | < 16ms (60fps) | React DevTools Profiler |
| Supabase RPC response | < 300ms P95 | Supabase Dashboard, custom logging |
| Country fill intensity query | < 100ms | `EXPLAIN ANALYZE` in Supabase SQL editor |
| Image upload (post-compression) | < 2s on 4G | Measured in E2E tests |
| Photo (thumbnail) load | < 500ms | `expo-image` performance monitor |

---

## 2. GeoJSON Optimization Plan

The world map is the most performance-sensitive feature. The full Natural Earth 110m GeoJSON is ~700KB uncompressed.

### 2.1 Pre-processing Pipeline

Run at build time (not at runtime):

1. **Simplify geometry**: Use `topojson-server` to convert to TopoJSON format (~60% size reduction from shared arcs).
2. **Reduce precision**: Round coordinates to 2 decimal places (sufficient for 110m scale).
3. **Strip unnecessary properties**: Remove all feature properties except `ISO_A2` (country code).
4. **Gzip**: Serve with Content-Encoding: gzip — further ~70% reduction.

Target: < 120KB gzipped for the world outline data.

### 2.2 Loading Strategy

```typescript
// World map GeoJSON: lazy-load on first map mount, cache in module scope
let worldGeoJSON: GeoJSON | null = null

async function getWorldGeoJSON(): Promise<GeoJSON> {
  if (worldGeoJSON) return worldGeoJSON
  const response = await fetch('/assets/world-110m.topojson')
  worldGeoJSON = await response.json()
  return worldGeoJSON
}
```

On native: bundle the TopoJSON in `assets/` and import directly (Metro includes it in bundle).
On web: serve from static assets with long-term cache header (`Cache-Control: max-age=31536000`).

### 2.3 Render Strategy

- Use `react-simple-maps` with SVG — no WebGL required for 195-country world map.
- Country fill colors computed from Zustand store (no re-fetch on color change).
- Debounce country hover events by 50ms to avoid excessive re-renders.
- Virtualize city dots with `@shopify/flash-list` in the city overlay panel.

---

## 3. Code Splitting Strategy

Expo Router provides automatic code splitting per route. Additional optimizations:

### 3.1 Route-Level Splitting

Each `src/app/` screen file is a separate chunk. Large screen dependencies are dynamically imported:

```typescript
// Country detail screen — chart library loaded on demand
const RadarChart = lazy(() => import('@components/ratings/RadarChart'))
```

### 3.2 Vendor Chunking (Web)

Configure Metro to split `victory-native` and `d3-geo` into a separate vendor chunk:

```javascript
// metro.config.js — add to serializer options
config.serializer = {
  ...config.serializer,
  experimentalSerializerHook: createVendorChunks(['victory-native', 'd3-geo', 'react-simple-maps']),
}
```

### 3.3 Critical Path

The `(tabs)/index` screen (world map) must not import rating charts, group components, or settings. These load only when those tabs are first accessed.

---

## 4. Caching Strategy

### 4.1 Zustand Store Caching

| Store Slice | Cached Data | Invalidation Trigger |
|-------------|-------------|---------------------|
| `mapStore` | `CountryFillIntensity[]` | `visited_places` INSERT/UPDATE/DELETE |
| `statsStore` | `TravelStats` | Same as above |
| `countryStore` | `CountryRatings` (per country) | Rating change for that country |
| `groupStore` | `GroupMapData` | Realtime `group_places` change |

Use a simple TTL pattern for non-realtime data:
```typescript
interface CacheEntry<T> { data: T; fetchedAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  return entry !== null && Date.now() - entry.fetchedAt < CACHE_TTL_MS
}
```

### 4.2 Image Caching

`expo-image` uses a built-in disk cache keyed by URL. Configuration:
```typescript
<Image
  source={{ uri: thumbnailUrl }}
  cachePolicy="disk"  // persist across sessions
  recyclingKey={photoId}
/>
```

For signed URLs (5-min TTL originals), use `cachePolicy="memory"` to prevent stale cache hits.

### 4.3 HTTP Caching

- Static assets (GeoJSON, icons): `Cache-Control: public, max-age=31536000, immutable`
- API responses via Supabase: rely on Supabase CDN for cacheable data; non-cacheable by default for authenticated requests

---

## 5. Query Optimization Rules

Mandatory rules for all service functions:

### Rule 1: Always Specify Columns
```typescript
// WRONG
const { data } = await supabase.from('visited_places').select('*')

// CORRECT
const { data } = await supabase
  .from('visited_places')
  .select('id, country_code, city_id, category, overall_score, visited_date')
```

### Rule 2: Use RPC for Aggregations
Never compute averages or counts in the client. Use RPC functions that run on the DB:
```typescript
// WRONG — fetches all rows, aggregates in JS
const { data } = await supabase.from('place_ratings').select('score')
const avg = data.reduce((acc, r) => acc + r.score, 0) / data.length

// CORRECT
const { data } = await supabase.rpc('compute_country_ratings', {
  p_country_code: countryCode,
  p_user_id: userId,
})
```

### Rule 3: Cursor-Based Pagination
Never use `.range(offset, limit)` (offset pagination causes full table scans):
```typescript
// WRONG
.range(page * 20, page * 20 + 19)

// CORRECT
.lt('visited_date', lastCursor)
.order('visited_date', { ascending: false })
.limit(20)
```

### Rule 4: Avoid N+1 Queries
When fetching a list with related data, use Supabase's nested select syntax:
```typescript
const { data } = await supabase
  .from('visited_places')
  .select(`
    id, country_code, category, overall_score,
    place_ratings (category, score),
    place_photos (thumbnail_path, sort_order)
  `)
  .eq('user_id', userId)
  .order('visited_date', { ascending: false })
  .limit(20)
```

### Rule 5: Batch Achievement Checks
Call `check_achievements` once after a series of mutations, not after each individual write:
```typescript
// WRONG — 3 RPC calls for 3 ratings
for (const rating of ratings) {
  await supabase.from('place_ratings').upsert(rating)
  await supabase.rpc('check_achievements', { p_user_id: userId })
}

// CORRECT — 1 batch upsert + 1 achievement check
await supabase.from('place_ratings').upsert(ratings)
await supabase.rpc('check_achievements', { p_user_id: userId })
```

---

## 6. React Native Performance Rules

### 6.1 FlashList Configuration

Always provide `estimatedItemSize` to FlashList. Measure actual rendered heights:
```typescript
<FlashList
  data={places}
  renderItem={({ item }) => <PlaceCard place={item} />}
  estimatedItemSize={120}  // measured: 112px typical
  keyExtractor={(item) => item.id}
/>
```

### 6.2 Animation Rules

- All animations must use Reanimated worklets (`useAnimatedStyle`, `withSpring`) — never `Animated.Value` from React Native core.
- Never trigger animations from the JS thread inside `onLayout` callbacks.
- Map country hover color changes: use `useSharedValue` for fill color to avoid bridge.

### 6.3 Image Rules

- Always use `expo-image` (not `<Image>` from react-native) — it supports blurhash placeholders and disk caching.
- Generate thumbnails server-side at 300×200px before upload.
- Use `priority="high"` only for above-the-fold images (first 3 in a list).

### 6.4 Re-render Prevention

- Memoize all list items with `React.memo`.
- Never pass inline object/function props to memoized components.
- Use `useCallback` for all event handlers passed to child components.
- Use Zustand's selector pattern to subscribe to minimal state slices:
  ```typescript
  // WRONG — re-renders on any store change
  const store = useMapStore()

  // CORRECT — re-renders only when selectedCountry changes
  const selectedCountry = useMapStore((s) => s.selectedCountryCode)
  ```

---

## 7. Bundle Size Monitoring

Run after every significant dependency change:
```bash
npx expo export --platform web
npx source-map-explorer dist/**/*.js
```

If the main bundle exceeds 250KB gzipped:
1. Check for accidental import of large libraries (moment.js, lodash full)
2. Verify `victory-native` and `d3-geo` are in vendor chunk
3. Check for duplicate dependencies (`npm ls <package>`)
4. Use `@expo/metro-config`'s `experimentalSerializerHook` to enforce chunk limits
