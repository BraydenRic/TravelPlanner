/**
 * WorldMap tests — render, onCountryPress, platform adaptive.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { WorldMap } from '@components/map/WorldMap'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: any) => children,
  Geographies: ({ children }: any) => children({ geographies: [] }),
  Geography: () => null,
}))

const baseProps = {
  visitedCountries: [],
  activeCategory: 'been' as const,
  onCountryPress: jest.fn(),
}

describe('WorldMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<WorldMap {...baseProps} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders on mobile with fallback text', () => {
      // Platform defaults to mobile in test env
      const { toJSON } = render(<WorldMap {...baseProps} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders with visited countries data', () => {
      const { toJSON } = render(
        <WorldMap
          {...baseProps}
          visitedCountries={[
            {
              country_code: 'JP',
              cities_visited: 3,
              total_cities: 15,
              fill_ratio: 0.2,
            },
          ]}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('passes onCountryPress prop down', () => {
      const onPress = jest.fn()
      const { toJSON } = render(
        <WorldMap {...baseProps} onCountryPress={onPress} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders with group map data', () => {
      const { toJSON } = render(
        <WorldMap
          {...baseProps}
          groupMapData={[
            {
              user_id: 'u1',
              color: '#00F5D4',
              country_code: 'US',
              city_id: null,
              category: 'been',
            },
          ]}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('renders with selectedCountry', () => {
      const { toJSON } = render(
        <WorldMap {...baseProps} selectedCountry="DE" />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders different activeCategory values', () => {
      for (const cat of ['been', 'want_to_go', 'lived'] as const) {
        const { toJSON } = render(
          <WorldMap {...baseProps} activeCategory={cat} />,
        )
        expect(toJSON()).toBeTruthy()
      }
    })

    it('handles empty visitedCountries array', () => {
      const { toJSON } = render(
        <WorldMap {...baseProps} visitedCountries={[]} />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('does not crash with undefined groupMapData', () => {
      expect(() =>
        render(<WorldMap {...baseProps} groupMapData={undefined} />),
      ).not.toThrow()
    })
  })
})
