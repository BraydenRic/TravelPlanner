/**
 * Unit tests — offline queue (src/lib/offline.ts)
 *
 * Tests queue operations, syncQueue logic, and executeOperation routing
 * in isolation with a fully mocked AsyncStorage and Supabase.
 */

import { createClient } from '@supabase/supabase-js'
import {
  enqueueOperation,
  getQueue,
  syncQueue,
  type QueuedOperation,
} from '@lib/offline'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}))

const AsyncStorage = require('@react-native-async-storage/async-storage')

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

const mockSupabase = (() => {
  const mockCreate = createClient as jest.Mock
  return mockCreate.mock.results[0]?.value ?? mockCreate('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function buildChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result)
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    // Thenable: await chain (or any chain ending without .single()) resolves to result
    then: jest.fn((resolve: (v: unknown) => unknown, reject?: (e: unknown) => void) =>
      resolved.then(resolve, reject)),
  }
  return chain
}

// ---------------------------------------------------------------------------
// AsyncStorage helpers
// ---------------------------------------------------------------------------

function setStoredQueue(queue: QueuedOperation[]) {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue))
}

function clearStoredQueue() {
  AsyncStorage.getItem.mockResolvedValue(null)
}

function getLastSavedQueue(): QueuedOperation[] {
  const calls = (AsyncStorage.setItem as jest.Mock).mock.calls
  if (calls.length === 0) return []
  return JSON.parse(calls.at(-1)?.[1] as string) as QueuedOperation[]
}

beforeEach(() => {
  jest.clearAllMocks()
  clearStoredQueue()
  AsyncStorage.setItem.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// enqueueOperation
// ---------------------------------------------------------------------------

describe('offline — enqueueOperation', () => {
  it('adds operation to AsyncStorage queue', async () => {
    await enqueueOperation({ type: 'CREATE_PLACE', payload: { country_code: 'JP' } })

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'driftmark_offline_queue',
      expect.stringContaining('CREATE_PLACE'),
    )
  })

  it('generates an id string and sets retryCount to 0', async () => {
    await enqueueOperation({ type: 'UPDATE_PLACE', payload: { id: 'p1', review: 'nice' } })

    const saved = getLastSavedQueue()
    expect(saved).toHaveLength(1)
    expect(typeof saved[0]?.id).toBe('string')
    expect(saved[0]?.id.length).toBeGreaterThan(0)
    expect(saved[0]?.retryCount).toBe(0)
  })

  it('sets createdAt to a positive number (timestamp)', async () => {
    const before = Date.now()
    await enqueueOperation({ type: 'DELETE_PLACE', payload: { id: 'p1' } })
    const after = Date.now()

    const saved = getLastSavedQueue()
    expect(saved[0]?.createdAt).toBeGreaterThanOrEqual(before)
    expect(saved[0]?.createdAt).toBeLessThanOrEqual(after)
  })
})

// ---------------------------------------------------------------------------
// getQueue
// ---------------------------------------------------------------------------

describe('offline — getQueue', () => {
  it('returns empty array when nothing is stored', async () => {
    clearStoredQueue()
    const q = await getQueue()
    expect(q).toEqual([])
  })

  it('parses stored JSON and returns typed QueuedOperation[]', async () => {
    const ops: QueuedOperation[] = [
      { id: 'a', type: 'CREATE_PLACE', payload: {}, createdAt: 1000, retryCount: 0 },
    ]
    setStoredQueue(ops)

    const q = await getQueue()
    expect(q).toHaveLength(1)
    expect(q[0]?.type).toBe('CREATE_PLACE')
  })
})

// ---------------------------------------------------------------------------
// syncQueue — empty
// ---------------------------------------------------------------------------

describe('offline — syncQueue with empty queue', () => {
  it('returns {succeeded:0, failed:0}', async () => {
    clearStoredQueue()
    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 0 })
  })
})

// ---------------------------------------------------------------------------
// syncQueue — 1 successful operation
// ---------------------------------------------------------------------------

