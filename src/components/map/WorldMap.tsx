/**
 * WorldMap — Core world map component, platform adaptive.
 * Web: react-simple-maps with D3 geo projections (lazy-loaded GeoJSON).
 * Mobile: Simplified SVG placeholder (full implementation requires native map SDK).
 *
 * Performance: 195 countries memoized, GeoJSON lazy-loaded, <500ms target.
 */

import React, { memo, useState, useCallback } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
import type { CountryFillIntensity } from '@typedefs/api'
import type { PlaceCategory } from '@typedefs/database'
import type { GroupMemberPlace } from '@typedefs/api'

export type GroupMapEntry = GroupMemberPlace

interface WorldMapProps {
  visitedCountries: CountryFillIntensity[]
  activeCategory: PlaceCategory
  groupMapData?: GroupMapEntry[]
  onCountryPress: (code: string) => void
  selectedCountry?: string
  testID?: string
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getCountryFill(
  code: string,
  visitedCountries: CountryFillIntensity[],
  activeCategory: PlaceCategory,
  _groupMapData?: GroupMapEntry[],
): string {
  const fillData = visitedCountries.find((c) => c.country_code === code)
  if (!fillData || fillData.cities_visited === 0) {
    return colors.mapLand
  }

  const opacity = 0.2 + fillData.fill_ratio * 0.8

  switch (activeCategory) {
    case 'been':
      return `rgba(0,245,212,${opacity.toFixed(2)})`
    case 'want_to_go':
      return `rgba(167,139,250,0.8)`
    case 'lived':
      return `rgba(245,166,35,0.6)`
    default:
      return `rgba(0,245,212,${opacity.toFixed(2)})`
  }
}

// ---------------------------------------------------------------------------
// Web implementation using react-simple-maps
// ---------------------------------------------------------------------------

let WebMapImpl: React.ComponentType<WorldMapProps> | null = null

if (Platform.OS === 'web') {
  // Dynamic import for tree-shaking on native
  const {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
  } = require('react-simple-maps') // eslint-disable-line @typescript-eslint/no-require-imports

  // Natural Earth 110m GeoJSON — has ISO_A2 property per feature
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
        style={{
          default: {
            fill,
            stroke: 'rgba(255,255,255,0.55)',
            strokeWidth: 0.9,
            outline: 'none',
            cursor: 'pointer',
            transition: 'fill 200ms',
          },
          hover: {
            fill: selected ? fill : `${fill}CC`,
            stroke: colors.accentTeal,
            strokeWidth: 0.8,
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

  WebMapImpl = function WebMap({
    visitedCountries,
    activeCategory,
    groupMapData,
    onCountryPress,
    selectedCountry,
    testID,
  }: WorldMapProps) {
    const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 })

    const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
      setPosition(pos)
    }, [])

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
          >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: { rsmKey: string; properties: { ISO_A2: string; ADM0_A3: string } }[] }) =>
              geographies.map((geo) => {
                let code = geo.properties.ISO_A2
                if (code === '-99') {
                  code = ADM0_ISO2_OVERRIDES[geo.properties.ADM0_A3] ?? '-99'
                }
                if (!code || code === '-99' || code === 'AQ') return null
                const fill = getCountryFill(
                  code,
                  visitedCountries,
                  activeCategory,
                  groupMapData,
                )
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
              })
            }
          </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </View>
    )
  }
}

// ---------------------------------------------------------------------------
// Mobile SVG placeholder
// ---------------------------------------------------------------------------

const MobileMap = memo(function MobileMap({
  testID,
}: WorldMapProps) {
  return (
    <View style={[styles.container, styles.mobileContainer]} data-testid={testID}>
      <Text style={styles.mobileText}>
        Interactive map available on web.{'\n'}
        Tap countries from the list below.
      </Text>
    </View>
  )
})

const COMPOSABLE_MAP_STYLE = {
  width: '100%' as const,
  height: '100%' as const,
  backgroundColor: colors.mapOcean,
  pointerEvents: 'auto' as const,
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

function WorldMapInner(props: WorldMapProps) {
  if (Platform.OS === 'web' && WebMapImpl) {
    return <WebMapImpl {...props} />
  }
  return <MobileMap {...props} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapOcean,
  },
  mobileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})

export const WorldMap = memo(WorldMapInner)
