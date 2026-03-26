/**
 * PlaceCard tests — render, flag/name display, onPress, onLongPress.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PlaceCard } from '@components/cards/PlaceCard'
import * as Haptics from 'expo-haptics'
import type { VisitedPlace } from '@typedefs/database'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('@lib/sanitize', () => ({
  sanitizeReview: (t: string) => t,
}))

const mockPlace: VisitedPlace = {
  id: 'place-1',
  user_id: 'user-1',
  country_code: 'JP',
  city_id: 'city-1',
  category: 'been',
  overall_score: 4.2,
  review: 'Amazing food and culture',
  visited_date: '2024-03-15',
  planned_date: null,
  planned_budget: null,
  daily_budget: null,
  currency_code: null,
  notes: null,
  created_at: '2024-03-16T00:00:00Z',
  updated_at: '2024-03-16T00:00:00Z',
}

describe('PlaceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('shows country name', () => {
      const { getByText } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      expect(getByText('Japan')).toBeTruthy()
    })

    it('shows country flag', () => {
      const { getByText } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      // JP flag emoji
      expect(getByText('🇯🇵')).toBeTruthy()
    })

    it('shows overall score', () => {
      const { getByText } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      expect(getByText('4.2')).toBeTruthy()
    })

    it('shows review snippet when present', () => {
      const { getByText } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      expect(getByText(/"Amazing food and culture"/)).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onPress when tapped', () => {
      const onPress = jest.fn()
      const { getByRole } = render(
        <PlaceCard place={mockPlace} onPress={onPress} />,
      )
      fireEvent.press(getByRole('button'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('fires haptic on press', () => {
      const { getByRole } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} />,
      )
      fireEvent.press(getByRole('button'))
      expect(Haptics.impactAsync).toHaveBeenCalled()
    })

    it('calls onLongPress when long-pressed', () => {
      const onLongPress = jest.fn()
      const { getByRole } = render(
        <PlaceCard
          place={mockPlace}
          onPress={() => {}}
          onLongPress={onLongPress}
        />,
      )
      fireEvent(getByRole('button'), 'longPress')
      expect(onLongPress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('renders without review', () => {
      const noReview = { ...mockPlace, review: null }
      const { toJSON } = render(
        <PlaceCard place={noReview} onPress={() => {}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders without overall score', () => {
      const noScore = { ...mockPlace, overall_score: null }
      const { toJSON } = render(
        <PlaceCard place={noScore} onPress={() => {}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders want_to_go category badge', () => {
      const wantPlace = { ...mockPlace, category: 'want_to_go' as const }
      const { getByText } = render(
        <PlaceCard place={wantPlace} onPress={() => {}} />,
      )
      expect(getByText('Want to Go')).toBeTruthy()
    })

    it('renders staggered index without crash', () => {
      const { toJSON } = render(
        <PlaceCard place={mockPlace} onPress={() => {}} index={5} />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('handles unknown country code gracefully', () => {
      const unknownCountry = { ...mockPlace, country_code: 'XX' }
      const { getByText } = render(
        <PlaceCard place={unknownCountry} onPress={() => {}} />,
      )
      // Falls back to country code
      expect(getByText('XX')).toBeTruthy()
    })
  })
})
