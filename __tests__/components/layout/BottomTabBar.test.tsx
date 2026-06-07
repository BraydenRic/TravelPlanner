/**
 * BottomTabBar tests — 4 tabs render, active state, tab press.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { BottomTabBar } from '@components/layout/BottomTabBar'
import * as Haptics from 'expo-haptics'

// useSafeAreaInsets needs initial frame/insets to resolve synchronously in tests
const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

function renderWithSafeArea(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>{ui}</SafeAreaProvider>,
  )
}

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View>{children}</RN.View>,
    Path: () => null,
    Circle: () => null,
  }
})

const mockNavigationEmit = jest.fn(() => ({ defaultPrevented: false }))
const mockNavigate = jest.fn()

const mockState = {
  index: 0,
  routes: [
    { key: 'map', name: 'map' },
    { key: 'explore', name: 'explore' },
    { key: 'groups', name: 'groups' },
    { key: 'profile', name: 'profile' },
  ],
}

const mockDescriptors: Record<string, any> = {
  map: { options: { title: 'Map' } },
  explore: { options: { title: 'Explore' } },
  groups: { options: { title: 'Groups' } },
  profile: { options: { title: 'Profile' } },
}

const mockNavigation = {
  emit: mockNavigationEmit,
  navigate: mockNavigate,
}

describe('BottomTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders 4 tab items', () => {
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      expect(getAllByRole('tab').length).toBe(4)
    })

    it('marks first tab as active', () => {
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs[0].props.accessibilityState?.selected).toBe(true)
      expect(tabs[1].props.accessibilityState?.selected).toBe(false)
    })

    it('shows active tab label', () => {
      const { getByText } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      // Active tab shows label
      expect(getByText('Map')).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls navigation.emit on tab press', () => {
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      fireEvent.press(getAllByRole('tab')[1])
      expect(mockNavigationEmit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tabPress', target: 'explore' }),
      )
    })

    it('fires haptic on tab press', () => {
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      fireEvent.press(getAllByRole('tab')[2])
      expect(Haptics.selectionAsync).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('renders with index=3 (profile active)', () => {
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={{ ...mockState, index: 3 }}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs[3].props.accessibilityState?.selected).toBe(true)
    })
  })

  describe('Error states', () => {
    it('handles navigate prevented by event', () => {
      const preventedNav = {
        emit: jest.fn(() => ({ defaultPrevented: true })),
        navigate: mockNavigate,
      }
      const { getAllByRole } = renderWithSafeArea(
        <BottomTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={preventedNav}
        />,
      )
      fireEvent.press(getAllByRole('tab')[1])
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
