/**
 * useMap — Map state and country drill-down interaction.
 */

import { useCallback } from 'react'
import { useUIStore } from '@stores/uiStore'

export function useMap() {
  const { activeDrillDownCountry, setDrillDown, clearDrillDown } = useUIStore()

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
    clearDrillDown,
  }
}
