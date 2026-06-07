/**
 * Map screen — THE HERO SCREEN.
 * Edge-to-edge full viewport map. Floating glass overlays only.
 * Core flow: tap country → drill-down → tap city → rating form.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
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
import { getCitiesByCountry, createPlace, updatePlace, deletePlace, getPlaceByCountryAndCity, getPlaces } from '@services/places'
import { upsertPlaceRatings, getPlaceRatings, computeOverallScore } from '@services/ratings'
import type { City, RatingCategory, PlaceCategory, VisitedPlace } from '@typedefs/database'
import type { PlaceRatingsInput } from '@lib/validation'
import type { CountryFillIntensity } from '@typedefs/api'

// Build fill intensity from local places — no RPC needed, reactive
function buildFillIntensity(places: VisitedPlace[]): CountryFillIntensity[] {
  const grouped = new Map<string, number>()
  for (const p of places) {
    grouped.set(p.country_code, (grouped.get(p.country_code) ?? 0) + 1)
  }
  return Array.from(grouped.entries()).map(([country_code, count]) => ({
    country_code,
    cities_visited: count,
    total_cities: count,
    fill_ratio: Math.min(count / 5, 1),
  }))
}

// Create a local (guest) VisitedPlace without a DB round-trip
function makeLocalPlace(countryCode: string, cityId: string, category: PlaceCategory): VisitedPlace {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: 'guest',
    country_code: countryCode,
    city_id: cityId,
    category,
    overall_score: null,
    review: null,
    visited_date: null,
    planned_date: null,
    planned_budget: null,
    daily_budget: null,
    currency_code: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export default function MapScreen() {
  const {
    activeDrillDownCountry,
    handleCountryPress,
    clearDrillDown,
  } = useMap()

  const { activeCategory, setActiveCategory, activeDrillDownCity, setDrillDown } = useUIStore()
  const { places, addPlace, updatePlace: updatePlaceInStore, removePlace, setPlaces } = usePlacesStore()
  const { user } = useAuthStore()
  const [drillDownCityData, setDrillDownCityData] = useState<City[]>([])
  const [ratingFormError, setRatingFormError] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [mapInitialRatings, setMapInitialRatings] = useState<Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>>({})

  // Load all places from DB when authenticated
  useEffect(() => {
    if (!user) return
    void getPlaces(user.id, undefined, undefined, 500).then(({ data }) => setPlaces(data))
  }, [user, setPlaces])

  // Derive fill intensity from local store — updates immediately after any save
  // Filter by activeCategory so each tab only highlights its own places
  const fillIntensity = useMemo(
    () => buildFillIntensity(places.filter((p) => p.category === activeCategory)),
    [places, activeCategory],
  )

  const statLabel = useMemo(() => {
    const count = new Set(
      places.filter((p) => p.category === activeCategory).map((p) => p.country_code),
    ).size
    const word = count === 1 ? 'country' : 'countries'
    if (activeCategory === 'been') return `${count} ${word} visited`
    if (activeCategory === 'want_to_go') return `${count} ${word} planned`
    return `${count} ${word} lived in`
  }, [places, activeCategory])

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

  // Pre-load existing ratings when the rating form opens for a city
  useEffect(() => {
    if (!activeDrillDownCity || !activeDrillDownCountry) {
      setMapInitialRatings({})
      return
    }
    const existing = places.find(
      (p) => p.country_code === activeDrillDownCountry && p.city_id === activeDrillDownCity && p.category === activeCategory,
    )
    if (!existing) {
      setMapInitialRatings({})
      return
    }
    void getPlaceRatings(existing.id).then((rows) => {
      const map: Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>> = {}
      for (const r of rows) map[r.category] = r.score as unknown as 1 | 2 | 3 | 4 | 5
      setMapInitialRatings(map)
    }).catch(() => { setMapInitialRatings({}) })
  }, [activeDrillDownCity, activeDrillDownCountry, activeCategory, places])

  const handleSearch = useCallback((_query: string) => {}, [])

  const handleRatingSubmit = useCallback(
    async (ratings: Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>, review: string) => {
      setRatingFormError(null)

      if (!activeDrillDownCountry || !activeDrillDownCity) return
      // Guest mode — save locally so the UI responds
      if (!user) {
        const existing = places.find(
          (p) => p.country_code === activeDrillDownCountry && p.city_id === activeDrillDownCity && p.category === activeCategory,
        )
        if (!existing) addPlace(makeLocalPlace(activeDrillDownCountry, activeDrillDownCity, activeCategory))
        clearDrillDown()
        return
      }

      try {
        // Check if a visited_place already exists for this country+city+category
        const existing = await getPlaceByCountryAndCity(user.id, activeDrillDownCountry, activeDrillDownCity)

        let place
        if (existing?.category === activeCategory) {
          place = await updatePlace(existing.id, user.id, {
            category: activeCategory,
            review: review || undefined,
          })
          updatePlaceInStore(place)
        } else {
          place = await createPlace(user.id, {
            country_code: activeDrillDownCountry,
            city_id: activeDrillDownCity,
            category: activeCategory,
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
          const overall = computeOverallScore(ratingPayload)
          if (overall !== null) {
            const updatedPlace = await updatePlace(place.id, user.id, { overall_score: overall })
            updatePlaceInStore(updatedPlace)
          }
        }

        clearDrillDown()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setRatingFormError(msg)
      }
    },
    [user, places, activeCategory, activeDrillDownCountry, activeDrillDownCity, addPlace, updatePlaceInStore, clearDrillDown],
  )

  const handleRatingDismiss = useCallback(() => {
    setRatingFormError(null)
    if (activeDrillDownCountry) setDrillDown(activeDrillDownCountry, undefined)
  }, [activeDrillDownCountry, setDrillDown])

  // Quick-mark a city without opening the full rating form
  // Second tap on the same category deselects (removes) the mark
  const handleDotPress = useCallback(
    (cityId: string) => {
      if (!activeDrillDownCountry) return
      const existing = places.find(
        (p) => p.country_code === activeDrillDownCountry && p.city_id === cityId && p.category === activeCategory,
      )
      if (!user) {
        if (existing) {
          removePlace(existing.id)
        } else {
          addPlace(makeLocalPlace(activeDrillDownCountry, cityId, activeCategory))
        }
        return
      }
      void (async () => {
        try {
          if (existing) {
            await deletePlace(existing.id, user.id)
            removePlace(existing.id)
          } else {
            const place = await createPlace(user.id, {
              country_code: activeDrillDownCountry,
              city_id: cityId,
              category: activeCategory,
            })
            addPlace(place)
          }
        } catch {
          // silently ignore quick-mark errors
        }
      })()
    },
    [activeDrillDownCountry, activeCategory, user, places, addPlace, removePlace],
  )

  const drillDownCities = useMemo(() => {
    if (!activeDrillDownCountry) return []
    const countryPlaces = places.filter((p) => p.country_code === activeDrillDownCountry)
    return drillDownCityData.map((city) => {
      const place = countryPlaces.find((p) => p.city_id === city.id && p.category === activeCategory)
      return {
        city,
        isVisited: !!place,
        category: place?.category,
        overallScore: place?.overall_score ?? undefined,
      }
    })
  }, [activeDrillDownCountry, activeCategory, drillDownCityData, places])

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      {!activeDrillDownCountry && (
        <WorldMap
          visitedCountries={fillIntensity}
          activeCategory={activeCategory}
          onCountryPress={handleCountryPress}
          selectedCountry={activeDrillDownCountry ?? undefined}
          showAllLabels={showLabels}
          testID="world-map"
        />
      )}

      {/* Country drill-down */}
      {activeDrillDownCountry && (
        <CountryDrillDown
          countryCode={activeDrillDownCountry}
          cities={drillDownCities}
          onCityPress={handleCityPress}
          onDotPress={handleDotPress}
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
          <SearchBar onSearch={handleSearch} onCountrySelect={handleCountryPress} />
        </View>
      )}

      {/* Stats chip — bottom left */}
      {!activeDrillDownCountry && (
        <View style={styles.bottomLeft} pointerEvents="box-none">
          <View style={styles.statChip}>
            <Text style={styles.statText}>{statLabel}</Text>
          </View>
        </View>
      )}

      {/* Labels toggle — bottom right. Same glass style as the stat chip so
          they read as a matched pair of map controls. */}
      {!activeDrillDownCountry && (
        <View style={styles.bottomRight} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync()
              setShowLabels((v) => !v)
            }}
            style={[styles.labelsChip, showLabels && styles.labelsChipActive]}
            accessibilityRole="switch"
            accessibilityState={{ checked: showLabels }}
            accessibilityLabel="Toggle country name labels"
          >
            <View
              style={[styles.toggleDot, showLabels && styles.toggleDotActive]}
            />
            <Text
              style={[styles.labelsChipText, showLabels && styles.labelsChipTextActive]}
            >
              {showLabels ? 'Labels on' : 'Labels off'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Rating form — slides up over drill-down */}
      {activeDrillDownCity && activeDrillDownCountry && (
        <RatingForm
          cityName={drillDownCityData.find((c) => c.id === activeDrillDownCity)?.name ?? '...'}
          countryCode={activeDrillDownCountry}
          category={activeCategory}
          initialRatings={mapInitialRatings}
          error={ratingFormError}
          onSubmit={(r, rv) => { void handleRatingSubmit(r, rv) }}
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
    bottom: spacing.md,
    left: spacing.md,
    zIndex: 10,
  },
  bottomRight: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  statChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkOverlay90,
    borderWidth: 1,
    borderColor: colors.whiteAlpha22,
  },
  statText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  labelsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkOverlay90,
    borderWidth: 1,
    borderColor: colors.whiteAlpha22,
    minHeight: 36,
  },
  labelsChipActive: {
    borderColor: colors.accentTeal,
    backgroundColor: colors.tealAlpha15,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  toggleDotActive: {
    backgroundColor: colors.accentTeal,
  },
  labelsChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  labelsChipTextActive: {
    color: colors.accentTeal,
  },
})
