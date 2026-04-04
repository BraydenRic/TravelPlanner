/**
 * Rate screen — renders RatingForm for a specific city and saves to DB.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { RatingForm } from '@components/ratings/RatingForm'
import { getCityById, updatePlace } from '@services/places'
import { upsertPlaceRatings } from '@services/ratings'
import { usePlacesStore } from '@stores/placesStore'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'
import type { City, PlaceCategory } from '@typedefs/database'
import type { PlaceRatingsInput } from '@lib/validation'

export default function RateScreen() {
  const { code, cityId, category, placeId } = useLocalSearchParams<{
    code: string
    cityId: string
    category?: string
    placeId?: string
  }>()
  const [city, setCity] = useState<City | null>(null)
  const { user } = useAuthStore()
  const { places, updatePlace: updatePlaceInStore } = usePlacesStore()

  useEffect(() => {
    if (cityId) void getCityById(cityId).then(setCity)
  }, [cityId])

  // Resolve the visited_place — prefer the passed placeId, fall back to
  // searching by country + city in case placeId wasn't propagated
  const place = useMemo(
    () =>
      places.find((p) => (placeId ? p.id === placeId : p.country_code === code && p.city_id === cityId)),
    [places, placeId, code, cityId],
  )

  const handleSubmit = useCallback(
    async (ratings: Partial<PlaceRatingsInput>, review: string) => {
      if (!user || !place) {
        Alert.alert('Not ready', 'Place not found. Please go back and try again.')
        return
      }

      try {
        // 1. Save individual category ratings (skip zeroes)
        const ratingPayload = Object.fromEntries(
          Object.entries(ratings).filter(([, v]) => (v as number) > 0),
        ) as Partial<PlaceRatingsInput>

        if (Object.keys(ratingPayload).length > 0) {
          await upsertPlaceRatings(place.id, user.id, ratingPayload)
        }

        // 2. Save review text only if provided (overall_score is not in the
        //    updatePlace schema — the DB computes it via the ratings table)
        if (review.trim()) {
          const updated = await updatePlace(place.id, user.id, { review })
          updatePlaceInStore(updated)
        }

        router.back()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        Alert.alert('Error saving rating', msg)
      }
    },
    [user, place, updatePlaceInStore],
  )

  const handleDismiss = useCallback(() => {
    router.back()
  }, [])

  return (
    <View style={styles.container}>
      <RatingForm
        cityName={city?.name ?? '...'}
        countryCode={code}
        category={(category as PlaceCategory) ?? place?.category ?? 'been'}
        onSubmit={(ratings, review) => { void handleSubmit(ratings, review) }}
        onDismiss={handleDismiss}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
})
