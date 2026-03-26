/**
 * CityPin tests — render visited/unvisited, onPress, group indicators.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { CityPin } from '@components/map/CityPin'
import * as Haptics from 'expo-haptics'
import type { City } from '@typedefs/database'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View>{children}</RN.View>,
    Circle: () => null,
    Path: () => null,
  }
})

const mockCity: City = {
  id: 'city-1',
  name: 'Tokyo',
  country_code: 'JP',
  latitude: 35.6895,
  longitude: 139.6917,
  population_rank: 1,
  is_capital: true,
}

describe('CityPin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders visited state', () => {
      const { toJSON } = render(
        <CityPin city={mockCity} isVisited onPress={() => {}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders unvisited state', () => {
      const { toJSON } = render(
        <CityPin city={mockCity} isVisited={false} onPress={() => {}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('shows city name label', () => {
      const { getByText } = render(
        <CityPin city={mockCity} isVisited onPress={() => {}} />,
      )
      expect(getByText('Tokyo')).toBeTruthy()
    })

    it('renders with overallScore', () => {
      const { toJSON } = render(
        <CityPin
          city={mockCity}
          isVisited
          overallScore={4}
          onPress={() => {}}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onPress when tapped', () => {
      const onPress = jest.fn()
      const { getByRole } = render(
        <CityPin city={mockCity} isVisited onPress={onPress} />,
      )
      fireEvent.press(getByRole('button'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('fires haptic on press', () => {
      const { getByRole } = render(
        <CityPin city={mockCity} isVisited onPress={() => {}} />,
      )
      fireEvent.press(getByRole('button'))
      expect(Haptics.impactAsync).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('renders group indicators', () => {
      const { toJSON } = render(
        <CityPin
          city={mockCity}
          isVisited
          groupIndicators={['#00F5D4', '#F5A623']}
          onPress={() => {}}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders different categories', () => {
      for (const cat of ['been', 'want_to_go', 'lived'] as const) {
        const { toJSON } = render(
          <CityPin
            city={mockCity}
            isVisited
            category={cat}
            onPress={() => {}}
          />,
        )
        expect(toJSON()).toBeTruthy()
      }
    })

    it('renders with isAnimated=false', () => {
      const { toJSON } = render(
        <CityPin
          city={mockCity}
          isVisited
          isAnimated={false}
          onPress={() => {}}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('handles empty groupIndicators', () => {
      expect(() =>
        render(
          <CityPin
            city={mockCity}
            isVisited
            groupIndicators={[]}
            onPress={() => {}}
          />,
        ),
      ).not.toThrow()
    })
  })
})
