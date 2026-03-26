/**
 * SplitCountry tests — 1-4 member segments render correctly.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { SplitCountry } from '@components/map/SplitCountry'
import type { MemberColor } from '@typedefs/database'

jest.mock('react-native-svg', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <RN.View testID="svg">{children}</RN.View>,
    Path: ({ d }: any) => <RN.View testID="path" />,
    Defs: ({ children }: any) => <RN.View>{children}</RN.View>,
    ClipPath: ({ id, children }: any) => (
      <RN.View testID={`clip-${id}`}>{children}</RN.View>
    ),
    Rect: () => null,
    G: ({ children }: any) => <RN.View testID="segment">{children}</RN.View>,
  }
})

const MOCK_PATH = 'M0 0 L100 0 L100 60 L0 60 Z'

describe('SplitCountry', () => {
  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <SplitCountry
          countryCode="US"
          members={[{ color: '#00F5D4', fillRatio: 0.8 }]}
          path={MOCK_PATH}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders 1 segment for 1 member', () => {
      const { getAllByTestId } = render(
        <SplitCountry
          countryCode="US"
          members={[{ color: '#00F5D4', fillRatio: 0.8 }]}
          path={MOCK_PATH}
        />,
      )
      const segments = getAllByTestId('segment')
      expect(segments.length).toBe(1)
    })

    it('renders 2 segments for 2 members', () => {
      const { getAllByTestId } = render(
        <SplitCountry
          countryCode="US"
          members={[
            { color: '#00F5D4', fillRatio: 0.8 },
            { color: '#F5A623', fillRatio: 0.6 },
          ]}
          path={MOCK_PATH}
        />,
      )
      const segments = getAllByTestId('segment')
      expect(segments.length).toBe(2)
    })

    it('renders 3 segments for 3 members', () => {
      const { getAllByTestId } = render(
        <SplitCountry
          countryCode="US"
          members={[
            { color: '#00F5D4', fillRatio: 0.8 },
            { color: '#F5A623', fillRatio: 0.6 },
            { color: '#A78BFA', fillRatio: 0.4 },
          ]}
          path={MOCK_PATH}
        />,
      )
      const segments = getAllByTestId('segment')
      expect(segments.length).toBe(3)
    })

    it('renders 4 segments for 4 members', () => {
      const { getAllByTestId } = render(
        <SplitCountry
          countryCode="US"
          members={[
            { color: '#00F5D4', fillRatio: 0.8 },
            { color: '#F5A623', fillRatio: 0.6 },
            { color: '#A78BFA', fillRatio: 0.4 },
            { color: '#FF6B6B', fillRatio: 0.9 },
          ]}
          path={MOCK_PATH}
        />,
      )
      const segments = getAllByTestId('segment')
      expect(segments.length).toBe(4)
    })
  })

  describe('Interaction', () => {
    it('clips extra members beyond 4', () => {
      const { getAllByTestId } = render(
        <SplitCountry
          countryCode="US"
          members={[
            { color: '#00F5D4', fillRatio: 1 },
            { color: '#F5A623', fillRatio: 1 },
            { color: '#A78BFA', fillRatio: 1 },
            { color: '#FF6B6B', fillRatio: 1 },
            { color: '#00F5D4', fillRatio: 1 }, // 5th is ignored
          ]}
          path={MOCK_PATH}
        />,
      )
      const segments = getAllByTestId('segment')
      expect(segments.length).toBe(4)
    })

    it('accepts custom width and height', () => {
      const { toJSON } = render(
        <SplitCountry
          countryCode="FR"
          members={[{ color: '#00F5D4', fillRatio: 0.5 }]}
          path={MOCK_PATH}
          width={200}
          height={120}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('returns null with no members', () => {
      const { toJSON } = render(
        <SplitCountry countryCode="US" members={[]} path={MOCK_PATH} />,
      )
      expect(toJSON()).toBeNull()
    })

    it('handles fillRatio=0', () => {
      const { toJSON } = render(
        <SplitCountry
          countryCode="US"
          members={[{ color: '#00F5D4', fillRatio: 0 }]}
          path={MOCK_PATH}
        />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('does not crash with empty path string', () => {
      expect(() =>
        render(
          <SplitCountry
            countryCode="US"
            members={[{ color: '#00F5D4', fillRatio: 0.5 }]}
            path=""
          />,
        ),
      ).not.toThrow()
    })
  })
})
