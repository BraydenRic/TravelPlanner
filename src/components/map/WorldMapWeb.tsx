/**
 * WorldMapWeb — the web implementation of WorldMap, built on react-simple-maps
 * with D3 geo projections (GeoJSON fetched at runtime).
 *
 * This file is loaded via React.lazy from WorldMap.tsx so react-simple-maps
 * and the d3-* dependency chain live in their own async chunk instead of the
 * entry bundle — deep links to non-map screens never pay for them.
 */

import React, { memo, useState, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'
// d3-geo is already a transitive dep of react-simple-maps. geoCentroid places
// labels at the polygon centroid; geoArea lets us skip countries too small to
// label readably at the current zoom.
import { geoCentroid, geoArea } from 'd3-geo'
import { colors } from '@theme/colors'
import type { CountryFillIntensity } from '@typedefs/api'
import type { PlaceCategory } from '@typedefs/database'
import type { WorldMapProps, GroupMapEntry } from './WorldMap'

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getCountryFill(
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
function buildGroupCountryColors(
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

function groupPatternId(code: string): string {
  return `grp-stripes-${code}`
}

// ---------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------

// Curated label positions for countries whose true centroid is geographically
// accurate but visually awkward — e.g. Russia centroid lands deep in Siberia,
// USA gets pulled north-west by Alaska, Canada by the Arctic, etc.
// Coordinates are [longitude, latitude].
const LABEL_CENTROID_OVERRIDES: Record<string, [number, number]> = {
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
const LABEL_NAME_OVERRIDES: Record<string, string> = {
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
const labelAnchorCache = new Map<string, [number, number]>()
function interiorCentroid(geo: {
  rsmKey: string
  geometry?: { type?: string; coordinates?: unknown[] }
}): [number, number] {
  const cached = labelAnchorCache.get(geo.rsmKey)
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
  labelAnchorCache.set(geo.rsmKey, centroid)
  return centroid
}

// d3-zoom filter: keep wheel-zoom and drag-pan, but drop dblclick so a
// quick double-tap while marking countries never zooms the map. Module-level
// constant — it's in ZoomableGroup's effect deps, so an inline arrow would
// re-bind the zoom behavior on every render.
// Mirrors d3-zoom's default filter (ignore ctrl+wheel pinch and non-left
// buttons) with the dblclick exclusion added.
const filterZoomEvent = (event: { type?: string; ctrlKey?: boolean; button?: number }) => {
  if (!event) return false
  if (event.type === 'dblclick') return false
  return !event.ctrlKey && !event.button
}

// Natural Earth 110m GeoJSON — has ISO_A2 property per feature.
// 110m keeps the SVG path data small enough that the browser can
// re-render all 195 countries smoothly during zoom/pan. We sharpen the
// visual feel via non-scaling strokes (below) instead of more polygons —
// 50m and 10m datasets caused noticeable lag here.
const GEO_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson'

// Manual overrides for countries where ISO_A2 = "-99" in Natural Earth data
const ADM0_ISO2_OVERRIDES: Record<string, string> = {
  FRA: 'FR', // France (overseas territories cause -99)
  NOR: 'NO', // Norway (Svalbard causes -99)
  XKX: 'XK', // Kosovo
  CYN: 'CY', // Northern Cyprus (map to Cyprus)
}

const WebGeo = memo(function WebGeo({
  code,
  geo,
  fill,
  selected,
  onPress,
}: {
  code: string
  geo: unknown
  fill: string
  selected: boolean
  onPress: (code: string) => void
}) {
  return (
    <Geography
      key={code}
      geography={geo}
      onClick={() => onPress(code)}
      // non-scaling-stroke keeps border thickness constant on screen at any
      // zoom level — gives a crisp, detailed feel without needing a heavier
      // polygon dataset.
      vectorEffect="non-scaling-stroke"
      style={{
        default: {
          fill,
          // Brighter than the fills' effective luminance so shared borders
          // stay visible between two adjacent highlighted countries; fills
          // are capped below full opacity for the same reason.
          stroke: 'rgba(255,255,255,0.85)',
          strokeWidth: 0.8,
          outline: 'none',
          cursor: 'pointer',
          transition: 'fill 200ms',
        },
        // Dim on hover via fillOpacity, never by rewriting the fill string:
        // appending an alpha suffix ("#A78BFA" → "#A78BFACC") breaks for
        // rgba() fills and for pattern fills like url(#grp-stripes-US) —
        // the invalid paint value is silently ignored, so a country that
        // just switched to stripes kept its stale fill until mouse-out.
        hover: {
          fill,
          fillOpacity: selected ? 1 : 0.8,
          stroke: colors.accentTeal,
          strokeWidth: 1,
          outline: 'none',
          cursor: 'pointer',
        },
        pressed: {
          fill,
          outline: 'none',
        },
      }}
    />
  )
})

export default function WebMap({
  visitedCountries,
  activeCategory,
  groupMapData,
  onCountryPress,
  selectedCountry,
  testID,
  showAllLabels = false,
}: WorldMapProps) {
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 })
  const isGroupMode = Array.isArray(groupMapData)

  const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos)
  }, [])

  const groupColors = isGroupMode ? buildGroupCountryColors(groupMapData) : null
  const multiMemberEntries = groupColors
    ? Array.from(groupColors.entries()).filter(([, c]) => c.length > 1)
    : []

  return (
    <View style={styles.container} pointerEvents="auto" data-testid={testID}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 160, center: [0, 10] }}
        style={COMPOSABLE_MAP_STYLE}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          maxZoom={12}
          // @types/react-simple-maps declares (element: SVGElement) => boolean,
          // but the library actually passes the d3-zoom event — see
          // useZoomPan's filterFunc in react-simple-maps source.
          filterZoomEvent={filterZoomEvent as unknown as (element: SVGElement) => boolean}
        >
        <Geographies geography={GEO_URL}>
          {({
            geographies,
          }: {
            geographies: {
              rsmKey: string
              properties: { ISO_A2: string; ADM0_A3: string; NAME?: string }
              geometry?: { type?: string; coordinates?: unknown[] }
            }[]
          }) => {
            // Resolve the 2-letter code once per feature (the Natural Earth
            // dataset uses "-99" for some countries — we patch via override).
            const resolveCode = (geo: { properties: { ISO_A2: string; ADM0_A3: string } }) => {
              let code = geo.properties.ISO_A2
              if (code === '-99') {
                code = ADM0_ISO2_OVERRIDES[geo.properties.ADM0_A3] ?? '-99'
              }
              return code
            }

            const renderable = geographies
              .map((geo) => ({ geo, code: resolveCode(geo) }))
              .filter(({ code }) => code && code !== '-99' && code !== 'AQ')

            // Labels scale inversely with zoom so they stay readable but
            // never dominate. Marked countries get a bigger, brighter label.
            const labelSize = (base: number) => Math.max(2, base / position.zoom)

            return (
              <>
                {/* Stripe pattern defs live inside the render prop so each
                    pattern can scale with its country's projected footprint:
                    a fixed 8px stripe reads fine on Russia but swallows a
                    country the size of Belgium whole. 160 ≈ projection
                    scale; sqrt(steradian area) × scale ≈ on-screen width. */}
                {multiMemberEntries.length > 0 && (
                  <defs>
                    {multiMemberEntries.map(([code, memberColors]) => {
                      const geoForCode = renderable.find((r) => r.code === code)?.geo
                      const approxWidth = geoForCode
                        ? Math.sqrt(geoArea(geoForCode as never)) * 160
                        : 60
                      const stripe = Math.max(2, Math.min(8, approxWidth / 12))
                      const width = stripe * memberColors.length
                      return (
                        <pattern
                          key={code}
                          id={groupPatternId(code)}
                          patternUnits="userSpaceOnUse"
                          width={width}
                          height={stripe}
                          patternTransform="rotate(45)"
                        >
                          {memberColors.map((c, i) => (
                            <rect
                              key={c}
                              x={i * stripe}
                              y={0}
                              width={stripe}
                              height={stripe}
                              fill={c}
                              opacity={0.8}
                            />
                          ))}
                        </pattern>
                      )
                    })}
                  </defs>
                )}
                {renderable.map(({ geo, code }) => {
                  let fill: string
                  if (groupColors) {
                    const memberColors = groupColors.get(code)
                    if (!memberColors || memberColors.length === 0) {
                      fill = colors.mapLand
                    } else if (memberColors.length === 1) {
                      // CC = ~80% alpha — keeps member colors just dim
                      // enough that shared white borders stay visible
                      fill = `${memberColors[0]}CC`
                    } else {
                      fill = `url(#${groupPatternId(code)})`
                    }
                  } else {
                    fill = getCountryFill(code, visitedCountries, activeCategory)
                  }

                  return (
                    <WebGeo
                      key={geo.rsmKey}
                      code={code}
                      geo={geo}
                      fill={fill}
                      selected={selectedCountry === code}
                      onPress={onCountryPress}
                    />
                  )
                })}

                {/* Labels render in a second pass so all names paint on top of
                    every country fill — prevents neighbors from covering a name.
                    The toggle controls all labels: off means a clean canvas,
                    on means every country labeled (marked ones get emphasis).

                    Multiple polygons can share an ISO code after the
                    ADM0_ISO2_OVERRIDES remap (e.g. Cyprus + Northern Cyprus
                    both end up as 'CY'). We label only the first polygon
                    seen per code so the name doesn't double-render. */}
                {showAllLabels &&
                  (() => {
                    const labeledCodes = new Set<string>()
                    return renderable.map(({ geo, code }) => {
                      if (labeledCodes.has(code)) return null

                      // Prefer a curated short name if the official one is
                      // too long for its country. Falls back to the GeoJSON
                      // NAME property otherwise.
                      const name = LABEL_NAME_OVERRIDES[code] ?? geo.properties.NAME
                      if (!name) return null

                      const centroid =
                        LABEL_CENTROID_OVERRIDES[code] ?? interiorCentroid(geo)
                      if (!centroid || Number.isNaN(centroid[0])) return null

                      const isMarked = groupColors
                        ? (groupColors.get(code)?.length ?? 0) > 0
                        : (visitedCountries.find((c) => c.country_code === code)
                            ?.cities_visited ?? 0) > 0

                      // Two-stage label sizing:
                      //   1) Hard skip for countries below an area threshold
                      //      (Cyprus, Singapore, Vatican etc. at low zoom) —
                      //      their labels can't fit inside them, and a label
                      //      hovering NEXT to a speck reads as clutter.
                      //   2) Fit-to-width font with a readable floor so
                      //      medium countries (Germany, Italy, Poland) get
                      //      proportionally smaller labels but stay labeled.
                      // 160 ≈ Natural Earth projection scale. 0.62 ≈ avg
                      // char width / fontSize for uppercase Inter.
                      const area = geoArea(geo as never)
                      const minArea = 0.0018 / (position.zoom * position.zoom)
                      if (area < minArea) return null

                      labeledCodes.add(code)

                      const label = name.toUpperCase()
                      const baseSize = isMarked ? 10 : 7
                      const approxCountryWidth = Math.sqrt(area) * 160
                      const charWidth = label.length * 0.62
                      const maxFontByWidth = approxCountryWidth / charWidth
                      // Fit-to-width, clamped between a readable floor and
                      // the base size so large countries don't get oversized
                      // labels and small countries stay visible.
                      const sized = Math.max(3.5, Math.min(baseSize, maxFontByWidth))
                      const fontSize = Math.max(2, sized / position.zoom)
                      // Cartographic "printed on the map" treatment:
                      // translucent fill + whisper of a dark halo instead of
                      // the old heavy black outline, uppercase with tracking.
                      // The country color shows through, so the label reads
                      // as part of the terrain rather than a sticker on top.
                      const fillColor = isMarked
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(255,255,255,0.45)'
                      const strokeWidth = labelSize(isMarked ? 0.45 : 0.3)

                      return (
                        <Marker key={`label-${code}`} coordinates={centroid}>
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={fontSize}
                            fontFamily="Inter, system-ui, sans-serif"
                            fontWeight={isMarked ? 600 : 500}
                            letterSpacing={fontSize * 0.08}
                            fill={fillColor}
                            stroke="rgba(7,8,13,0.55)"
                            strokeWidth={strokeWidth}
                            paintOrder="stroke fill"
                            style={LABEL_TEXT_STYLE}
                          >
                            {label}
                          </text>
                        </Marker>
                      )
                    })
                  })()}
              </>
            )
          }}
        </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </View>
  )
}

const COMPOSABLE_MAP_STYLE = {
  width: '100%' as const,
  height: '100%' as const,
  backgroundColor: colors.mapOcean,
  pointerEvents: 'auto' as const,
}

// Labels never want to swallow clicks or be selected as text.
const LABEL_TEXT_STYLE = {
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapOcean,
  },
})
