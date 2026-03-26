/**
 * SpringButton tests — render, variants, onPress, disabled, haptics.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SpringButton } from '@components/ui/SpringButton'
import * as Haptics from 'expo-haptics'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)

describe('SpringButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders primary variant by default', () => {
      const { toJSON } = render(
        <SpringButton onPress={() => {}}>Click Me</SpringButton>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders text children', () => {
      const { getByText } = render(
        <SpringButton onPress={() => {}}>Submit</SpringButton>,
      )
      expect(getByText('Submit')).toBeTruthy()
    })

    it('renders secondary variant', () => {
      const { toJSON } = render(
        <SpringButton variant="secondary" onPress={() => {}}>
          Secondary
        </SpringButton>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders ghost variant', () => {
      const { toJSON } = render(
        <SpringButton variant="ghost" onPress={() => {}}>
          Ghost
        </SpringButton>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders custom children (non-string)', () => {
      const { toJSON } = render(
        <SpringButton onPress={() => {}}>
          <React.Fragment>
            {/* custom inner view */}
          </React.Fragment>
        </SpringButton>,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onPress when tapped', () => {
      const onPress = jest.fn()
      const { getByText } = render(
        <SpringButton onPress={onPress}>Tap Me</SpringButton>,
      )
      fireEvent.press(getByText('Tap Me'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('fires haptic on press', () => {
      const { getByText } = render(
        <SpringButton onPress={() => {}}>Haptic</SpringButton>,
      )
      fireEvent.press(getByText('Haptic'))
      expect(Haptics.impactAsync).toHaveBeenCalled()
    })

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn()
      const { getByText } = render(
        <SpringButton onPress={onPress} disabled>
          Disabled
        </SpringButton>,
      )
      fireEvent.press(getByText('Disabled'))
      expect(onPress).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('renders with accessibilityLabel', () => {
      const { getByRole } = render(
        <SpringButton onPress={() => {}} accessibilityLabel="My Button">
          Button
        </SpringButton>,
      )
      // accessibilityRole="button" applied
      expect(getByRole('button')).toBeTruthy()
    })

    it('accepts style override', () => {
      const { toJSON } = render(
        <SpringButton onPress={() => {}} style={{ margin: 16 }}>
          Styled
        </SpringButton>,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('does not crash with empty onPress', () => {
      expect(() =>
        render(<SpringButton onPress={() => {}}>OK</SpringButton>),
      ).not.toThrow()
    })
  })
})
