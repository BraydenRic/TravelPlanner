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
import { colors } from '@theme/colors'
// Fill colors, group stripe logic, label names/anchors/sizing, and the
// Natural Earth ISO-code patching are shared with WorldMapNative so the two
// platforms never drift apart visually.
import {
  GEO_URL,
  buildGroupCountryColors,
  getCountryFill,
  groupPatternId,
  groupStripeWidth,
  interiorCentroid,
  labelFontSize,
  resolveIsoCode,
  LABEL_CENTROID_OVERRIDES,
  LABEL_NAME_OVERRIDES,
} from './worldMapShared'
import type { WorldMapProps } from './WorldMap'

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
            const renderable = geographies
              .map((geo) => ({ geo, code: resolveIsoCode(geo.properties) }))
              .filter((entry): entry is { geo: (typeof geographies)[number]; code: string } =>
                entry.code !== null,
              )

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
                      const stripe = groupStripeWidth(geoForCode)
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

                      // Two-stage sizing (skip-below-area, then fit-to-width
                      // with a readable floor) — shared with the native map,
                      // see labelFontSize in worldMapShared for the details.
                      const label = name.toUpperCase()
                      const fontSize = labelFontSize(geo, label, isMarked, position.zoom)
                      if (fontSize === null) return null

                      labeledCodes.add(code)
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
