/**
 * WorldMapNative tests — loading/error states, country path rendering,
 * group stripe fills, and geographic tap resolution.
 *
 * The GeoJSON loader is mocked with small square "countries" whose
 * projected positions are known, so taps can be asserted end-to-end
 * (screen point → unproject → geoContains → onCountryPress).
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Path, Text as SvgText } from 'react-native-svg'
import type { TapGesture } from 'react-native-gesture-handler'
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils'
import WorldMapNative from '@components/map/WorldMapNative'
import { loadWorldFeatures, type WorldFeature } from '@components/map/worldMapShared'

jest.mock('@components/map/worldMapShared', () => ({
  ...jest.requireActual('@components/map/worldMapShared'),
  loadWorldFeatures: jest.fn(),
}))

const mockLoad = loadWorldFeatures as jest.MockedFunction<typeof loadWorldFeatures>

// Clockwise-wound square (d3-geo convention) spanning 10°×10°
function squareCountry(code: string, lonStart: number): WorldFeature {
  return {
    type: 'Feature',
    properties: { ISO_A2: code, ADM0_A3: `${code}X`, NAME: code },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lonStart, 0],
          [lonStart, 10],
          [lonStart + 10, 10],
          [lonStart + 10, 0],
          [lonStart, 0],
        ],
      ],
    },
  }
}

const fixtures = [
  { code: 'US', feature: squareCountry('US', 0) },
  { code: 'CA', feature: squareCountry('CA', 20) },
]

const baseProps = {
  visitedCountries: [],
  activeCategory: 'been' as const,
  onCountryPress: jest.fn(),
  testID: 'native-map',
}

// Lay the map out at exactly the virtual canvas size (800×600) so view
// coordinates equal canvas coordinates (m = 1, no letterbox offsets) and
// tap positions can be computed directly from the projection.
function layoutMap(getByTestId: (id: string) => unknown) {
  fireEvent(getByTestId('native-map') as never, 'layout', {
    nativeEvent: { layout: { width: 800, height: 600 } },
  })
}

describe('WorldMapNative', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoad.mockResolvedValue(fixtures)
  })

  it('shows a loading indicator until the GeoJSON resolves', () => {
    mockLoad.mockReturnValue(new Promise(() => {})) // never resolves
    const { getByTestId } = render(<WorldMapNative {...baseProps} />)
    expect(getByTestId('native-map')).toBeTruthy()
  })

  it('renders a path per country once loaded and laid out', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<WorldMapNative {...baseProps} />)

    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    layoutMap(getByTestId)

    await waitFor(() => {
      expect(UNSAFE_getAllByType(Path)).toHaveLength(2)
    })
  })

  it('fills visited countries differently from unvisited ones', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <WorldMapNative
        {...baseProps}
        visitedCountries={[
          { country_code: 'US', cities_visited: 3, total_cities: 15, fill_ratio: 0.2 },
        ]}
      />,
    )
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    layoutMap(getByTestId)

    await waitFor(() => {
      const fills = UNSAFE_getAllByType(Path).map((p) => p.props.fill as string)
      expect(fills).toContain('rgba(0,245,212,0.33)')
    })
  })

  it('uses stripe patterns when multiple group members mark a country', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <WorldMapNative
        {...baseProps}
        groupMapData={[
          { user_id: 'u1', color: '#00F5D4', country_code: 'US', city_id: null, category: 'been' },
          { user_id: 'u2', color: '#F5A623', country_code: 'US', city_id: null, category: 'been' },
          { user_id: 'u2', color: '#F5A623', country_code: 'CA', city_id: null, category: 'been' },
        ]}
      />,
    )
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    layoutMap(getByTestId)

    await waitFor(() => {
      const fills = UNSAFE_getAllByType(Path).map((p) => p.props.fill as string)
      expect(fills).toContain('url(#grp-stripes-US)') // two members → stripes
      expect(fills).toContain('#F5A623CC') // single member → solid color
    })
  })

  it('resolves taps geographically to the tapped country', async () => {
    const onCountryPress = jest.fn()
    const { getByTestId, UNSAFE_getAllByType } = render(
      <WorldMapNative {...baseProps} onCountryPress={onCountryPress} />,
    )
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    layoutMap(getByTestId)
    await waitFor(() => expect(UNSAFE_getAllByType(Path).length).toBeGreaterThan(0))

    // projection([5, 5]) ≈ [412, 314] on the 800×600 canvas — inside 'US'
    fireGestureHandler<TapGesture>(getByGestureTestId('world-map-tap'), [{ x: 412, y: 314 }])
    expect(onCountryPress).toHaveBeenCalledWith('US')

    // A point in the ocean between the two squares resolves to nothing
    onCountryPress.mockClear()
    fireGestureHandler<TapGesture>(getByGestureTestId('world-map-tap'), [{ x: 200, y: 100 }])
    expect(onCountryPress).not.toHaveBeenCalled()
  })

  it('renders both polygons when two features share an ISO code (Cyprus remap)', async () => {
    // Natural Earth has Cyprus (CYP) and Northern Cyprus (CYN) as separate
    // features that both resolve to 'CY' — paths must be keyed by ADM0_A3
    // or React drops one of them with a duplicate-key warning.
    const cyprus = squareCountry('CY', 0)
    cyprus.properties = { ISO_A2: 'CY', ADM0_A3: 'CYP', NAME: 'Cyprus' }
    const northernCyprus = squareCountry('CY', 20)
    northernCyprus.properties = { ISO_A2: '-99', ADM0_A3: 'CYN', NAME: 'N. Cyprus' }
    mockLoad.mockResolvedValue([
      { code: 'CY', feature: cyprus },
      { code: 'CY', feature: northernCyprus },
    ])

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { getByTestId, UNSAFE_getAllByType, rerender } = render(
        <WorldMapNative {...baseProps} />,
      )
      await waitFor(() => expect(mockLoad).toHaveBeenCalled())
      layoutMap(getByTestId)
      await waitFor(() => expect(UNSAFE_getAllByType(Path)).toHaveLength(2))

      // Re-render (fill change) — duplicate keys corrupt reconciliation here
      rerender(<WorldMapNative {...baseProps} selectedCountry="CY" />)
      expect(UNSAFE_getAllByType(Path)).toHaveLength(2)

      const keyWarnings = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes('same key'),
      )
      expect(keyWarnings).toHaveLength(0)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('shows an error state with a working retry', async () => {
    mockLoad.mockRejectedValueOnce(new Error('network down'))
    const { getByTestId, getByText, UNSAFE_getAllByType } = render(
      <WorldMapNative {...baseProps} />,
    )

    await waitFor(() => expect(getByText("Couldn't load the map.")).toBeTruthy())

    fireEvent.press(getByText('Retry'))
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2))
    layoutMap(getByTestId)
    await waitFor(() => expect(UNSAFE_getAllByType(Path)).toHaveLength(2))
  })

  it('renders country labels when showAllLabels is on', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <WorldMapNative {...baseProps} showAllLabels />,
    )
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    layoutMap(getByTestId)

    // Each label renders twice (stroke-only halo + fill text) — react-native-svg
    // text content isn't reachable via getByText, so inspect element props.
    // 'US' renders as 'USA' via the shared display-name overrides.
    await waitFor(() => {
      const labels = UNSAFE_getAllByType(SvgText).map((t) => t.props.children)
      expect(labels.filter((l) => l === 'USA')).toHaveLength(2)
      expect(labels.filter((l) => l === 'CA')).toHaveLength(2)
    })
  })
})
