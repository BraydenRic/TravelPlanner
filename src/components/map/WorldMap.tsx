/**
 * WorldMap — Core world map component, platform adaptive.
 * Web: react-simple-maps with D3 geo projections, code-split into its own
 *   async chunk (see WorldMapWeb.tsx) so the d3 dependency chain stays out
 *   of the entry bundle.
 * Mobile: Simplified SVG placeholder (full implementation requires native map SDK).
 */

import React, { memo, Suspense } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
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

// Lazy so react-simple-maps + d3 land in an async chunk. Guarded by platform:
// native never evaluates the import, it renders the placeholder below.
const WebMapLazy =
  Platform.OS === 'web' ? React.lazy(() => import('./WorldMapWeb')) : null

// ---------------------------------------------------------------------------
// Mobile SVG placeholder
// ---------------------------------------------------------------------------

const MobileMap = memo(function MobileMap({ testID }: WorldMapProps) {
  return (
    <View style={[styles.container, styles.mobileContainer]} data-testid={testID}>
      <Text style={styles.mobileText}>
        Interactive map available on web.{'\n'}
        Tap countries from the list below.
      </Text>
    </View>
  )
})

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

function WorldMapInner(props: WorldMapProps) {
  if (Platform.OS === 'web' && WebMapLazy) {
    return (
      <Suspense
        fallback={
          <View style={[styles.container, styles.mobileContainer]}>
            <ActivityIndicator color={colors.accentTeal} size="large" />
          </View>
        }
      >
        <WebMapLazy {...props} />
      </Suspense>
    )
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
