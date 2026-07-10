/**
 * WorldMapNative — the iOS/Android implementation of WorldMap.
 *
 * The web map (WorldMapWeb) renders through react-simple-maps, which creates
 * browser DOM elements and can't run in a native app. This implementation
 * keeps the same data (Natural Earth GeoJSON) and the same math (d3-geo
 * projection + path generation, shared via worldMapShared) but renders
 * through react-native-svg and handles gestures with
 * react-native-gesture-handler:
 *
 *   - Countries are <Path> elements whose `d` strings are generated once
 *     from the projection and never change.
 *   - Taps are resolved geographically: the tap point is unprojected back to
 *     [lon, lat] and matched with d3's spherical point-in-polygon
 *     (countryAtPoint). No per-path hit-testing needed, and accuracy is
 *     independent of zoom.
 *   - The SVG surface renders the whole world exactly once. Pinch/pan live
 *     entirely in shared values applied as a view transform on the UI
 *     thread — releasing a gesture commits nothing and re-renders nothing,
 *     so there is no frame in which the map can jump. (The previous design
 *     folded each gesture into the SVG's own <G transform> on release for
 *     vector crispness at rest, but the reset and the re-render travel on
 *     different threads and no ordering of the two is glitch-free.) The
 *     surface is rendered oversampled instead, so zooming magnifies a
 *     supersampled raster rather than a 1:1 one.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import Svg, { ClipPath, Defs, G, Line, Path, Text as SvgText } from 'react-native-svg'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
import {
  buildGroupCountryColors,
  countryAtPoint,
  getCountryFill,
  groupStripeWidth,
  interiorCentroid,
  labelFontSize,
  loadWorldFeatures,
  LABEL_CENTROID_OVERRIDES,
  LABEL_NAME_OVERRIDES,
  type RenderableCountry,
} from './worldMapShared'
import type { WorldMapProps } from './WorldMap'

// Virtual canvas the projection draws into. Matches the web map's default
// react-simple-maps canvas (800×600 at projection scale 160) so every shared
// size heuristic — stripe widths, label fit-to-width — behaves identically.
const MAP_W = 800
const MAP_H = 600
const MIN_ZOOM = 1
const MAX_ZOOM = 8

// The surface renders larger than its fitted on-screen size by this factor,
// so the gesture zoom magnifies a supersampled raster (blur at MAX_ZOOM is
// MAX_ZOOM/OVERSAMPLE ≈ 2.7× instead of 8×). Capped in points so the backing
// texture stays under common GPU limits on dense screens (~1300pt × 3px/pt
// ≈ 3.9k px, under the 4k ceiling of older devices).
const OVERSAMPLE = 3
const MAX_SURFACE_PT = 1300

function clampNumber(v: number, lo: number, hi: number): number {
  'worklet'
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Clamp one axis of the map-surface offset so the map always covers the
 * viewport (no dragging the world off-screen). When the map is smaller than
 * the viewport on this axis (letterboxed at low zoom), center it instead.
 */
function clampOffsetAxis(o: number, extent: number, viewDim: number): number {
  'worklet'
  if (extent <= viewDim) return (viewDim - extent) / 2
  return Math.min(0, Math.max(viewDim - extent, o))
}

function groupClipId(code: string): string {
  return `grp-clip-${code}`
}

/**
 * Pre-blend a member color over the land fill (≈80%, matching the `CC`
 * alpha used for single-member fills) so stripes can be painted fully
 * opaque — translucent strokes re-expose anti-aliasing gaps as dark
 * hairlines wherever two stripes abut.
 */
