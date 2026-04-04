/**
 * Rate screen — renders RatingForm for a specific city and saves to DB.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { RatingForm } from '@components/ratings/RatingForm'
import { getCityById, updatePlace } from '@services/places'
import { upsertPlaceRatings, computeOverallScore } from '@services/ratings'
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

  // Build initial ratings from existing place ratings in store if available
  const place = places.find((p) => p.id === placeId)

  const handleSubmit = useCallback(
    async (ratings: Partial<PlaceRatingsInput>, review: string) => {
      const targetPlaceId = placeId ?? place?.id
      if (!user || !targetPlaceId) {
        router.back()
        return
      }

      try {
        // Save category ratings
        const ratingPayload = Object.fromEntries(
          Object.entries(ratings).filter(([, v]) => v && (v as number) > 0),
        ) as Partial<PlaceRatingsInput>

        if (Object.keys(ratingPayload).length > 0) {
          await upsertPlaceRatings(targetPlaceId, user.id, ratingPayload)
        }

        // Update review + overall_score on the place
        const overall = computeOverallScore(ratingPayload)
        const updated = await updatePlace(targetPlaceId, user.id, {
          review: review || undefined,
          ...(overall !== null ? { overall_score: overall } : {}),
        })
        updatePlaceInStore(updated)

        router.back()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        Alert.alert('Error saving rating', msg)
      }
    },
    [user, placeId, place, updatePlaceInStore],
  )

  const handleDismiss = useCallback(() => {
    router.back()
  }, [])

  return (
    <View style={styles.container}>
      <RatingForm
        cityName={city?.name ?? '...'}
        countryCode={code}
        category={(category as PlaceCategory) ?? 'been'}
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
