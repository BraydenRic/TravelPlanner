/**
 * Performance: cursor-based pagination
 *
 * Verifies the getPlaces service returns correct pagination metadata
 * and that cursor-based pages do not contain overlapping items.
 */

import { createClient } from '@supabase/supabase-js'
import { getPlaces } from '@services/places'
import { createMockPlace } from '@/../__tests__/factories'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockSupabase = (() => {
  const mockCreate = createClient as jest.Mock
  return mockCreate.mock.results[0]?.value ?? mockCreate('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result)
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn((resolve, reject) => resolved.then(resolve, reject)),
  }
  return chain
}

/**
 * Creates `count` mock places with descending created_at timestamps.
 * The getPlaces service fetches limit+1 items to detect hasMore; the mock
 * must return that extra item when there are more pages.
 */
function createMockPlaces(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createMockPlace({
      id: `place-${i}`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Returns cursor for non-last page
// ---------------------------------------------------------------------------

describe('Pagination — non-last page', () => {
  it('returns cursor when more items exist beyond the page size', async () => {
    // getPlaces requests limit+1; mock returns 21 items for a limit=20 request
    const places = createMockPlaces(21)
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123', undefined, undefined, 20)

    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).not.toBeNull()
    expect(result.hasMore).toBe(true)
  })

  it('nextCursor is the created_at of the last item on the page', async () => {
    const places = createMockPlaces(21)
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123', undefined, undefined, 20)

    // The 20th item (index 19) should be the cursor value
    expect(result.nextCursor).toBe(places[19]?.created_at)
  })
})

// ---------------------------------------------------------------------------
// Returns null cursor on last page
// ---------------------------------------------------------------------------

describe('Pagination — last page', () => {
  it('returns null cursor when fewer items than page size are returned', async () => {
    const places = createMockPlaces(15)
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123')

    expect(result.data).toHaveLength(15)
    expect(result.nextCursor).toBeNull()
    expect(result.hasMore).toBe(false)
  })

  it('returns null cursor for exactly page-size items (no extra item fetched)', async () => {
    // Exactly 20 items — no 21st item means no more pages
    const places = createMockPlaces(20)
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123', undefined, undefined, 20)

    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBeNull()
    expect(result.hasMore).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Cursor-based: second page does not repeat items
// ---------------------------------------------------------------------------

describe('Pagination — no overlap between pages', () => {
  it('second page does not contain any items from first page', async () => {
    const page1Items = createMockPlaces(21) // 20 returned + 1 to detect hasMore
    const page2Items = createMockPlaces(5).map((p) => ({
      ...p,
      id: `page2-${p.id}`,
      created_at: new Date(Date.now() - 21 * 1000 - parseInt(p.id.split('-')[1]!) * 1000).toISOString(),
    }))

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: page1Items, error: null }))
      .mockReturnValueOnce(mockChain({ data: page2Items, error: null }))

    const first = await getPlaces('user-123', undefined, undefined, 20)
    const second = await getPlaces('user-123', undefined, first.nextCursor!, 20)

    const firstIds = new Set(first.data.map((p) => p.id))
    const overlap = second.data.filter((p) => firstIds.has(p.id))

    expect(overlap).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Pagination with category filter
// ---------------------------------------------------------------------------

describe('Pagination — category filter', () => {
  it('applies category filter before pagination', async () => {
    const chain = mockChain({ data: [], error: null })
    getMockFrom().mockReturnValue(chain)

    await getPlaces('user-123', 'been', undefined, 20)

    expect(chain.eq).toHaveBeenCalledWith('category', 'been')
  })

  it('applies cursor filter when cursor is provided', async () => {
    const chain = mockChain({ data: [], error: null })
    getMockFrom().mockReturnValue(chain)

    const cursor = '2024-06-01T00:00:00Z'
    await getPlaces('user-123', undefined, cursor, 20)

    expect(chain.lt).toHaveBeenCalledWith('created_at', cursor)
  })
})

// ---------------------------------------------------------------------------
// Empty dataset
// ---------------------------------------------------------------------------

describe('Pagination — empty dataset', () => {
  it('returns empty data, null cursor, hasMore false for empty DB', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getPlaces('user-123')

    expect(result.data).toHaveLength(0)
    expect(result.nextCursor).toBeNull()
    expect(result.hasMore).toBe(false)
  })
})
