/**
 * AchievementBadge tests — locked/unlocked states, all badge types.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { AchievementBadge } from '@components/cards/AchievementBadge'
import type { BadgeType } from '@typedefs/database'

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
    Rect: () => null,
  }
})

const ALL_BADGE_TYPES: BadgeType[] = [
  'first_stamp',
  'continental',
  'globe_trotter',
  'critic',
  'squad_goals',
  'home_away',
  'city_explorer',
]

describe('AchievementBadge', () => {
  describe('Render', () => {
    it('renders unlocked state', () => {
      const { toJSON } = render(
        <AchievementBadge badgeType="first_stamp" unlocked />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders locked state', () => {
      const { toJSON } = render(
        <AchievementBadge badgeType="first_stamp" unlocked={false} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('shows badge label', () => {
      const { getByText } = render(
        <AchievementBadge badgeType="first_stamp" unlocked />,
      )
      expect(getByText('First Stamp')).toBeTruthy()
    })

    it('shows badge description', () => {
      const { getByText } = render(
        <AchievementBadge badgeType="first_stamp" unlocked />,
      )
      expect(getByText('Mark your first country')).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('renders all badge types without crash', () => {
      ALL_BADGE_TYPES.forEach((badgeType) => {
        const { toJSON } = render(
          <AchievementBadge badgeType={badgeType} unlocked={false} />,
        )
        expect(toJSON()).toBeTruthy()
      })
    })

    it('renders with unlockedAt date', () => {
      const { toJSON } = render(
        <AchievementBadge
          badgeType="globe_trotter"
          unlocked
          unlockedAt="2024-01-15T10:00:00Z"
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('applies custom style', () => {
      const { toJSON } = render(
        <AchievementBadge
          badgeType="critic"
          unlocked
          style={{ opacity: 0.5 }}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders locked state for all types', () => {
      ALL_BADGE_TYPES.forEach((bt) => {
        expect(() =>
          render(<AchievementBadge badgeType={bt} unlocked={false} />),
        ).not.toThrow()
      })
    })
  })

  describe('Error states', () => {
    it('renders without unlockedAt', () => {
      expect(() =>
        render(<AchievementBadge badgeType="squad_goals" unlocked />),
      ).not.toThrow()
    })
  })
})
