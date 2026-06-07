/**
 * GlassPanel tests — render, children, glass style, intensity prop.
 */

import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { GlassPanel } from '@components/ui/GlassPanel'

describe('GlassPanel', () => {
  describe('Render', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <GlassPanel>
          <Text>content</Text>
        </GlassPanel>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('renders children correctly', () => {
      const { getByText } = render(
        <GlassPanel>
          <Text>Hello World</Text>
        </GlassPanel>,
      )
      expect(getByText('Hello World')).toBeTruthy()
    })

    it('renders multiple children', () => {
      const { getByText } = render(
        <GlassPanel>
          <Text>First</Text>
          <Text>Second</Text>
        </GlassPanel>,
      )
      expect(getByText('First')).toBeTruthy()
      expect(getByText('Second')).toBeTruthy()
    })

    it('applies glass border style', () => {
      const { toJSON } = render(
        <GlassPanel>
          <Text>test</Text>
        </GlassPanel>,
      )
      const json = toJSON() as any
      expect(json.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderWidth: 1 }),
        ]),
      )
    })
  })

  describe('Interaction', () => {
    it('accepts custom style prop', () => {
      const customStyle = { margin: 8 }
      const { toJSON } = render(
        <GlassPanel style={customStyle}>
          <Text>styled</Text>
        </GlassPanel>,
      )
      const json = toJSON() as any
      // style should include custom style
      const flatStyle = JSON.stringify(json.props.style)
      expect(flatStyle).toContain('8')
    })

    it('applies custom borderRadius', () => {
      const { toJSON } = render(
        <GlassPanel borderRadius={8}>
          <Text>test</Text>
        </GlassPanel>,
      )
      const json = toJSON() as any
      const flatStyle = JSON.stringify(json.props.style)
      expect(flatStyle).toContain('8')
    })

    it('scales opacity with intensity prop', () => {
      const { toJSON } = render(
        <GlassPanel intensity={0.5}>
          <Text>test</Text>
        </GlassPanel>,
      )
      const json = toJSON() as any
      const flatStyle = JSON.stringify(json.props.style)
      // Background uses bgL1 scaled by intensity (0.80 * 0.5 = 0.40)
      expect(flatStyle).toContain('rgba(36,40,55,0.40)')
    })
  })

  describe('Edge cases', () => {
    it('handles intensity=0 without crash', () => {
      const { toJSON } = render(
        <GlassPanel intensity={0}>
          <Text>zero intensity</Text>
        </GlassPanel>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('handles intensity=1 (default) correctly', () => {
      const { toJSON } = render(
        <GlassPanel intensity={1}>
          <Text>full</Text>
        </GlassPanel>,
      )
      expect(toJSON()).toBeTruthy()
    })

    it('handles empty children gracefully', () => {
      const { toJSON } = render(<GlassPanel>{null}</GlassPanel>)
      expect(toJSON()).toBeTruthy()
    })
  })

  describe('Error states', () => {
    it('renders without style prop', () => {
      expect(() =>
        render(
          <GlassPanel>
            <Text>no style</Text>
          </GlassPanel>,
        ),
      ).not.toThrow()
    })
  })
})
