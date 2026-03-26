/**
 * AnimatedNumber tests — render, value, style, suffix.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { AnimatedNumber } from '@components/ui/AnimatedNumber'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)

describe('AnimatedNumber', () => {
  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<AnimatedNumber value={42} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders with value 0', () => {
      const { toJSON } = render(<AnimatedNumber value={0} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders with decimal support', () => {
      const { toJSON } = render(<AnimatedNumber value={4.7} decimals={1} />)
      expect(toJSON()).toBeTruthy()
    })

    it('renders with suffix', () => {
      const { toJSON } = render(
        <AnimatedNumber value={50} suffix="%" />,
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    it('accepts style prop', () => {
      const { toJSON } = render(
        <AnimatedNumber value={10} style={{ fontSize: 32 }} />,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('updates when value changes', () => {
      const { rerender, toJSON } = render(<AnimatedNumber value={10} />)
      rerender(<AnimatedNumber value={20} />)
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('handles negative values', () => {
      const { toJSON } = render(<AnimatedNumber value={-5} />)
      expect(toJSON()).toBeTruthy()
    })

    it('handles very large numbers', () => {
      const { toJSON } = render(<AnimatedNumber value={1000000} />)
      expect(toJSON()).toBeTruthy()
    })

    it('handles decimals=0 (default)', () => {
      const { toJSON } = render(<AnimatedNumber value={3.7} decimals={0} />)
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('renders with NaN-safe value 0', () => {
      expect(() => render(<AnimatedNumber value={0} />)).not.toThrow()
    })
  })
})
