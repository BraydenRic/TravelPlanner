/**
 * EmptyState tests — render types, onActionPress, illustrations.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { EmptyState } from '@components/layout/EmptyState'
import type { EmptyStateType } from '@components/layout/EmptyState'
import * as Haptics from 'expo-haptics'

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
    Ellipse: () => null,
    Line: () => null,
    G: ({ children }: any) => <RN.View>{children}</RN.View>,
  }
})

const ALL_TYPES: EmptyStateType[] = ['been', 'want', 'lived', 'groups', 'explore']

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Render', () => {
    it('renders been type', () => {
      const { getByText } = render(
        <EmptyState
          type="been"
          onActionPress={() => {}}
          actionLabel="Add Place"
        />,
      )
      expect(getByText('Start Your Journey')).toBeTruthy()
    })

    it('renders groups type', () => {
      const { getByText } = render(
        <EmptyState
          type="groups"
          onActionPress={() => {}}
          actionLabel="Create Group"
        />,
      )
      expect(getByText('Travel Together')).toBeTruthy()
    })

    it('renders action label button', () => {
      const { getByText } = render(
        <EmptyState
          type="want"
          onActionPress={() => {}}
          actionLabel="Add Wishlist"
        />,
      )
      expect(getByText('Add Wishlist')).toBeTruthy()
    })

    it('renders description text', () => {
      const { getByText } = render(
        <EmptyState
          type="been"
          onActionPress={() => {}}
          actionLabel="Go"
        />,
      )
      expect(getByText(/Mark countries/)).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('calls onActionPress when button pressed', () => {
      const onActionPress = jest.fn()
      const { getByText } = render(
        <EmptyState
          type="groups"
          onActionPress={onActionPress}
          actionLabel="Create"
        />,
      )
      fireEvent.press(getByText('Create'))
      expect(onActionPress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('renders all types without crash', () => {
      ALL_TYPES.forEach((type) => {
        const { toJSON } = render(
          <EmptyState
            type={type}
            onActionPress={() => {}}
            actionLabel="Action"
          />,
        )
        expect(toJSON()).toBeTruthy()
      })
    })
  })

  describe('Error states', () => {
    it('handles very long action label', () => {
      expect(() =>
        render(
          <EmptyState
            type="explore"
            onActionPress={() => {}}
            actionLabel="This is a very long action label button text"
          />,
        ),
      ).not.toThrow()
    })
  })
})
