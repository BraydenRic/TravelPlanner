/**
 * worldMapShared — platform-neutral logic shared by WorldMapWeb (SVG in the
 * browser DOM via react-simple-maps) and WorldMapNative (react-native-svg).
 *
 * Everything here is pure data + d3-geo math with no rendering imports, so
 * both implementations stay in visual lockstep: fills, group stripe colors,
 * label names/anchors, and the ISO-code patching for Natural Earth's "-99"
 * entries live in exactly one place.
 */

import { geoArea, geoCentroid, geoContains } from 'd3-geo'
import { colors } from '@theme/colors'
import type { CountryFillIntensity } from '@typedefs/api'
import type { PlaceCategory } from '@typedefs/database'
import type { GroupMapEntry } from './WorldMap'

// ---------------------------------------------------------------------------
// GeoJSON source + feature typing
// ---------------------------------------------------------------------------

// Natural Earth 110m GeoJSON — has ISO_A2 property per feature.
// 110m keeps the SVG path data small enough that all 195 countries
// re-render smoothly during zoom/pan; 50m and 10m datasets caused lag.
export const GEO_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson'

export interface WorldFeatureProperties {
  ISO_A2: string
  ADM0_A3: string
  NAME?: string
}

export interface WorldFeature {
  type?: string
  properties: WorldFeatureProperties
  geometry?: { type?: string; coordinates?: unknown[] }
}

/** A GeoJSON feature paired with its resolved 2-letter ISO code. */
export interface RenderableCountry {
  code: string
  feature: WorldFeature
}

// Manual overrides for countries where ISO_A2 = "-99" in Natural Earth data
export const ADM0_ISO2_OVERRIDES: Record<string, string> = {
  FRA: 'FR', // France (overseas territories cause -99)
  NOR: 'NO', // Norway (Svalbard causes -99)
  XKX: 'XK', // Kosovo
  CYN: 'CY', // Northern Cyprus (map to Cyprus)
}

/**
 * Resolve a feature's 2-letter ISO code, patching Natural Earth's "-99"
 * placeholders. Returns null for unresolvable features and Antarctica
 * (not a markable country; it swallows the bottom of the map).
 */
export function resolveIsoCode(props: WorldFeatureProperties): string | null {
  let code = props.ISO_A2
  if (code === '-99') {
    code = ADM0_ISO2_OVERRIDES[props.ADM0_A3] ?? '-99'
  }
  if (!code || code === '-99' || code === 'AQ') return null
  return code
}

// Module-level cache: the world geometry never changes within a session, so
// every map instance (solo map tab, each group screen) shares one download.
// Cleared on failure so a retry actually re-fetches.
let worldFeaturesPromise: Promise<RenderableCountry[]> | null = null

