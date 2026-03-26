/**
 * useMap — Map state and country drill-down interaction.
 */

import { useCallback } from 'react'
import { useUIStore } from '@stores/uiStore'
import { usePlacesStore } from '@stores/placesStore'

export function useMap() {
  const { activeDrillDownCountry, setDrillDown, clearDrillDown } = useUIStore()
  const { fillIntensity } = usePlacesStore()

  const handleCountryPress = useCallback(
    (countryCode: string) => {
      if (activeDrillDownCountry === countryCode) {
        clearDrillDown()
      } else {
        setDrillDown(countryCode, undefined)
      }
    },
    [activeDrillDownCountry, setDrillDown, clearDrillDown],
  )

  return {
    activeDrillDownCountry,
    handleCountryPress,
    fillIntensity,
    clearDrillDown,
  }
}
