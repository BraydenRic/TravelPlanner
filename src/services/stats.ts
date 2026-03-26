/**
 * Stats service — travel statistics and continent progress.
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import type { TravelStats } from '@typedefs/api'
import type { VisitedPlace } from '@typedefs/database'

// ---------------------------------------------------------------------------
// Continent → country mapping (ISO 3166-1 alpha-2 subset)
// ---------------------------------------------------------------------------

const CONTINENT_MAP: Record<string, string> = {
  // Africa
  DZ: 'Africa', AO: 'Africa', BJ: 'Africa', BW: 'Africa', BF: 'Africa', BI: 'Africa',
  CM: 'Africa', CV: 'Africa', CF: 'Africa', TD: 'Africa', KM: 'Africa', CG: 'Africa',
  CD: 'Africa', CI: 'Africa', DJ: 'Africa', EG: 'Africa', GQ: 'Africa', ER: 'Africa',
  ET: 'Africa', GA: 'Africa', GM: 'Africa', GH: 'Africa', GN: 'Africa', GW: 'Africa',
  KE: 'Africa', LS: 'Africa', LR: 'Africa', LY: 'Africa', MG: 'Africa', MW: 'Africa',
  ML: 'Africa', MR: 'Africa', MU: 'Africa', MA: 'Africa', MZ: 'Africa', NA: 'Africa',
  NE: 'Africa', NG: 'Africa', RW: 'Africa', ST: 'Africa', SN: 'Africa', SC: 'Africa',
  SL: 'Africa', SO: 'Africa', ZA: 'Africa', SS: 'Africa', SD: 'Africa', SZ: 'Africa',
  TZ: 'Africa', TG: 'Africa', TN: 'Africa', UG: 'Africa', ZM: 'Africa', ZW: 'Africa',
  // Asia
  AF: 'Asia', AM: 'Asia', AZ: 'Asia', BH: 'Asia', BD: 'Asia', BT: 'Asia', BN: 'Asia',
  KH: 'Asia', CN: 'Asia', CY: 'Asia', GE: 'Asia', IN: 'Asia', ID: 'Asia', IR: 'Asia',
  IQ: 'Asia', IL: 'Asia', JP: 'Asia', JO: 'Asia', KZ: 'Asia', KW: 'Asia', KG: 'Asia',
  LA: 'Asia', LB: 'Asia', MY: 'Asia', MV: 'Asia', MN: 'Asia', MM: 'Asia', NP: 'Asia',
  KP: 'Asia', OM: 'Asia', PK: 'Asia', PH: 'Asia', QA: 'Asia', SA: 'Asia', SG: 'Asia',
  KR: 'Asia', LK: 'Asia', SY: 'Asia', TW: 'Asia', TJ: 'Asia', TH: 'Asia', TL: 'Asia',
  TR: 'Asia', TM: 'Asia', AE: 'Asia', UZ: 'Asia', VN: 'Asia', YE: 'Asia',
  // Europe
  AL: 'Europe', AD: 'Europe', AT: 'Europe', BY: 'Europe', BE: 'Europe', BA: 'Europe',
  BG: 'Europe', HR: 'Europe', CZ: 'Europe', DK: 'Europe', EE: 'Europe', FI: 'Europe',
  FR: 'Europe', DE: 'Europe', GR: 'Europe', HU: 'Europe', IS: 'Europe', IE: 'Europe',
  IT: 'Europe', XK: 'Europe', LV: 'Europe', LI: 'Europe', LT: 'Europe', LU: 'Europe',
  MT: 'Europe', MD: 'Europe', MC: 'Europe', ME: 'Europe', NL: 'Europe', MK: 'Europe',
  NO: 'Europe', PL: 'Europe', PT: 'Europe', RO: 'Europe', RU: 'Europe', SM: 'Europe',
  RS: 'Europe', SK: 'Europe', SI: 'Europe', ES: 'Europe', SE: 'Europe', CH: 'Europe',
  UA: 'Europe', GB: 'Europe', VA: 'Europe',
  // North America
  AG: 'North America', BS: 'North America', BB: 'North America', BZ: 'North America',
  CA: 'North America', CR: 'North America', CU: 'North America', DM: 'North America',
  DO: 'North America', SV: 'North America', GD: 'North America', GT: 'North America',
  HT: 'North America', HN: 'North America', JM: 'North America', MX: 'North America',
  NI: 'North America', PA: 'North America', KN: 'North America', LC: 'North America',
  VC: 'North America', TT: 'North America', US: 'North America',
  // South America
  AR: 'South America', BO: 'South America', BR: 'South America', CL: 'South America',
  CO: 'South America', EC: 'South America', GY: 'South America', PY: 'South America',
  PE: 'South America', SR: 'South America', UY: 'South America', VE: 'South America',
  // Oceania
  AU: 'Oceania', FJ: 'Oceania', KI: 'Oceania', MH: 'Oceania', FM: 'Oceania',
  NR: 'Oceania', NZ: 'Oceania', PW: 'Oceania', PG: 'Oceania', WS: 'Oceania',
  SB: 'Oceania', TO: 'Oceania', TV: 'Oceania', VU: 'Oceania',
  // Antarctica
  AQ: 'Antarctica',
}

// ---------------------------------------------------------------------------
// getTravelStats
// ---------------------------------------------------------------------------

export async function getTravelStats(userId: string): Promise<TravelStats> {
  const { data, error } = await supabase.rpc('get_travel_stats', { p_user_id: userId })

  if (error) throw handleSupabaseError(error)
  return data as TravelStats
}

// ---------------------------------------------------------------------------
// getContinentProgress
// ---------------------------------------------------------------------------

export interface ContinentProgress {
  continent: string
  countriesVisited: number
  totalCountries: number
  percentage: number
}

export async function getContinentProgress(userId: string): Promise<ContinentProgress[]> {
  const { data, error } = await supabase
    .from('visited_places')
    .select('country_code, category')
    .eq('user_id', userId)
    .eq('category', 'been')

  if (error) throw handleSupabaseError(error)

  const visitedCountries = new Set(
    ((data ?? []) as Pick<VisitedPlace, 'country_code'>[]).map((p) => p.country_code),
  )

  // Count total countries per continent
  const continentTotals = new Map<string, number>()
  for (const continent of Object.values(CONTINENT_MAP)) {
    continentTotals.set(continent, (continentTotals.get(continent) ?? 0) + 1)
  }

  // Count visited countries per continent
  const continentVisited = new Map<string, number>()
  for (const countryCode of visitedCountries) {
    const continent = CONTINENT_MAP[countryCode]
    if (continent) {
      continentVisited.set(continent, (continentVisited.get(continent) ?? 0) + 1)
    }
  }

  return Array.from(continentTotals.entries()).map(([continent, totalCountries]) => {
    const countriesVisited = continentVisited.get(continent) ?? 0
    return {
      continent,
      countriesVisited,
      totalCountries,
      percentage: totalCountries > 0 ? Math.round((countriesVisited / totalCountries) * 100) : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// getWorldExplorePercent — pure computation
// ---------------------------------------------------------------------------

const TOTAL_COUNTRIES = 195

export function getWorldExplorePercent(stats: TravelStats): number {
  if (stats.countries_visited === 0) return 0
  return Math.round((stats.countries_visited / TOTAL_COUNTRIES) * 100 * 10) / 10
}
