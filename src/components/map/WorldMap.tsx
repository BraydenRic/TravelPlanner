/**
 * WorldMap — Core world map component, platform adaptive.
 * Web: react-simple-maps with D3 geo projections, code-split into its own
 *   async chunk (see WorldMapWeb.tsx) so the d3 dependency chain stays out
 *   of the entry bundle.
 * Mobile: react-native-svg + d3-geo with pinch/pan gestures (WorldMapNative)
 *   — same GeoJSON, projection, and visual treatment as the web map.
 */

import React, { memo, Suspense } from 'react'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import { colors } from '@theme/colors'
import type { CountryFillIntensity } from '@typedefs/api'
import type { PlaceCategory } from '@typedefs/database'
import type { GroupMemberPlace } from '@typedefs/api'

export type GroupMapEntry = GroupMemberPlace

export interface WorldMapProps {
  visitedCountries: CountryFillIntensity[]
  activeCategory: PlaceCategory
  groupMapData?: GroupMapEntry[]
  onCountryPress: (code: string) => void
  selectedCountry?: string
  testID?: string
  /**
   * When true, every country renders a name label. When false (default), only
   * countries that are filled (marked) carry a label so the map stays calm.
   */
  showAllLabels?: boolean
}

// Lazy per platform. On web this splits react-simple-maps + d3 into an async
// chunk so they stay out of the entry bundle; native has no chunks (metro
// inlines the import) but the same shape keeps one code path. Only the
// current platform's factory is ever evaluated.
const MapLazy =
  Platform.OS === 'web'
    ? React.lazy(() => import('./WorldMapWeb'))
    : React.lazy(() => import('./WorldMapNative'))

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

function WorldMapInner(props: WorldMapProps) {
  return (
    <Suspense
      fallback={
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator color={colors.accentTeal} size="large" />
        </View>
      }
    >
      <MapLazy {...props} />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapOcean,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export const WorldMap = memo(WorldMapInner)
