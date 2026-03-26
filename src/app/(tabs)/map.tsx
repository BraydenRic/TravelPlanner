/**
 * Map screen — THE HERO SCREEN.
 * Edge-to-edge full viewport map. Floating glass overlays only.
 * Core flow: tap country → drill-down → tap city → rating form.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useUIStore } from '@stores/uiStore'
import { usePlacesStore } from '@stores/placesStore'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { WorldMap } from '@components/map/WorldMap'
import { CountryDrillDown } from '@components/map/CountryDrillDown'
import { CategoryTabs } from '@components/layout/CategoryTabs'
import { SearchBar } from '@components/layout/SearchBar'
import { RatingForm } from '@components/ratings/RatingForm'
import { useMap } from '@hooks/useMap'
import { getCitiesByCountry, createPlace, updatePlace, getPlaceByCountryAndCity } from '@services/places'
import { upsertPlaceRatings } from '@services/ratings'
import type { City, RatingCategory, PlaceCategory } from '@typedefs/database'
import type { PlaceRatingsInput } from '@lib/validation'

export default function MapScreen() {
  const {
    activeDrillDownCountry,
    handleCountryPress,
    fillIntensity,
    clearDrillDown,
  } = useMap()

  const { activeCategory, setActiveCategory, activeDrillDownCity, setDrillDown } = useUIStore()
  const { places, getPlacesByCountry, addPlace, updatePlace: updatePlaceInStore } = usePlacesStore()
  const { user } = useAuthStore()
  const [drillDownCityData, setDrillDownCityData] = useState<City[]>([])

  const totalVisited = useMemo(
    () => new Set(places.filter((p) => p.category === 'been').map((p) => p.country_code)).size,
    [places],
  )

  const handleCityPress = useCallback(
    (cityId: string) => {
      if (activeDrillDownCountry) {
        setDrillDown(activeDrillDownCountry, cityId)
      }
    },
    [activeDrillDownCountry, setDrillDown],
  )

  // Load cities from DB when a country is drilled into
  useEffect(() => {
    if (!activeDrillDownCountry) {
      setDrillDownCityData([])
      return
    }
    getCitiesByCountry(activeDrillDownCountry)
      .then(setDrillDownCityData)
      .catch(() => setDrillDownCityData([]))
  }, [activeDrillDownCountry])

  const handleSearch = useCallback((_query: string) => {
    // Search handled by SearchBar component
  }, [])

  const handleRatingSubmit = useCallback(
    async (ratings: Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>, review: string, category: PlaceCategory) => {
      if (!activeDrillDownCountry || !activeDrillDownCity) return
      // Not signed in — close the form silently (no persistence)
      if (!user) {
        clearDrillDown()
        return
      }

      try {
        // Check if a visited_place already exists for this country+city
        const existing = await getPlaceByCountryAndCity(user.id, activeDrillDownCountry, activeDrillDownCity)

        let place
        if (existing) {
          place = await updatePlace(existing.id, user.id, {
            category,
            review: review || undefined,
          })
          updatePlaceInStore(place)
        } else {
          place = await createPlace(user.id, {
            country_code: activeDrillDownCountry,
            city_id: activeDrillDownCity,
            category,
            review: review || undefined,
          })
          addPlace(place)
        }

        // Save the individual category ratings (skip zeroes)
        const ratingPayload = Object.fromEntries(
          Object.entries(ratings).filter(([, v]) => v && v > 0),
        ) as Partial<PlaceRatingsInput>
        if (Object.keys(ratingPayload).length > 0) {
          await upsertPlaceRatings(place.id, user.id, ratingPayload)
        }

        clearDrillDown()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        Alert.alert('Error saving rating', msg)
      }
    },
    [user, activeDrillDownCountry, activeDrillDownCity, addPlace, updatePlaceInStore, clearDrillDown],
  )

  const handleRatingDismiss = useCallback(() => {
    if (activeDrillDownCountry) {
      setDrillDown(activeDrillDownCountry, undefined)
    }
  }, [activeDrillDownCountry, setDrillDown])

  const drillDownCities = useMemo(() => {
    if (!activeDrillDownCountry) return []
    const countryPlaces = getPlacesByCountry(activeDrillDownCountry)
    return drillDownCityData.map((city) => {
      const place = countryPlaces.find((p) => p.city_id === city.id)
      return {
        city,
        isVisited: !!place,
        category: place?.category,
        overallScore: place?.overall_score ?? undefined,
      }
    })
  }, [activeDrillDownCountry, drillDownCityData, getPlacesByCountry])

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      {!activeDrillDownCountry && (
        <WorldMap
          visitedCountries={fillIntensity}
          activeCategory={activeCategory}
          onCountryPress={handleCountryPress}
          selectedCountry={activeDrillDownCountry ?? undefined}
          testID="world-map"
        />
      )}

      {/* Country drill-down */}
      {activeDrillDownCountry && (
        <CountryDrillDown
          countryCode={activeDrillDownCountry}
          cities={drillDownCities}
          onCityPress={handleCityPress}
          onBackPress={clearDrillDown}
        />
      )}

      {/* Floating overlays */}

      {/* Category tabs — top center */}
      {!activeDrillDownCountry && (
        <View style={styles.topCenter} pointerEvents="box-none">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </View>
      )}

      {/* Search icon — top right */}
      {!activeDrillDownCountry && (
        <View style={styles.topRight} pointerEvents="box-none">
          <SearchBar onSearch={handleSearch} />
        </View>
      )}

      {/* Stats chip — bottom left */}
      {!activeDrillDownCountry && (
        <View style={styles.bottomLeft} pointerEvents="box-none">
          <View style={styles.statChip}>
            <Text style={styles.statText}>
              {totalVisited} countries visited
            </Text>
          </View>
        </View>
      )}

      {/* Rating form — slides up over drill-down */}
      {activeDrillDownCity && activeDrillDownCountry && (
        <RatingForm
          cityName={drillDownCityData.find((c) => c.id === activeDrillDownCity)?.name ?? '...'}
          countryCode={activeDrillDownCountry}
          onSubmit={(r, rv, cat) => { void handleRatingSubmit(r, rv, cat) }}
          onDismiss={handleRatingDismiss}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapOcean,
  },
  topCenter: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  topRight: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.xxxl,
    left: spacing.md,
    zIndex: 10,
  },
  statChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(10,12,18,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  statText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
})
