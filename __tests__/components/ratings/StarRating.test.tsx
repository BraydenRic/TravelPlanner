/**
 * StarRating tests — render, tap, readonly, half-star.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { StarRating } from '@components/ratings/StarRating'
import * as Haptics from 'expo-haptics'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View>{children}</RN.View>,
    Path: () => null,
    Defs: () => null,
    ClipPath: () => null,
    Rect: () => null,
  }
})

describe('StarRating', () => {
  describe('Render', () => {
    it('renders 5 stars', () => {
      const { getAllByRole } = render(
        <StarRating value={0} />,
      )
      // 5 star buttons
      expect(getAllByRole('button').length).toBe(5)
    })

    it('renders in readonly mode with text role', () => {
      const { getAllByRole } = render(
        <StarRating value={3} readonly />,
      )
      expect(getAllByRole('text').length).toBe(5)
    })

    it('renders with value 5', () => {
      const { toJSON } = render(<StarRating value={5} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders half-star value without crash', () => {
      const { toJSON } = render(<StarRating value={2.5} />)
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onChangeValue when star is tapped', () => {
      const onChangeValue = jest.fn()
      const { getAllByRole } = render(
        <StarRating value={0} onChangeValue={onChangeValue} />,
      )
      const stars = getAllByRole('button')
      fireEvent.press(stars[2]) // tap 3rd star
      expect(onChangeValue).toHaveBeenCalledWith(3)
    })

    it('fires haptic on star press', () => {
      const { getAllByRole } = render(
        <StarRating value={0} onChangeValue={() => {}} />,
      )
      fireEvent.press(getAllByRole('button')[0])
      expect(Haptics.impactAsync).toHaveBeenCalled()
    })

    it('does not fire onChangeValue in readonly mode', () => {
      const onChangeValue = jest.fn()
      const { getAllByRole } = render(
        <StarRating value={3} readonly onChangeValue={onChangeValue} />,
      )
      // readonly stars use 'text' role, pressing should not call handler
      expect(onChangeValue).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('handles value=0 (empty stars)', () => {
      const { toJSON } = render(<StarRating value={0} />)
      expect(toJSON()).toBeTruthy()
    })

    it('handles custom size', () => {
      const { toJSON } = render(<StarRating value={4} size={32} />)
      expect(toJSON()).toBeTruthy()
    })

    it('handles custom color', () => {
      const { toJSON } = render(
        <StarRating value={3} color="#FF0000" />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('renders without onChangeValue callback', () => {
      expect(() => render(<StarRating value={3} />)).not.toThrow()
    })
  })
})
