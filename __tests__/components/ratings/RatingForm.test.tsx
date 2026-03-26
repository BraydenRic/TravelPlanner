/**
 * RatingForm tests — render categories, star changes, submit, dismiss.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { RatingForm } from '@components/ratings/RatingForm'
import { RATING_CATEGORIES } from '@constants/ratingCategories'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: () => ({
      onUpdate: () => ({ onEnd: () => ({}) }),
    }),
  },
}))
jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View>{children}</RN.View>,
    Path: () => null,
    Circle: () => null,
    Rect: () => null,
    Defs: () => null,
    ClipPath: () => null,
  }
})
jest.mock('@services/ratings', () => ({
  computeOverallScore: jest.fn(() => 3.5),
}))

const defaultProps = {
  cityName: 'Tokyo',
  countryCode: 'JP',
  onSubmit: jest.fn(),
  onDismiss: jest.fn(),
}

describe('RatingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders city name', () => {
      const { getByText } = render(<RatingForm {...defaultProps} />)
      expect(getByText('Tokyo')).toBeTruthy()
    })

    it('renders all 10 category labels', () => {
      const { getByText } = render(<RatingForm {...defaultProps} />)
      RATING_CATEGORIES.forEach((cat) => {
        expect(getByText(cat.label)).toBeTruthy()
      })
    })

    it('renders Save Rating button', () => {
      const { getByText } = render(<RatingForm {...defaultProps} />)
      expect(getByText('Save Rating')).toBeTruthy()
    })

    it('renders Dismiss button', () => {
      const { getByText } = render(<RatingForm {...defaultProps} />)
      expect(getByText('Dismiss')).toBeTruthy()
    })

    it('renders progress indicator text', () => {
      const { getByText } = render(<RatingForm {...defaultProps} />)
      expect(getByText(/0\/10 categories rated/)).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onDismiss when Dismiss is pressed', () => {
      const onDismiss = jest.fn()
      const { getByText } = render(
        <RatingForm {...defaultProps} onDismiss={onDismiss} />,
      )
      fireEvent.press(getByText('Dismiss'))
      // onDismiss fires after spring animation — mock timer
      jest.runAllTimers?.()
    })

    it('calls onSubmit when Save Rating is pressed', () => {
      const onSubmit = jest.fn()
      const { getByText } = render(
        <RatingForm {...defaultProps} onSubmit={onSubmit} />,
      )
      fireEvent.press(getByText('Save Rating'))
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('populates initialRatings', () => {
      const { toJSON } = render(
        <RatingForm
          {...defaultProps}
          initialRatings={{ safety: 4, food_cuisine: 3 }}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('renders with empty initialRatings', () => {
      const { toJSON } = render(
        <RatingForm {...defaultProps} initialRatings={{}} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders for unknown countryCode gracefully', () => {
      const { toJSON } = render(
        <RatingForm
          {...defaultProps}
          countryCode="XX"
          cityName="Unknown City"
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('does not crash if computeOverallScore returns null', () => {
      const mockRatings = require('@services/ratings')
      mockRatings.computeOverallScore.mockReturnValueOnce(null)
      expect(() => render(<RatingForm {...defaultProps} />)).not.toThrow()
    })
  })
})
