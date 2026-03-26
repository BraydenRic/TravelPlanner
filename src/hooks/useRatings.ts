/**
 * useRatings — Rating form state and live score computation.
 */

import { useCallback, useMemo, useState } from 'react'
import type { RatingCategory } from '@typedefs/database'
import { computeOverallScore } from '@services/ratings'
import { useAuthStore } from '@stores/authStore'
import { upsertPlaceRatings } from '@services/ratings'

type LocalRatings = Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>

interface UseRatingsOptions {
  visitedPlaceId: string
  initialRatings?: LocalRatings
}

export function useRatings({ visitedPlaceId, initialRatings = {} }: UseRatingsOptions) {
  const { user } = useAuthStore()
  const [localRatings, setLocalRatings] = useState<LocalRatings>(initialRatings)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overallScore = useMemo(
    () => computeOverallScore(localRatings),
    [localRatings],
  )

  const handleRatingChange = useCallback(
    (category: RatingCategory, score: number) => {
      setLocalRatings((prev) => ({
        ...prev,
        [category]: score as 1 | 2 | 3 | 4 | 5,
      }))
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    if (!user) return
    setIsSaving(true)
    setError(null)
    try {
      await upsertPlaceRatings(visitedPlaceId, user.id, localRatings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ratings')
    } finally {
      setIsSaving(false)
    }
  }, [user, visitedPlaceId, localRatings])

  const ratedCount = useMemo(
    () => Object.values(localRatings).filter(Boolean).length,
    [localRatings],
  )

  return {
    localRatings,
    overallScore,
    ratedCount,
    isSaving,
    error,
    handleRatingChange,
    handleSubmit,
  }
}
