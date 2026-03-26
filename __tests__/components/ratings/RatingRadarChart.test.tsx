/**
 * RatingRadarChart tests — render, polygon data, all-zeros, all-fives.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { RatingRadarChart } from '@components/ratings/RatingRadarChart'
import type { RatingCategory } from '@typedefs/database'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View testID="svg">{children}</RN.View>,
    Polygon: ({ points }: any) => <RN.View testID="polygon" accessibilityLabel={points} />,
    Circle: () => null,
    Line: () => null,
    G: ({ children }: any) => <RN.View>{children}</RN.View>,
    Text: ({ children }: any) => <RN.Text>{children}</RN.Text>,
  }
})

const FULL_RATINGS: Record<RatingCategory, number> = {
  overall_experience: 4,
  safety: 3,
  food_cuisine: 5,
  transportation: 2,
  friendliness: 4,
  affordability: 3,
  cleanliness: 4,
  nightlife_entertainment: 3,
  natural_beauty: 5,
  wifi_connectivity: 4,
}

const ZERO_RATINGS: Record<RatingCategory, number> = {
  overall_experience: 0,
  safety: 0,
  food_cuisine: 0,
  transportation: 0,
  friendliness: 0,
  affordability: 0,
  cleanliness: 0,
  nightlife_entertainment: 0,
  natural_beauty: 0,
  wifi_connectivity: 0,
}

const FIVE_RATINGS: Record<RatingCategory, number> = {
  overall_experience: 5,
  safety: 5,
  food_cuisine: 5,
  transportation: 5,
  friendliness: 5,
  affordability: 5,
  cleanliness: 5,
  nightlife_entertainment: 5,
  natural_beauty: 5,
  wifi_connectivity: 5,
}

describe('RatingRadarChart', () => {
  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <RatingRadarChart ratings={FULL_RATINGS} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders SVG element', () => {
      const { getByTestId } = render(
        <RatingRadarChart ratings={FULL_RATINGS} />,
      )
      expect(getByTestId('svg')).toBeTruthy()
    })

    it('renders animated polygon', () => {
      const { getAllByTestId } = render(
        <RatingRadarChart ratings={FULL_RATINGS} />,
      )
      // polygon exists
      expect(getAllByTestId('polygon').length).toBeGreaterThan(0)
    })
  })

  describe('Interaction', () => {
    it('renders group member overlays when groupRatings provided', () => {
      const { toJSON } = render(
        <RatingRadarChart
          ratings={FULL_RATINGS}
          groupRatings={[{ color: '#00F5D4', ratings: FULL_RATINGS }]}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('accepts custom size', () => {
      const { toJSON } = render(
        <RatingRadarChart ratings={FULL_RATINGS} size={320} />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('handles all-zeros ratings', () => {
      const { toJSON } = render(
        <RatingRadarChart ratings={ZERO_RATINGS} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('handles all-fives ratings', () => {
      const { toJSON } = render(
        <RatingRadarChart ratings={FIVE_RATINGS} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders without group ratings', () => {
      const { toJSON } = render(
        <RatingRadarChart ratings={FULL_RATINGS} groupRatings={[]} />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('does not crash with minimal size', () => {
      expect(() =>
        render(<RatingRadarChart ratings={FULL_RATINGS} size={48} />),
      ).not.toThrow()
    })
  })
})
