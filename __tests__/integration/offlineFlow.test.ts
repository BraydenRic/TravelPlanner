/**
 * Integration: offline queue sync flow
 *
 * Tests the complete offline-first pipeline:
 *   enqueue operations while offline → queue persists → sync on reconnect → error/retry handling.
 *
 * Mocks: AsyncStorage, Supabase.
 */

import { createClient } from '@supabase/supabase-js'
import {
  enqueueOperation,
  getQueue,
  syncQueue,
  type QueuedOperation,
} from '@lib/offline'

// ---------------------------------------------------------------------------
// AsyncStorage mock
// ---------------------------------------------------------------------------

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

const AsyncStorage = require('@react-native-async-storage/async-storage')

// ---------------------------------------------------------------------------
// NetInfo mock
// ---------------------------------------------------------------------------

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()), // returns unsubscribe fn
}))

// ---------------------------------------------------------------------------
// Supabase mock setup
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
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn((resolve, reject) => resolved.then(resolve, reject)),
  }
  return chain
}

// Helper: set the AsyncStorage queue
function setStoredQueue(queue: QueuedOperation[]) {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue))
}

function clearStoredQueue() {
  AsyncStorage.getItem.mockResolvedValue(null)
}

beforeEach(() => {
  jest.clearAllMocks()
  clearStoredQueue()
  AsyncStorage.setItem.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// enqueueOperation
// ---------------------------------------------------------------------------

describe('Offline queue — enqueueOperation', () => {
  it('adds an operation to AsyncStorage', async () => {
    clearStoredQueue()

    await enqueueOperation({ type: 'CREATE_PLACE', payload: { country_code: 'JP' } })

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'driftmark_offline_queue',
      expect.stringContaining('CREATE_PLACE'),
    )
  })

  it('generates a unique id and sets retryCount to 0', async () => {
    clearStoredQueue()

    await enqueueOperation({ type: 'CREATE_PLACE', payload: { country_code: 'JP' } })

    const stored = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1] as string,
    ) as QueuedOperation[]

    expect(stored).toHaveLength(1)
    expect(stored[0]?.id).toBeDefined()
    expect(stored[0]?.retryCount).toBe(0)
    expect(stored[0]?.createdAt).toBeGreaterThan(0)
  })

  it('appends to an existing queue', async () => {
    const existing: QueuedOperation[] = [
      { id: 'op-1', type: 'CREATE_PLACE', payload: {}, createdAt: Date.now(), retryCount: 0 },
    ]
    setStoredQueue(existing)

    await enqueueOperation({ type: 'UPDATE_PLACE', payload: { id: 'place-1' } })

    const stored = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1] as string,
    ) as QueuedOperation[]

    expect(stored).toHaveLength(2)
    expect(stored[0]?.type).toBe('CREATE_PLACE')
    expect(stored[1]?.type).toBe('UPDATE_PLACE')
  })
})

// ---------------------------------------------------------------------------
// getQueue
// ---------------------------------------------------------------------------

describe('Offline queue — getQueue', () => {
  it('returns empty array when AsyncStorage has nothing', async () => {
    clearStoredQueue()
    const queue = await getQueue()
    expect(queue).toEqual([])
  })

  it('parses and returns stored queue', async () => {
    const ops: QueuedOperation[] = [
      { id: 'op-1', type: 'CREATE_PLACE', payload: {}, createdAt: Date.now(), retryCount: 0 },
      { id: 'op-2', type: 'UPDATE_PLACE', payload: { id: 'x' }, createdAt: Date.now(), retryCount: 1 },
    ]
    setStoredQueue(ops)

    const queue = await getQueue()
    expect(queue).toHaveLength(2)
    expect(queue[0]?.type).toBe('CREATE_PLACE')
    expect(queue[1]?.type).toBe('UPDATE_PLACE')
  })
})

// ---------------------------------------------------------------------------
// syncQueue — empty queue
// ---------------------------------------------------------------------------