export function loadWorldFeatures(): Promise<RenderableCountry[]> {
  worldFeaturesPromise ??= fetch(GEO_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`)
      return res.json() as Promise<{ features: WorldFeature[] }>
    })
    .then((json) => {
      const renderable: RenderableCountry[] = []
      for (const feature of json.features ?? []) {
        const code = resolveIsoCode(feature.properties)
        if (code) renderable.push({ code, feature })
      }
      return renderable
    })
    .catch((err: unknown) => {
      worldFeaturesPromise = null
      throw err
    })
  return worldFeaturesPromise
}

/**
 * Find which country contains a geographic point — used by the native map to
 * resolve taps (the tap's screen position is unprojected to [lon, lat] first).
 * geoContains does spherical point-in-polygon on the raw geometry, so it stays
 * exact regardless of projection or zoom.
 */
export function countryAtPoint(
  countries: RenderableCountry[],
  lonLat: [number, number],
): string | null {
  for (const { code, feature } of countries) {
    if (geoContains(feature as never, lonLat)) return code
  }
  return null
}

// ---------------------------------------------------------------------------
// Fill colors
// ---------------------------------------------------------------------------

export function getCountryFill(
  code: string,
  visitedCountries: CountryFillIntensity[],
  activeCategory: PlaceCategory,
): string {
  const fillData = visitedCountries.find((c) => c.country_code === code)
  if (!fillData || fillData.cities_visited === 0) {
    return colors.mapLand
  }

  // Cap fill opacity below 1 so the white country borders always read on top
  // — at full opacity two adjacent highlighted countries used to merge into
  // one blob with an invisible shared border.
  const opacity = 0.2 + fillData.fill_ratio * 0.65

  switch (activeCategory) {
    case 'been':
      return `rgba(0,245,212,${opacity.toFixed(2)})`
    case 'want_to_go':
      return `rgba(167,139,250,0.7)`
    case 'lived':
      return `rgba(245,166,35,0.6)`
    default:
      return `rgba(0,245,212,${opacity.toFixed(2)})`
  }
}

/**
 * In group mode each country is filled per-member: a single member's marks
 * use their solid color, multiple members use a diagonal stripe pattern so
 * everyone can read who's marked where at a glance.
 */
export function buildGroupCountryColors(
  groupMapData: GroupMapEntry[] | undefined | null,
): Map<string, string[]> {
  const byCountry = new Map<string, string[]>()
  // The RPC payload shape is not always an array (Supabase may wrap it); guard
  // defensively so a malformed response can't crash the whole map.
  if (!Array.isArray(groupMapData)) return byCountry
  for (const entry of groupMapData) {
    const existing = byCountry.get(entry.country_code) ?? []
    if (!existing.includes(entry.color)) existing.push(entry.color)
    byCountry.set(entry.country_code, existing)
  }
  return byCountry
}

export function groupPatternId(code: string): string {
  return `grp-stripes-${code}`
}

/**
 * Stripe width for a group country, scaled to the country's projected
 * footprint: a fixed 8px stripe reads fine on Russia but swallows a country
 * the size of Belgium whole. 160 ≈ projection scale;
 * sqrt(steradian area) × scale ≈ on-screen width.
 */
export function groupStripeWidth(feature: WorldFeature | undefined): number {
  const approxWidth = feature ? Math.sqrt(geoArea(feature as never)) * 160 : 60
  return Math.max(2, Math.min(8, approxWidth / 12))
}

// ---------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------

// Curated label positions for countries whose true centroid is geographically
// accurate but visually awkward — e.g. Russia centroid lands deep in Siberia,
// USA gets pulled north-west by Alaska, Canada by the Arctic, etc.
// Coordinates are [longitude, latitude].
export const LABEL_CENTROID_OVERRIDES: Record<string, [number, number]> = {
  US: [-99, 39],
  RU: [55, 58],
  CA: [-100, 56],
  NO: [10, 62],
  SE: [16, 62],
  FI: [26, 64],
  CL: [-72, -36],
  FR: [2.5, 47],
  NZ: [172, -41],
  GB: [-2, 53],
  BR: [-53, -11],
  AU: [134, -25],
  CN: [104, 36],
  IN: [79, 22],
  ID: [118, -2],
}

// Curated shorter display names for countries whose official long name
// overflows their landmass. The Natural Earth `NAME` field is mostly short
// already, but a handful of countries still need help to fit.
export const LABEL_NAME_OVERRIDES: Record<string, string> = {
  US: 'USA',
  GB: 'UK',
  AE: 'UAE',
  KR: 'S. Korea',
  KP: 'N. Korea',
  DO: 'Dominican Rep.',
  CF: 'C.A.R.',
  CD: 'DR Congo',
  BA: 'Bosnia',
  CZ: 'Czechia',
}

// Label anchors are cached — geographies never change after load. For
// MultiPolygon countries the anchor is the centroid of the LARGEST
// landmass, not the whole feature: an archipelago's combined centroid
// (Indonesia, Japan, Philippines) often lands in open water, which made
// labels look like they were floating beside their country.
// WeakMap keyed on the feature object itself so web (rsm geographies) and
// native (raw GeoJSON features) share the same cache mechanism.
const labelAnchorCache = new WeakMap<object, [number, number]>()

export function interiorCentroid(geo: WorldFeature): [number, number] {
  const cached = labelAnchorCache.get(geo)
  if (cached) return cached
  let target: unknown = geo
  if (geo.geometry?.type === 'MultiPolygon' && Array.isArray(geo.geometry.coordinates)) {
    let bestArea = -1
    for (const coords of geo.geometry.coordinates) {
      const candidate = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } }
      const area = geoArea(candidate as never)
      if (area > bestArea) {
        bestArea = area
        target = candidate
      }
    }
  }
  const centroid = geoCentroid(target as never)
  labelAnchorCache.set(geo, centroid)
  return centroid
}

/**
 * Two-stage label sizing shared by both platforms (see WorldMapWeb for the
 * full rationale):
 *   1) countries below an area threshold at the current zoom return null —
 *      their labels can't fit inside them and read as clutter;
 *   2) fit-to-width font with a readable floor, shrunk by zoom so labels
 *      keep constant screen size as the map scales.
 * 160 ≈ projection scale; 0.62 ≈ avg char width / fontSize for uppercase
 * Inter.
 */
export function labelFontSize(
  feature: WorldFeature,
  label: string,
  isMarked: boolean,
  zoom: number,
): number | null {
  const area = geoArea(feature as never)
  const minArea = 0.0018 / (zoom * zoom)
  if (area < minArea) return null

  const baseSize = isMarked ? 10 : 7
  const approxCountryWidth = Math.sqrt(area) * 160
  const charWidth = label.length * 0.62
  const maxFontByWidth = approxCountryWidth / charWidth
  const sized = Math.max(3.5, Math.min(baseSize, maxFontByWidth))
  return Math.max(2, sized / zoom)
}
