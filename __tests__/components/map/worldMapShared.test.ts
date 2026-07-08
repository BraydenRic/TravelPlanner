/**
 * worldMapShared tests — the pure map logic shared by the web and native
 * implementations: ISO code patching, fills, group stripe colors, geographic
 * tap resolution, label sizing, and the GeoJSON loader cache.
 */

import {
  buildGroupCountryColors,
  countryAtPoint,
  getCountryFill,
  groupStripeWidth,
  interiorCentroid,
  labelFontSize,
  resolveIsoCode,
  type WorldFeature,
} from '@components/map/worldMapShared'
import { colors } from '@theme/colors'

// d3-geo spherical polygons: exterior rings wound clockwise (in lon/lat
// order) enclose the small area — matches Natural Earth's convention.
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

describe('resolveIsoCode', () => {
  it('returns the ISO_A2 code directly when valid', () => {
    expect(resolveIsoCode({ ISO_A2: 'US', ADM0_A3: 'USA' })).toBe('US')
  })

  it('patches "-99" codes via the ADM0_A3 override table', () => {
    expect(resolveIsoCode({ ISO_A2: '-99', ADM0_A3: 'FRA' })).toBe('FR')
    expect(resolveIsoCode({ ISO_A2: '-99', ADM0_A3: 'NOR' })).toBe('NO')
    expect(resolveIsoCode({ ISO_A2: '-99', ADM0_A3: 'CYN' })).toBe('CY')
  })

  it('returns null for unresolvable "-99" codes', () => {
    expect(resolveIsoCode({ ISO_A2: '-99', ADM0_A3: 'ZZZ' })).toBeNull()
  })

  it('excludes Antarctica', () => {
    expect(resolveIsoCode({ ISO_A2: 'AQ', ADM0_A3: 'ATA' })).toBeNull()
  })
})

describe('getCountryFill', () => {
  const visited = [
    { country_code: 'JP', cities_visited: 3, total_cities: 15, fill_ratio: 0.2 },
    { country_code: 'DE', cities_visited: 0, total_cities: 10, fill_ratio: 0 },
  ]

  it('returns map land color for unvisited countries', () => {
    expect(getCountryFill('FR', visited, 'been')).toBe(colors.mapLand)
  })

  it('returns map land color when cities_visited is 0', () => {
    expect(getCountryFill('DE', visited, 'been')).toBe(colors.mapLand)
  })

  it('scales been fill opacity with fill_ratio', () => {
    expect(getCountryFill('JP', visited, 'been')).toBe('rgba(0,245,212,0.33)')
  })

  it('uses fixed colors for want_to_go and lived', () => {
    expect(getCountryFill('JP', visited, 'want_to_go')).toBe('rgba(167,139,250,0.7)')
    expect(getCountryFill('JP', visited, 'lived')).toBe('rgba(245,166,35,0.6)')
  })
})

describe('buildGroupCountryColors', () => {
  it('groups member colors by country without duplicates', () => {
    const map = buildGroupCountryColors([
      { user_id: 'u1', color: '#00F5D4', country_code: 'US', city_id: null, category: 'been' },
      { user_id: 'u1', color: '#00F5D4', country_code: 'US', city_id: 'c1', category: 'been' },
      { user_id: 'u2', color: '#F5A623', country_code: 'US', city_id: null, category: 'been' },
      { user_id: 'u2', color: '#F5A623', country_code: 'CA', city_id: null, category: 'been' },
    ])
    expect(map.get('US')).toEqual(['#00F5D4', '#F5A623'])
    expect(map.get('CA')).toEqual(['#F5A623'])
  })

  it('returns an empty map for non-array payloads', () => {
    expect(buildGroupCountryColors(undefined).size).toBe(0)
    expect(buildGroupCountryColors(null).size).toBe(0)
    expect(
      buildGroupCountryColors({} as unknown as Parameters<typeof buildGroupCountryColors>[0]).size,
    ).toBe(0)
  })
})

describe('groupStripeWidth', () => {
  it('falls back to a mid-size stripe when the feature is unknown', () => {
    expect(groupStripeWidth(undefined)).toBe(5)
  })

  it('clamps stripes between 2 and 8', () => {
    const tiny = squareCountry('SG', 0)
    tiny.geometry!.coordinates = [
      [
        [0, 0],
        [0, 0.1],
        [0.1, 0.1],
        [0.1, 0],
        [0, 0],
      ],
    ]
    expect(groupStripeWidth(tiny)).toBe(2)

    // A quarter of the sphere is far wider than the 8px cap allows
    const huge = squareCountry('RU', 0)
    huge.geometry!.coordinates = [
      [
        [0, -60],
        [0, 60],
        [120, 60],
        [120, -60],
        [0, -60],
      ],
    ]
    expect(groupStripeWidth(huge)).toBe(8)
  })
})