function mixHex(fg: string, bg: string, t: number): string {
  const f = parseInt(fg.slice(1), 16)
  const b = parseInt(bg.slice(1), 16)
  const ch = (shift: number) =>
    Math.round(((f >> shift) & 0xff) * t + ((b >> shift) & 0xff) * (1 - t))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

/**
 * Stripe geometry for multi-member countries: real 45° lines clipped to the
 * country outline instead of an SVG <Pattern>. Native rasterizes pattern
 * tiles one by one and their anti-aliased edges never quite meet, which
 * showed as black hairlines between stripes on device — continuous strokes
 * have no tile boundaries to seam.
 */
function buildStripeLines(
  bounds: [[number, number], [number, number]],
  stripeWidth: number,
  stripeColors: string[],
): { x1: number; y1: number; x2: number; y2: number; color: string }[] {
  const [[x0, y0], [x1, y1]] = bounds
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  // Half the bbox diagonal reaches every corner from the center; pad by one
  // stripe so the outermost stripes fully cross the outline.
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + stripeWidth
  // Lines run along d = (1,1)/√2 and are spaced along the normal
  // n = (1,−1)/√2: a point is p = across·n + along·d.
  const inv = Math.SQRT1_2
  const centerAlong = (cx + cy) * inv
  const centerAcross = (cx - cy) * inv
  const count = Math.ceil((2 * half) / stripeWidth)
  const lines = []
  for (let k = 0; k < count; k++) {
    const across = centerAcross - half + (k + 0.5) * stripeWidth
    const a1 = centerAlong - half
    const a2 = centerAlong + half
    lines.push({
      x1: (across + a1) * inv,
      y1: (a1 - across) * inv,
      x2: (across + a2) * inv,
      y2: (a2 - across) * inv,
      color: stripeColors[k % stripeColors.length],
    })
  }
  return lines
}

// ---------------------------------------------------------------------------
// Country path (memoized — only re-renders when its own fill changes)
// ---------------------------------------------------------------------------

const CountryPath = memo(function CountryPath({
  d,
  fill,
  selected,
  strokeScale,
}: {
  d: string
  fill: string
  selected: boolean
  /** 1/settledZoom — keeps borders a constant on-screen thickness at the
      resting zoom. (The SVG never re-renders during gestures, so this
      replaces vectorEffect="non-scaling-stroke" from the commit-based
      design; borders thicken slightly mid-pinch, then settle.) */
  strokeScale: number
}) {
  return (
    <Path
      d={d}
      fill={fill}
      // Brighter than the fills' effective luminance so shared borders stay
      // visible between adjacent highlighted countries (fills are capped
      // below full opacity for the same reason — see getCountryFill).
      stroke={selected ? colors.accentTeal : 'rgba(255,255,255,0.85)'}
      strokeWidth={(selected ? 1 : 0.8) * strokeScale}
    />
  )
})

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WorldMapNative({
  visitedCountries,
  activeCategory,
  groupMapData,
  onCountryPress,
  selectedCountry,
  testID,
  showAllLabels = false,
}: WorldMapProps) {
  const [countries, setCountries] = useState<RenderableCountry[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [layout, setLayout] = useState({ w: 0, h: 0 })
  // The map transform lives entirely in shared values (below), never in
  // React state. `settledZoom` is the only zoom React sees — set after a
  // pinch ends — and drives cosmetics only (border widths, label sizes),
  // so updating it never moves anything on screen.
  const [settledZoom, setSettledZoom] = useState(1)
  const viewInitialized = React.useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    loadWorldFeatures()
      .then((features) => {
        if (!cancelled) setCountries(features)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  const projection = useMemo(
    () => geoNaturalEarth1().scale(160).center([0, 10]).translate([MAP_W / 2, MAP_H / 2]),
    [],
  )

  const pathGen = useMemo(() => geoPath(projection), [projection])

  const countryPaths = useMemo(() => {
    if (!countries) return null
    return countries
      .map(({ code, feature }) => ({ code, feature, d: pathGen(feature as never) ?? '' }))
      .filter((entry) => entry.d !== '')
  }, [countries, pathGen])

  // The 800×600 canvas fits the layout scaled by m ("meet" behaviour). The
  // surface renders oversample× that size and the view transform scales it
  // back down, so the screen mapping is: screen = o + zoom·m·canvas.
  const m = layout.w > 0 ? Math.min(layout.w / MAP_W, layout.h / MAP_H) : 0
  const oversample = m > 0 ? Math.min(OVERSAMPLE, MAX_SURFACE_PT / (m * MAP_W)) : 1
  const surfW = m * MAP_W * oversample
  const surfH = m * MAP_H * oversample

  // --- Gesture state (UI thread only) ---------------------------------------
  // zoomSV ∈ [MIN_ZOOM, MAX_ZOOM]; (oxSV, oySV) is the view-space position
  // of the canvas origin: screen = o + zoom·m·canvas. Gestures mutate these
  // directly — there is no live/committed split and no commit step.
  const zoomSV = useSharedValue(1)
  const oxSV = useSharedValue(0)
  const oySV = useSharedValue(0)
  const panBaseX = useSharedValue(0)
  const panBaseY = useSharedValue(0)
  const pinchBaseZoom = useSharedValue(1)
  const pinchBaseX = useSharedValue(0)
  const pinchBaseY = useSharedValue(0)
  const pinchFocalX = useSharedValue(0)
  const pinchFocalY = useSharedValue(0)

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!countries || m === 0) return
      // View point → canvas units → geographic coordinates. Shared values
      // read synchronously from JS; taps only land while the map is at rest.
      const px = (x - oxSV.value) / (zoomSV.value * m)
      const py = (y - oySV.value) / (zoomSV.value * m)
      const lonLat = projection.invert?.([px, py])
      if (!lonLat) return
      const code = countryAtPoint(countries, lonLat)
      if (code) onCountryPress(code)
    },
    [countries, m, projection, onCountryPress, oxSV, oySV, zoomSV],
  )

  // Gestures capture layout scalars by value, so they're rebuilt each
  // render — GestureDetector diffs and updates in place.
  const viewW = layout.w
  const viewH = layout.h

  const pan = Gesture.Pan()
    .averageTouches(true)
    .maxPointers(2)
    .onStart(() => {
      panBaseX.value = oxSV.value
      panBaseY.value = oySV.value
    })
    .onUpdate((e) => {
      const z = zoomSV.value
      oxSV.value = clampOffsetAxis(panBaseX.value + e.translationX, z * m * MAP_W, viewW)
      oySV.value = clampOffsetAxis(panBaseY.value + e.translationY, z * m * MAP_H, viewH)
    })

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      pinchBaseZoom.value = zoomSV.value
      pinchBaseX.value = oxSV.value
      pinchBaseY.value = oySV.value
      pinchFocalX.value = e.focalX
      pinchFocalY.value = e.focalY
    })
    .onUpdate((e) => {
      const next = clampNumber(pinchBaseZoom.value * e.scale, MIN_ZOOM, MAX_ZOOM)
      // Keep the pinch focal point stationary: the canvas point under the
      // focal at gesture start must stay under it, so o' = f − k·(f − o0).
      const k = next / pinchBaseZoom.value
      zoomSV.value = next
      oxSV.value = clampOffsetAxis(
        pinchFocalX.value - k * (pinchFocalX.value - pinchBaseX.value),
        next * m * MAP_W,
        viewW,
      )
      oySV.value = clampOffsetAxis(
        pinchFocalY.value - k * (pinchFocalY.value - pinchBaseY.value),
        next * m * MAP_H,
        viewH,
      )
    })
    .onFinalize(() => {
      // The only JS-side consequence of any gesture: cosmetics (border
      // widths, label sizes) re-render for the new zoom. Positionally a
      // no-op, so a late-landing frame is invisible.
      runOnJS(setSettledZoom)(zoomSV.value)
    })

  const tap = Gesture.Tap()
    .withTestId('world-map-tap')
    .onEnd((e, success) => {
      if (success) runOnJS(handleTap)(e.x, e.y)
    })

  // Race: a quick touch fires the tap; any movement activates pan/pinch,
  // which cancels the tap — so marking countries never fights with panning.
  const composed = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch))

  // RN transforms scale about the view center; convert the top-left-origin
  // mapping (screen = o + k·surfacePoint) into center-origin terms:
  // translate = o + (k − 1)·center.
  const animatedStyle = useAnimatedStyle(() => {
    const k = zoomSV.value / oversample
    return {
      transform: [
        { translateX: oxSV.value + (k - 1) * (surfW / 2) },
        { translateY: oySV.value + (k - 1) * (surfH / 2) },
        { scale: k },
      ],
    }
  })

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout
      const fitM = Math.min(width / MAP_W, height / MAP_H)
      if (!viewInitialized.current && width > 0 && height > 0) {
        viewInitialized.current = true
        // First layout: start "cover"-fitted. The 4:3 world canvas
        // letterboxes badly on portrait phones (a short strip with ocean
        // bands above and below), so begin zoomed just enough to fill the
        // viewport, centered. Users can still pinch out to the full-world
        // view, and on 4:3 layouts (desktop, tests) the cover zoom is
        // exactly 1 so nothing changes.
        const coverZoom = clampNumber(
          Math.max(width / MAP_W, height / MAP_H) / fitM,
          MIN_ZOOM,
          MAX_ZOOM,
        )
        zoomSV.value = coverZoom
        oxSV.value = (width - coverZoom * fitM * MAP_W) / 2
        oySV.value = (height - coverZoom * fitM * MAP_H) / 2
        setSettledZoom(coverZoom)
      } else if (layout.w > 0 && (layout.w !== width || layout.h !== height)) {
        // Re-layout (rotation, container resize): the offsets are in view
        // units, so remap them to keep the same canvas point centered.
        const mOld = Math.min(layout.w / MAP_W, layout.h / MAP_H)
        const z = zoomSV.value
        const cx = (layout.w / 2 - oxSV.value) / (z * mOld)
        const cy = (layout.h / 2 - oySV.value) / (z * mOld)
        oxSV.value = clampOffsetAxis(width / 2 - z * fitM * cx, z * fitM * MAP_W, width)
        oySV.value = clampOffsetAxis(height / 2 - z * fitM * cy, z * fitM * MAP_H, height)
      }
      setLayout({ w: width, h: height })
    },
    [layout, zoomSV, oxSV, oySV],
  )

  // --- Fills ----------------------------------------------------------------
  const isGroupMode = Array.isArray(groupMapData)
  const groupColors = isGroupMode ? buildGroupCountryColors(groupMapData) : null
  const multiMemberEntries = groupColors
    ? Array.from(groupColors.entries()).filter(([, c]) => c.length > 1)
    : []

  if (loadError) {
    return (
      <View style={[styles.container, styles.center]} testID={testID}>
        <Text style={styles.errorText}>Couldn&apos;t load the map.</Text>
        <Pressable
          onPress={() => setLoadAttempt((n) => n + 1)}
          style={styles.retryButton}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  if (!countryPaths) {
    return (
      <View style={[styles.container, styles.center]} testID={testID}>
        <ActivityIndicator color={colors.accentTeal} size="large" />
      </View>
    )
  }

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.container} onLayout={onLayout} testID={testID}>
        {layout.w > 0 && (
          <Animated.View style={[styles.surface, { width: surfW, height: surfH }, animatedStyle]}>
            <Svg width={surfW} height={surfH} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
              {multiMemberEntries.length > 0 && (
                <Defs>
                  {multiMemberEntries.map(([code]) => {
                    const entry = countryPaths.find((c) => c.code === code)
                    if (!entry) return null
                    return (
                      <ClipPath key={code} id={groupClipId(code)}>
                        <Path d={entry.d} />
                      </ClipPath>
                    )
                  })}
                </Defs>
              )}

              {countryPaths.map(({ code, feature, d }) => {
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
                    // Multi-member: neutral base — the stripe overlay pass
                    // below paints the member colors on top.
                    fill = colors.mapLand
                  }
                } else {
                  fill = getCountryFill(code, visitedCountries, activeCategory)
                }
                return (
                  <CountryPath
                    // ADM0_A3, not the ISO code: the ISO-code remap makes
                    // Cyprus + Northern Cyprus both 'CY', and a duplicate
                    // key would drop one polygon from the map.
                    key={feature.properties.ADM0_A3}
                    d={d}
                    fill={fill}
                    selected={selectedCountry === code}
                    strokeScale={1 / settledZoom}
                  />
                )
              })}

              {/* Multi-member stripes paint after the base fills as opaque
                  45° lines clipped to each country (see buildStripeLines for
                  why not <Pattern>). The border re-paints on top because the
                  stripes cover its inner half. */}
              {multiMemberEntries.map(([code, memberColors]) => {
                const entry = countryPaths.find((c) => c.code === code)
                if (!entry) return null
                // The shared width is tuned for the web's big canvas; a
                // phone renders the canvas at roughly half scale, where
                // hairline stripes alias into moiré on the rasterized
                // surface. Floor them at a constant on-screen width at the
                // settled zoom.
                const stripe = Math.max(
                  groupStripeWidth(entry.feature),
                  5 / (m * settledZoom),
                )
                const lines = buildStripeLines(
                  pathGen.bounds(entry.feature as never),
                  stripe,
                  memberColors.map((c) => mixHex(c, colors.mapLand, 0.8)),
                )
                const selected = selectedCountry === code
                return (
                  <G key={`stripes-${code}`}>
                    <G clipPath={`url(#${groupClipId(code)})`}>
                      {lines.map((l, i) => (
                        <Line
                          key={i}
                          x1={l.x1}
                          y1={l.y1}
                          x2={l.x2}
                          y2={l.y2}
                          stroke={l.color}
                          // Slightly wider than the spacing so neighbours
                          // overlap — abutting opaque strokes still leave an
                          // anti-aliased hairline of background between them.
                          strokeWidth={stripe + 0.5}
                        />
                      ))}
                    </G>
                    <Path
                      d={entry.d}
                      fill="none"
                      stroke={selected ? colors.accentTeal : 'rgba(255,255,255,0.85)'}
                      strokeWidth={(selected ? 1 : 0.8) / settledZoom}
                    />
                  </G>
                )
              })}

              {/* Labels render in a second pass so names paint on top of
                  every fill. Sizing/skip logic is shared with web; the halo
                  is a separate stroke-only text underneath because
                  react-native-svg has no paintOrder. */}
              {showAllLabels &&
                (() => {
                  const labeledCodes = new Set<string>()
                  return countryPaths.map(({ code, feature }) => {
                    if (labeledCodes.has(code)) return null

                    const name = LABEL_NAME_OVERRIDES[code] ?? feature.properties.NAME
                    if (!name) return null

                    const centroid = LABEL_CENTROID_OVERRIDES[code] ?? interiorCentroid(feature)
                    if (!centroid || Number.isNaN(centroid[0])) return null
                    const anchor = projection(centroid)
                    if (!anchor) return null

                    const isMarked = groupColors
                      ? (groupColors.get(code)?.length ?? 0) > 0
                      : (visitedCountries.find((c) => c.country_code === code)
                          ?.cities_visited ?? 0) > 0

                    const label = name.toUpperCase()
                    const size = labelFontSize(feature, label, isMarked, settledZoom)
                    if (size === null) return null

                    labeledCodes.add(code)

                    const fillColor = isMarked
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.45)'
                    const haloWidth = Math.max(2, (isMarked ? 0.45 : 0.3) / settledZoom)
                    const textProps = {
                      x: anchor[0],
                      y: anchor[1],
                      fontSize: size,
                      fontFamily: isMarked ? fontFamily.semibold : fontFamily.medium,
                      letterSpacing: size * 0.08,
                      textAnchor: 'middle' as const,
                      alignmentBaseline: 'middle' as const,
                    }
                    return (
                      <React.Fragment key={`label-${code}`}>
                        <SvgText
                          {...textProps}
                          fill="none"
                          stroke="rgba(7,8,13,0.55)"
                          strokeWidth={haloWidth}
                        >
                          {label}
                        </SvgText>
                        <SvgText {...textProps} fill={fillColor}>
                          {label}
                        </SvgText>
                      </React.Fragment>
                    )
                  })
                })()}
            </Svg>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapOcean,
    // The oversampled surface extends past the container's bounds — clip it
    // so the map never bleeds over surrounding UI (the group screen renders
    // the map inside a card).
    overflow: 'hidden',
  },
  surface: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.tealAlpha15,
  },
  retryText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accentTeal,
  },
})
