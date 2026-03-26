/**
 * Reusable Supabase mock helpers for Driftmark tests.
 *
 * All service tests must mock Supabase — no real DB calls in any test file.
 * Import these helpers rather than hand-rolling per-test mocks.
 */

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable query object whose terminal method resolves to `result`.
 * Every method returns `this` so tests can assert individual call args.
 */
function buildChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  // Some chains end without calling .single()/.limit() — make the common
  // terminal methods resolve too so callers that await directly work.
  ;(chain.order as jest.Mock).mockResolvedValue(result)
  ;(chain.in as jest.Mock).mockResolvedValue(result)
  ;(chain.not as jest.Mock).mockResolvedValue(result)
  ;(chain.eq as jest.Mock).mockResolvedValue(result)
  ;(chain.delete as jest.Mock).mockResolvedValue(result)
  return chain
}

// ---------------------------------------------------------------------------
// getSupabaseMock
// ---------------------------------------------------------------------------

/**
 * Returns the singleton Supabase mock created by the jest.setup global mock.
 * Call this at the top of each test file to get a typed reference.
 *
 * @example
 * const supabase = getSupabaseMock()
 * ;(supabase.from as jest.Mock).mockReturnValue(mockChain({ data: [], error: null }))
 */
export function getSupabaseMock() {
  // The global mock in jest.setup.ts calls createClient once at module load time.
  // We retrieve that same instance here.
  const mockCreate = createClient as jest.Mock
  return mockCreate.mock.results[0]?.value ?? mockCreate('', '')
}

// ---------------------------------------------------------------------------
// mockSupabaseSuccess
// ---------------------------------------------------------------------------

/**
 * Configures the Supabase mock so the next `.from()` call returns a chain
 * that resolves `data` with no error.
 *
 * @param data   The payload to return from the mock query.
 * @returns      The mock Supabase client (for chaining further setup).
 */
export function mockSupabaseSuccess<T>(data: T) {
  const mock = getSupabaseMock()
  const chain = buildChain({ data, error: null })
  ;(mock.from as jest.Mock).mockReturnValue(chain)
  return mock
}

// ---------------------------------------------------------------------------
// mockSupabaseError
// ---------------------------------------------------------------------------

/**
 * Configures the Supabase mock so the next `.from()` call returns a chain
 * that resolves with a Supabase-shaped error object.
 *
 * @param code     Supabase / PostgREST error code (e.g. 'PGRST116', '42501').
 * @param message  Human-readable error message.
 */
export function mockSupabaseError(code: string, message: string) {
  const mock = getSupabaseMock()
  const chain = buildChain({ data: null, error: { code, message } })
  ;(mock.from as jest.Mock).mockReturnValue(chain)
  return mock
}

// ---------------------------------------------------------------------------
// mockSupabaseSequence
// ---------------------------------------------------------------------------

/**
 * Configures the Supabase mock so successive `.from()` calls return chains
 * with the provided results in order.
 *
 * Useful when a service performs multiple queries (e.g. ownership check then
 * the actual write).
 *
 * @param results  Array of `{ data, error }` objects, consumed in order.
 */
export function mockSupabaseSequence(results: Array<{ data: unknown; error: unknown }>) {
  const mock = getSupabaseMock()
  const mockFrom = mock.from as jest.Mock
  results.forEach((result) => {
    mockFrom.mockReturnValueOnce(buildChain(result))
  })
  return mock
}

// ---------------------------------------------------------------------------
// mockPaginatedResponse
// ---------------------------------------------------------------------------

/**
 * Returns a subset of `items` matching the given page / pageSize, plus a
 * `count` and `hasMore` indicator. Pass the returned `data` field to
 * `mockSupabaseSuccess` for pagination tests.
 *
 * @param items     Full item list (as if returned by DB without pagination).
 * @param page      Zero-indexed page number.
 * @param pageSize  Items per page.
 */
export function mockPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
): { data: T[]; error: null; count: number; hasMore: boolean } {
  const start = page * pageSize
  const end = start + pageSize
  const pageItems = items.slice(start, end)
  const hasMore = end < items.length
  return { data: pageItems, error: null, count: items.length, hasMore }
}

// ---------------------------------------------------------------------------
// mockRpcSuccess / mockRpcError
// ---------------------------------------------------------------------------

/**
 * Configures the Supabase mock RPC to resolve with `data`.
 */
export function mockRpcSuccess<T>(data: T) {
  const mock = getSupabaseMock()
  ;(mock.rpc as jest.Mock).mockResolvedValueOnce({ data, error: null })
  return mock
}

/**
 * Configures the Supabase mock RPC to resolve with an error.
 */
export function mockRpcError(code: string, message: string) {
  const mock = getSupabaseMock()
  ;(mock.rpc as jest.Mock).mockResolvedValueOnce({
    data: null,
    error: { code, message },
  })
  return mock
}

// ---------------------------------------------------------------------------
// mockStorageSuccess / mockStorageError
// ---------------------------------------------------------------------------

/**
 * Configures the Supabase storage mock so `.upload()` resolves successfully.
 */
export function mockStorageUploadSuccess() {
  const mock = getSupabaseMock()
  const storageBucket = {
    upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
    download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url/photo.jpg' } }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://mock.url/signed-photo.jpg' },
      error: null,
    }),
  }
  ;(mock.storage.from as jest.Mock).mockReturnValue(storageBucket)
  return { mock, storageBucket }
}

/**
 * Configures the Supabase storage mock so `.upload()` returns an error.
 */
export function mockStorageUploadError(code: string, message: string) {
  const mock = getSupabaseMock()
  const storageBucket = {
    upload: jest.fn().mockResolvedValue({ data: null, error: { code, message } }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { code, message } }),
  }
  ;(mock.storage.from as jest.Mock).mockReturnValue(storageBucket)
  return { mock, storageBucket }
}

// ---------------------------------------------------------------------------
// Re-export buildChain for tests that need a custom chain
// ---------------------------------------------------------------------------

export { buildChain as mockChain }