describe('Offline queue — syncQueue with empty queue', () => {
  it('returns {succeeded:0, failed:0} when queue is empty', async () => {
    clearStoredQueue()
    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 0 })
  })
})

// ---------------------------------------------------------------------------
// syncQueue — successful operation
// ---------------------------------------------------------------------------

describe('Offline queue — syncQueue success', () => {
  it('executes CREATE_PLACE and returns {succeeded:1, failed:0}', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', category: 'been', user_id: 'user-123' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null }))

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 1, failed: 0 })
  })

  it('queue is empty after successful sync', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])
    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null }))

    await syncQueue()

    const savedQueue = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)?.[1] as string,
    ) as QueuedOperation[]

    expect(savedQueue).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// syncQueue — failing operation → retryCount increments
// ---------------------------------------------------------------------------

describe('Offline queue — syncQueue failure and retry', () => {
  it('increments retryCount when operation fails and keeps it in queue', async () => {
    const op: QueuedOperation = {
      id: 'op-retry',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    getMockFrom().mockReturnValueOnce(
      mockChain({ data: null, error: { code: '42501', message: 'network error' } }),
    )

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 0 }) // not dropped, not succeeded

    const savedQueue = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)?.[1] as string,
    ) as QueuedOperation[]

    expect(savedQueue).toHaveLength(1)
    expect(savedQueue[0]?.retryCount).toBe(1)
  })

  it('drops operation after 3 failures and returns {succeeded:0, failed:1}', async () => {
    const op: QueuedOperation = {
      id: 'op-drop',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP' },
      createdAt: Date.now(),
      retryCount: 3, // already at MAX_RETRIES
    }
    setStoredQueue([op])

    getMockFrom().mockReturnValueOnce(
      mockChain({ data: null, error: { code: '42501', message: 'still failing' } }),
    )

    const result = await syncQueue()
    expect(result).toEqual({ succeeded: 0, failed: 1 })

    const savedQueue = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)?.[1] as string,
    ) as QueuedOperation[]

    expect(savedQueue).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// executeOperation — correct Supabase calls per type
// ---------------------------------------------------------------------------

describe('Offline queue — executeOperation routing', () => {
  it('CREATE_PLACE calls supabase.from(visited_places).insert()', async () => {
    const op: QueuedOperation = {
      id: 'op-create',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-123' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(getMockFrom()).toHaveBeenCalledWith('visited_places')
    expect(chain.insert).toHaveBeenCalledWith({ country_code: 'JP', user_id: 'user-123' })
  })

  it('UPDATE_PLACE calls .update().eq("id", ...)', async () => {
    const op: QueuedOperation = {
      id: 'op-update',
      type: 'UPDATE_PLACE',
      payload: { id: 'place-xyz', review: 'Updated' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(chain.update).toHaveBeenCalledWith({ review: 'Updated' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'place-xyz')
  })

  it('DELETE_PLACE calls .delete().eq("id", ...)', async () => {
    const op: QueuedOperation = {
      id: 'op-delete',
      type: 'DELETE_PLACE',
      payload: { id: 'place-del' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    setStoredQueue([op])

    const chain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(chain)

    await syncQueue()

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'place-del')
  })
})

// ---------------------------------------------------------------------------
// Queue persists across restarts (AsyncStorage)
// ---------------------------------------------------------------------------

describe('Offline queue — persistence across restarts', () => {
  it('queue survives simulated restart by reading from AsyncStorage', async () => {
    const ops: QueuedOperation[] = [
      { id: 'op-persist-1', type: 'CREATE_PLACE', payload: {}, createdAt: Date.now(), retryCount: 0 },
      { id: 'op-persist-2', type: 'UPDATE_PLACE', payload: { id: 'p1' }, createdAt: Date.now(), retryCount: 0 },
    ]
    setStoredQueue(ops)

    // Simulate new session reading the queue
    const queue = await getQueue()
    expect(queue).toHaveLength(2)
    expect(queue[0]?.id).toBe('op-persist-1')
    expect(queue[1]?.id).toBe('op-persist-2')
  })
})
