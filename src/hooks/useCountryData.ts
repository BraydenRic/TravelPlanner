/**
 * useCountryData — Fetches and caches country drill-down data.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CityCityStatus } from '@typedefs/api'
import type { RatingCategory } from '@typedefs/database'
import { useAuthStore } from '@stores/authStore'

interface CountryData {
  cities: CityCityStatus[]
  countryRatings: {
    overall_score: number
    categories: Record<RatingCategory, number>
    cities_rated: number
    total_cities: number
  } | null
}

// Simple in-memory cache keyed by countryCode+userId
const cache = new Map<string, CountryData>()

export function useCountryData(countryCode: string | null) {
  const { user } = useAuthStore()
  const [data, setData] = useState<CountryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(async () => {
    if (!countryCode || !user) return

    const cacheKey = `${countryCode}:${user.id}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setData(cached)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      // In production: call supabase RPC get_country_city_status + compute_country_ratings
      // For now, return empty data structure
      const result: CountryData = {
        cities: [],
        countryRatings: null,
      }
      cache.set(cacheKey, result)
      setData(result)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [countryCode, user])

  useEffect(() => {
    void fetch()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}
