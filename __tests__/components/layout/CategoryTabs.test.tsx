/**
 * CategoryTabs tests — render 3 tabs, tap changes active, animation fires.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { CategoryTabs } from '@components/layout/CategoryTabs'
import * as Haptics from 'expo-haptics'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)

describe('CategoryTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <CategoryTabs
          activeCategory="been"
          onCategoryChange={() => {}}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders 3 tab options', () => {
      const { getAllByRole } = render(
        <CategoryTabs
          activeCategory="been"
          onCategoryChange={() => {}}
        />,
      )
      expect(getAllByRole('tab').length).toBe(3)
    })

    it('shows Been, Want, Lived labels', () => {
      const { getByText } = render(
        <CategoryTabs
          activeCategory="been"
          onCategoryChange={() => {}}
        />,
      )
      expect(getByText('Been')).toBeTruthy()
      expect(getByText('Want')).toBeTruthy()
      expect(getByText('Lived')).toBeTruthy()
    })

    it('marks been as active initially', () => {
      const { getAllByRole } = render(
        <CategoryTabs
          activeCategory="been"
          onCategoryChange={() => {}}
        />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs[0].props.accessibilityState?.selected).toBe(true)
    })
  })

  describe('Interaction', () => {
    it('calls onCategoryChange with correct value', () => {
      const onChange = jest.fn()
      const { getByText } = render(
        <CategoryTabs activeCategory="been" onCategoryChange={onChange} />,
      )
      fireEvent.press(getByText('Want'))
      expect(onChange).toHaveBeenCalledWith('want_to_go')
    })

    it('fires haptic on tab press', () => {
      const { getByText } = render(
        <CategoryTabs activeCategory="been" onCategoryChange={() => {}} />,
      )
      fireEvent.press(getByText('Lived'))
      expect(Haptics.selectionAsync).toHaveBeenCalled()
    })

    it('reflects activeCategory prop change', () => {
      const { rerender, getAllByRole } = render(
        <CategoryTabs
          activeCategory="been"
          onCategoryChange={() => {}}
        />,
      )
      rerender(
        <CategoryTabs
          activeCategory="lived"
          onCategoryChange={() => {}}
        />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs[2].props.accessibilityState?.selected).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('handles want_to_go as activeCategory', () => {
      const { getAllByRole } = render(
        <CategoryTabs
          activeCategory="want_to_go"
          onCategoryChange={() => {}}
        />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs[1].props.accessibilityState?.selected).toBe(true)
    })
  })

  describe('Error states', () => {
    it('renders without style prop', () => {
      expect(() =>
        render(
          <CategoryTabs
            activeCategory="been"
            onCategoryChange={() => {}}
          />,
        ),
      ).not.toThrow()
    })
  })
})