describe('offline — syncQueue with 1 successful op', () => {
  it('returns {succeeded:1, failed:0} and empties queue', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])
    getMockFrom().mockReturnValueOnce(buildChain({ data: null, error: null }))

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 1, failed: 0 })
    expect(getLastSavedQueue()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// syncQueue — 1 failing op: retryCount increments
// ---------------------------------------------------------------------------

describe('offline — syncQueue with 1 failing op', () => {
  it('increments retryCount and keeps op in queue', async () => {
    const op: QueuedOperation = {
      id: 'op-fail',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])
    getMockFrom().mockReturnValueOnce(
      buildChain({ data: null, error: { code: 'NET', message: 'timeout' } }),
    )

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 0 }) // not dropped, not succeeded

    const remaining = getLastSavedQueue()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.retryCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// After 3 failures: op is dropped
// ---------------------------------------------------------------------------

describe('offline — after MAX_RETRIES failures', () => {
  it('drops op from queue and returns {succeeded:0, failed:1}', async () => {
    const op: QueuedOperation = {
      id: 'op-max',
      type: 'CREATE_PLACE',
      payload: {},
      createdAt: Date.now(),
      retryCount: 3, // already at MAX_RETRIES
    }
    setStoredQueue([op])
    getMockFrom().mockReturnValueOnce(
      buildChain({ data: null, error: { code: 'ERR', message: 'still broken' } }),
    )

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 1 })
    expect(getLastSavedQueue()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// executeOperation CREATE_PLACE
// ---------------------------------------------------------------------------

describe('offline — executeOperation CREATE_PLACE', () => {
  it('calls supabase.from(visited_places).insert(payload)', async () => {
    const op: QueuedOperation = {
      id: 'op-c',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-1' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = buildChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(getMockFrom()).toHaveBeenCalledWith('visited_places')
    expect(chain.insert).toHaveBeenCalledWith({ country_code: 'JP', user_id: 'user-1' })
  })
})

// ---------------------------------------------------------------------------
// executeOperation UPDATE_PLACE
// ---------------------------------------------------------------------------

describe('offline — executeOperation UPDATE_PLACE', () => {
  it('calls .update(data).eq("id", id)', async () => {
    const op: QueuedOperation = {
      id: 'op-u',
      type: 'UPDATE_PLACE',
      payload: { id: 'place-xyz', review: 'Updated text' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = buildChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(chain.update).toHaveBeenCalledWith({ review: 'Updated text' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'place-xyz')
  })
})

// ---------------------------------------------------------------------------
// executeOperation DELETE_PLACE
// ---------------------------------------------------------------------------

describe('offline — executeOperation DELETE_PLACE', () => {
  it('calls .delete().eq("id", id)', async () => {
    const op: QueuedOperation = {
      id: 'op-d',
      type: 'DELETE_PLACE',
      payload: { id: 'place-del' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = buildChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'place-del')
  })
})

// ---------------------------------------------------------------------------
// Multiple ops in one sync pass
// ---------------------------------------------------------------------------

describe('offline — syncQueue with multiple operations', () => {
  it('processes all ops and returns correct totals', async () => {
    const ops: QueuedOperation[] = [
      { id: 'op-1', type: 'CREATE_PLACE', payload: {}, createdAt: Date.now(), retryCount: 0 },
      { id: 'op-2', type: 'DELETE_PLACE', payload: { id: 'p1' }, createdAt: Date.now(), retryCount: 0 },
      { id: 'op-3', type: 'UPDATE_PLACE', payload: { id: 'p2' }, createdAt: Date.now(), retryCount: 0 },
    ]
    setStoredQueue(ops)

    getMockFrom().mockReturnValue(buildChain({ data: null, error: null }))

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 3, failed: 0 })
  })

  it('handles mixed success/failure correctly', async () => {
    const ops: QueuedOperation[] = [
      { id: 'ok', type: 'CREATE_PLACE', payload: {}, createdAt: Date.now(), retryCount: 0 },
      { id: 'fail', type: 'DELETE_PLACE', payload: { id: 'p1' }, createdAt: Date.now(), retryCount: 3 },
    ]
    setStoredQueue(ops)

    getMockFrom()
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // ok
      .mockReturnValueOnce(buildChain({ data: null, error: { code: 'E', message: 'fail' } })) // fail → drop

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 1, failed: 1 })
  })
})