describe('countryAtPoint', () => {
  const countries = [
    { code: 'AA', feature: squareCountry('AA', 0) },
    { code: 'BB', feature: squareCountry('BB', 20) },
  ]

  it('resolves a point inside a country to its code', () => {
    expect(countryAtPoint(countries, [5, 5])).toBe('AA')
    expect(countryAtPoint(countries, [25, 5])).toBe('BB')
  })

  it('returns null for ocean points', () => {
    expect(countryAtPoint(countries, [15, 5])).toBeNull()
    expect(countryAtPoint(countries, [-170, -50])).toBeNull()
  })
})

describe('labelFontSize', () => {
  const country = squareCountry('AA', 0)

  it('sizes marked labels larger than unmarked', () => {
    const marked = labelFontSize(country, 'AA', true, 1)
    const unmarked = labelFontSize(country, 'AA', false, 1)
    expect(marked).not.toBeNull()
    expect(unmarked).not.toBeNull()
    expect(marked!).toBeGreaterThan(unmarked!)
  })

  it('skips countries below the area threshold at low zoom', () => {
    const speck = squareCountry('VA', 0)
    speck.geometry!.coordinates = [
      [
        [0, 0],
        [0, 0.5],
        [0.5, 0.5],
        [0.5, 0],
        [0, 0],
      ],
    ]
    expect(labelFontSize(speck, 'VATICAN', false, 1)).toBeNull()
    // Zooming in lowers the threshold — the same country becomes labelable
    expect(labelFontSize(speck, 'VATICAN', false, 8)).not.toBeNull()
  })

  it('shrinks label size as zoom increases (constant screen size)', () => {
    const atZoom1 = labelFontSize(country, 'AA', true, 1)
    const atZoom4 = labelFontSize(country, 'AA', true, 4)
    expect(atZoom1!).toBeGreaterThan(atZoom4!)
  })
})

describe('interiorCentroid', () => {
  it('anchors MultiPolygon countries on their largest landmass', () => {
    const archipelago: WorldFeature = {
      type: 'Feature',
      properties: { ISO_A2: 'ID', ADM0_A3: 'IDN', NAME: 'Indonesia' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Small island near [50, 5]
          [
            [
              [50, 0],
              [50, 2],
              [52, 2],
              [52, 0],
              [50, 0],
            ],
          ],
          // Much larger landmass near [5, 5]
          [
            [
              [0, 0],
              [0, 10],
              [10, 10],
              [10, 0],
              [0, 0],
            ],
          ],
        ],
      },
    }
    const [lon, lat] = interiorCentroid(archipelago)
    expect(lon).toBeGreaterThan(0)
    expect(lon).toBeLessThan(10)
    expect(lat).toBeGreaterThan(0)
    expect(lat).toBeLessThan(10)
  })
})

describe('loadWorldFeatures', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetModules()
  })

  function freshLoader() {
    // Re-require to reset the module-level promise cache between scenarios
    let loader: typeof import('@components/map/worldMapShared')
    jest.isolateModules(() => {
      loader = require('@components/map/worldMapShared')
    })
    return loader!
  }

  it('fetches once, resolves ISO codes, and caches the result', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [
            squareCountry('US', 0),
            { ...squareCountry('FR', 20), properties: { ISO_A2: '-99', ADM0_A3: 'FRA' } },
            { ...squareCountry('AQ', 40), properties: { ISO_A2: 'AQ', ADM0_A3: 'ATA' } },
          ],
        }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { loadWorldFeatures } = freshLoader()
    const first = await loadWorldFeatures()
    expect(first.map((c) => c.code)).toEqual(['US', 'FR'])

    await loadWorldFeatures()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clears the cache on failure so a retry re-fetches', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: [squareCountry('US', 0)] }),
      })
    global.fetch = fetchMock as unknown as typeof fetch

    const { loadWorldFeatures } = freshLoader()
    await expect(loadWorldFeatures()).rejects.toThrow('GeoJSON fetch failed: 500')

    const retried = await loadWorldFeatures()
    expect(retried.map((c) => c.code)).toEqual(['US'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
