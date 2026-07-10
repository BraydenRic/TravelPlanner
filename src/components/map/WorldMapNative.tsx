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
 *   - Pinch/pan run on the UI thread as a plain view transform while the
 *     gesture is live (60fps, no JS-thread involvement), then get committed
 *     into the SVG's own <G> transform when the fingers lift. At rest the
 *     map is therefore always vector-rendered — crisp at any zoom — instead
 *     of a scaled-up raster.
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
import Svg, { Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg'
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
  groupPatternId,
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

function clampNumber(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Clamp a live view-space translation so the map always covers the viewport
 * (no dragging the world off-screen). Derived from the commit math below:
 * the committed translation t1 = s·t0 + (1−s)·center + tv/m must stay within
 * [dim·(1 − s·z0), 0], where dim/center are the canvas extent along the axis.
 */
function clampPanAxis(
  tv: number,
  s: number,
  z0: number,
  t0: number,
  dim: number,
  m: number,
): number {
  'worklet'
  const center = dim / 2
  const lo = m * (dim * (1 - s * z0) - s * t0 - (1 - s) * center)
  const hi = m * (-s * t0 - (1 - s) * center)
  return Math.min(hi, Math.max(lo, tv))
}

// ---------------------------------------------------------------------------
// Country path (memoized — only re-renders when its own fill changes)
// ---------------------------------------------------------------------------

const CountryPath = memo(function CountryPath({
  d,
  fill,
  selected,
}: {
  d: string
  fill: string
  selected: boolean
}) {
  return (
    <Path
      d={d}
      fill={fill}
      // Brighter than the fills' effective luminance so shared borders stay
      // visible between adjacent highlighted countries (fills are capped
      // below full opacity for the same reason — see getCountryFill).
      stroke={selected ? colors.accentTeal : 'rgba(255,255,255,0.85)'}
      strokeWidth={selected ? 1 : 0.8}
      // Keeps borders a constant on-screen thickness at any committed zoom,
      // mirroring the web map.
      vectorEffect="non-scaling-stroke"
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
  // Committed map transform in SVG user units: translate(tx, ty) scale(zoom).
  // Rendered statically into the <G>, so the resting map is pure vector.
  // `gen` counts gesture commits: the canvas layer is keyed on it so each
  // commit remounts the layer with the live transform already at identity —
  // one atomic React transaction instead of a cross-thread reset race.
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0, gen: 0 })
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

  const countryPaths = useMemo(() => {
    if (!countries) return null
    const pathGen = geoPath(projection)
    return countries
      .map(({ code, feature }) => ({ code, feature, d: pathGen(feature as never) ?? '' }))
      .filter((entry) => entry.d !== '')
  }, [countries, projection])

  // viewBox letterboxing: the 800×600 canvas is scaled by m and centered in
  // the layout (preserveAspectRatio "meet" behaviour), so view-space points
  // convert to canvas units via (p − offset) / m.
  const m = layout.w > 0 ? Math.min(layout.w / MAP_W, layout.h / MAP_H) : 0
  const offsetX = (layout.w - MAP_W * m) / 2
  const offsetY = (layout.h - MAP_H * m) / 2

  // --- Live gesture state (UI thread) --------------------------------------
  const scale = useSharedValue(1)
  const tvx = useSharedValue(0)
  const tvy = useSharedValue(0)
  const panBaseX = useSharedValue(0)
  const panBaseY = useSharedValue(0)
  const pinchBaseScale = useSharedValue(1)
  const pinchBaseX = useSharedValue(0)
  const pinchBaseY = useSharedValue(0)
  const pinchFocalX = useSharedValue(0)
  const pinchFocalY = useSharedValue(0)
  const panActive = useSharedValue(false)
  const pinchActive = useSharedValue(false)

  /**
   * Fold the finished gesture's view transform into the committed SVG
   * transform, then reset the live transform to identity. Composition:
   * committed <G> maps canvas→canvas (zoom, t), the viewBox maps canvas→view
   * (m, offset), and the live transform scales about the view center — so
   * z1 = s·z0 and t1 = s·t0 + (1−s)·canvasCenter + tv/m.
   * At rest the transforms are equivalent by construction.
   *
   * Atomicity: the live-transform reset and the re-render MUST paint on the
   * same frame — resetting early flashes the old map un-transformed, and
   * resetting late double-applies the gesture for a frame (both were
   * observed on device; the two updates travel on different threads, so no
   * ordering of separate updates is reliable). Instead each commit bumps
   * `gen`, the canvas layer below is keyed on it, and the shared values are
   * zeroed during render before the new layer mounts — the remounted layer
   * is born with identity transform in the same React transaction that
   * carries the new <G>.
   */
  const commitGesture = useCallback(
    (s: number, vx: number, vy: number) => {
      setView((prev) => {
        const zoom = clampNumber(prev.zoom * s, MIN_ZOOM, MAX_ZOOM)
        const sEff = zoom / prev.zoom
        const tx = clampNumber(
          sEff * prev.tx + (1 - sEff) * (MAP_W / 2) + vx / m,
          MAP_W * (1 - zoom),
          0,
        )
        const ty = clampNumber(
          sEff * prev.ty + (1 - sEff) * (MAP_H / 2) + vy / m,
          MAP_H * (1 - zoom),
          0,
        )
        return { zoom, tx, ty, gen: prev.gen + 1 }
      })
    },
    [m],
  )

  // Zero the live transform during render for a new commit generation, so
  // the keyed canvas layer mounts with identity already applied.
  const renderedGen = React.useRef(0)
  if (renderedGen.current !== view.gen) {
    renderedGen.current = view.gen
    scale.value = 1
    tvx.value = 0
    tvy.value = 0
  }

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!countries || m === 0) return
      // View point → canvas units → geographic coordinates. Taps only land
      // while the map is at rest, when the live transform is identity, so
      // only the committed transform needs inverting.
      const px = ((x - offsetX) / m - view.tx) / view.zoom
      const py = ((y - offsetY) / m - view.ty) / view.zoom
      const lonLat = projection.invert?.([px, py])
      if (!lonLat) return
      const code = countryAtPoint(countries, lonLat)
      if (code) onCountryPress(code)
    },
    [countries, m, offsetX, offsetY, view, projection, onCountryPress],
  )

  // Gestures capture the committed view + layout by value, so they're
  // rebuilt each render — GestureDetector diffs and updates in place.
  const zoom0 = view.zoom
  const tx0 = view.tx
  const ty0 = view.ty
  const viewCX = layout.w / 2
  const viewCY = layout.h / 2

  const finishGesture = useCallback(() => {
    'worklet'
    if (panActive.value || pinchActive.value) return
    if (scale.value === 1 && tvx.value === 0 && tvy.value === 0) return
    runOnJS(commitGesture)(scale.value, tvx.value, tvy.value)
  }, [panActive, pinchActive, scale, tvx, tvy, commitGesture])

  const pan = Gesture.Pan()
    .averageTouches(true)
    .maxPointers(2)
    .onStart(() => {
      panBaseX.value = tvx.value
      panBaseY.value = tvy.value
      panActive.value = true
    })
    .onUpdate((e) => {
      tvx.value = clampPanAxis(panBaseX.value + e.translationX, scale.value, zoom0, tx0, MAP_W, m)
      tvy.value = clampPanAxis(panBaseY.value + e.translationY, scale.value, zoom0, ty0, MAP_H, m)
    })
    .onFinalize(() => {
      panActive.value = false
      finishGesture()
    })

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      pinchBaseScale.value = scale.value
      pinchBaseX.value = tvx.value
      pinchBaseY.value = tvy.value
      pinchFocalX.value = e.focalX
      pinchFocalY.value = e.focalY
      pinchActive.value = true
    })
    .onUpdate((e) => {
      // Total zoom (committed × live) stays within [MIN_ZOOM, MAX_ZOOM].
      const next = Math.min(
        MAX_ZOOM / zoom0,
        Math.max(MIN_ZOOM / zoom0, pinchBaseScale.value * e.scale),
      )
      // Keep the pinch focal point stationary: scale about the focal point
      // captured at gesture start, expressed relative to the view center
      // (the transform origin).
      const k = next / pinchBaseScale.value
      scale.value = next
      tvx.value = clampPanAxis(
        pinchFocalX.value - viewCX - k * (pinchFocalX.value - viewCX - pinchBaseX.value),
        next,
        zoom0,
        tx0,
        MAP_W,
        m,
      )
      tvy.value = clampPanAxis(
        pinchFocalY.value - viewCY - k * (pinchFocalY.value - viewCY - pinchBaseY.value),
        next,
        zoom0,
        ty0,
        MAP_H,
        m,
      )
    })
    .onFinalize(() => {
      pinchActive.value = false
      finishGesture()
    })

  const tap = Gesture.Tap()
    .withTestId('world-map-tap')
    .onEnd((e, success) => {
      if (success) runOnJS(handleTap)(e.x, e.y)
    })

  // Race: a quick touch fires the tap; any movement activates pan/pinch,
  // which cancels the tap — so marking countries never fights with panning.
  const composed = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch))

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tvx.value },
      { translateY: tvy.value },
      { scale: scale.value },
    ],
  }))

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setLayout({ w: width, h: height })
    // First layout: start "cover"-fitted. The 4:3 world canvas letterboxes
    // badly on portrait phones (a short strip with ocean bands above and
    // below), so begin zoomed just enough to fill the viewport, centered.
    // The centered translate sits inside the pan clamps, users can still
    // pinch out to the full-world view, and on 4:3 layouts (desktop, tests)
    // the cover zoom is exactly 1 so nothing changes.
    setView((prev) => {
      if (viewInitialized.current || width <= 0 || height <= 0) return prev
      viewInitialized.current = true
      const fit = Math.min(width / MAP_W, height / MAP_H)
      const coverZoom = clampNumber(
        Math.max(width / MAP_W, height / MAP_H) / fit,
        MIN_ZOOM,
        MAX_ZOOM,
      )
      if (coverZoom <= 1) return prev
      // Keep `gen` unchanged: the live transform is already at identity on
      // first layout, so no keyed remount is needed for the initial fit.
      return {
        zoom: coverZoom,
        tx: (MAP_W * (1 - coverZoom)) / 2,
        ty: (MAP_H * (1 - coverZoom)) / 2,
        gen: prev.gen,
      }
    })
  }, [])

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
          <Animated.View key={view.gen} style={[styles.canvas, animatedStyle]}>
            {/* The SVG bleeds one full viewport past every edge so live
                drags/pinches reveal real map instead of blank space (the
                gesture moves this layer; only on release does the transform
                commit and re-render). The viewBox spans the same bleed in
                canvas units, so the view→canvas mapping — and therefore all
                tap/clamp math — is unchanged: (p − offset) / m. */}
            <Svg
              width={layout.w * 3}
              height={layout.h * 3}
              viewBox={`${-(offsetX + layout.w) / m} ${-(offsetY + layout.h) / m} ${(layout.w * 3) / m} ${(layout.h * 3) / m}`}
              style={{ position: 'absolute', left: -layout.w, top: -layout.h }}
            >
              <G transform={`translate(${view.tx}, ${view.ty}) scale(${view.zoom})`}>
                {multiMemberEntries.length > 0 && (
                  <Defs>
                    {multiMemberEntries.map(([code, memberColors]) => {
                      const feature = countryPaths.find((c) => c.code === code)?.feature
                      const stripe = groupStripeWidth(feature)
                      const width = stripe * memberColors.length
                      return (
                        <Pattern
                          key={code}
                          id={groupPatternId(code)}
                          patternUnits="userSpaceOnUse"
                          width={width}
                          height={stripe}
                          patternTransform="rotate(45)"
                        >
                          {memberColors.map((c, i) => (
                            <Rect
                              key={c}
                              x={i * stripe}
                              y={0}
                              width={stripe}
                              height={stripe}
                              fill={c}
                              opacity={0.8}
                            />
                          ))}
                        </Pattern>
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
                      fill = `url(#${groupPatternId(code)})`
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
                    />
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
                      const size = labelFontSize(feature, label, isMarked, view.zoom)
                      if (size === null) return null

                      labeledCodes.add(code)

                      const fillColor = isMarked
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(255,255,255,0.45)'
                      const haloWidth = Math.max(2, (isMarked ? 0.45 : 0.3) / view.zoom)
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
              </G>
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
    // The live gesture transform scales the canvas past the container's
    // bounds — clip it so the map never bleeds over surrounding UI (the
    // group screen renders the map inside a card).
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
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
