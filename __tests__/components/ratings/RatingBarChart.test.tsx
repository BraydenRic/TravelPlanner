/**
 * RatingBarChart tests — render rows, missing ratings show 0, animate.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { RatingBarChart } from '@components/ratings/RatingBarChart'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory } from '@typedefs/database'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}))

describe('RatingBarChart', () => {
  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<RatingBarChart ratings={{}} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders all 10 category labels', () => {
      const { getByText } = render(<RatingBarChart ratings={{}} />)
      RATING_CATEGORIES.forEach((cat) => {
        expect(getByText(cat.label)).toBeTruthy()
      })
    })

    it('renders score "—" for missing ratings', () => {
      const { getAllByText } = render(<RatingBarChart ratings={{}} />)
      expect(getAllByText('—').length).toBe(10)
    })

    it('renders numeric score for provided ratings', () => {
      const ratings: Partial<Record<RatingCategory, number>> = {
        safety: 4,
      }
      const { getByText } = render(<RatingBarChart ratings={ratings} />)
      expect(getByText('4.0')).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('renders with animate=false', () => {
      const { toJSON } = render(
        <RatingBarChart ratings={{ safety: 3 }} animate={false} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('updates when ratings prop changes', () => {
      const { rerender, getByText } = render(<RatingBarChart ratings={{}} />)
      rerender(<RatingBarChart ratings={{ safety: 5 }} />)
      expect(getByText('5.0')).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('handles full ratings object', () => {
      const fullRatings: Partial<Record<RatingCategory, number>> = {
        overall_experience: 5,
        safety: 4,
        food_cuisine: 3,
        transportation: 2,
        friendliness: 1,
        affordability: 5,
        cleanliness: 4,
        nightlife_entertainment: 3,
        natural_beauty: 5,
        wifi_connectivity: 4,
      }
      const { toJSON } = render(<RatingBarChart ratings={fullRatings} />)
      expect(toJSON()).toBeTruthy()
    })

    it('handles rating value of 0 as zero bar', () => {
      const { toJSON } = render(
        <RatingBarChart ratings={{ safety: 0 }} />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('renders with empty ratings without crash', () => {
      expect(() => render(<RatingBarChart ratings={{}} />)).not.toThrow()
    })
  })
})
