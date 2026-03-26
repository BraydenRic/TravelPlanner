/**
 * Rate screen — renders RatingForm for a specific city.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { RatingForm } from '@components/ratings/RatingForm'
import { getCityById } from '@services/places'
import { colors } from '@theme/colors'
import type { City } from '@typedefs/database'

export default function RateScreen() {
  const { code, cityId } = useLocalSearchParams<{ code: string; cityId: string }>()
  const [city, setCity] = useState<City | null>(null)

  useEffect(() => {
    if (cityId) void getCityById(cityId).then(setCity)
  }, [cityId])

  const handleSubmit = useCallback(
    (_ratings: Record<string, number>, _review: string, _category: string) => {
      router.back()
    },
    [],
  )

  const handleDismiss = useCallback(() => {
    router.back()
  }, [])

  return (
    <View style={styles.container}>
      <RatingForm
        cityName={city?.name ?? '...'}
        countryCode={code}
        onSubmit={handleSubmit}
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
