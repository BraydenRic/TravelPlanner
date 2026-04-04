/**
 * Rate screen — renders RatingForm for a specific city and saves to DB.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { RatingForm } from '@components/ratings/RatingForm'
import { getCityById, updatePlace } from '@services/places'
import { upsertPlaceRatings, getPlaceRatings, computeOverallScore } from '@services/ratings'
import { usePlacesStore } from '@stores/placesStore'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'
import type { City, PlaceCategory, RatingCategory } from '@typedefs/database'
import type { PlaceRatingsInput } from '@lib/validation'

export default function RateScreen() {
  const { code, cityId, category, placeId } = useLocalSearchParams<{
    code: string
    cityId: string
    category?: string
    placeId?: string
  }>()
  const [city, setCity] = useState<City | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialRatings, setInitialRatings] = useState<Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>>({})
  const { user } = useAuthStore()
  const { places, updatePlace: updatePlaceInStore } = usePlacesStore()

  useEffect(() => {
    if (cityId) void getCityById(cityId).then(setCity)
  }, [cityId])

  const place = useMemo(
    () =>
      places.find((p) => (placeId ? p.id === placeId : p.country_code === code && p.city_id === cityId)),
    [places, placeId, code, cityId],
  )

  // Pre-load existing ratings so the form shows current values
  useEffect(() => {
    if (!place) return
    void getPlaceRatings(place.id).then((rows) => {
      const map: Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>> = {}
      for (const r of rows) {
        map[r.category] = r.score as unknown as 1 | 2 | 3 | 4 | 5
      }
      setInitialRatings(map)
    }).catch(() => {})
  }, [place])

  const handleSubmit = useCallback(
    async (ratings: Partial<PlaceRatingsInput>, review: string) => {
      setError(null)

      if (!user || !place) {
        setError('Place not found. Please go back and try again.')
        return
      }

      try {
        const ratingPayload = Object.fromEntries(
          Object.entries(ratings).filter(([, v]) => (v as number) > 0),
        ) as Partial<PlaceRatingsInput>

        if (Object.keys(ratingPayload).length > 0) {
          await upsertPlaceRatings(place.id, user.id, ratingPayload)
          const overall = computeOverallScore(ratingPayload)
          if (overall !== null) {
            const updatedPlace = await updatePlace(place.id, user.id, { overall_score: overall })
            updatePlaceInStore(updatedPlace)
          }
        }

        if (review.trim()) {
          const updated = await updatePlace(place.id, user.id, { review })
          updatePlaceInStore(updated)
        }

        router.back()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setError(msg)
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
        initialRatings={initialRatings}
        error={error}
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
