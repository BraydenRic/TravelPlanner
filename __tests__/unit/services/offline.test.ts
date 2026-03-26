import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { enqueueOperation, getQueue, syncQueue } from '@lib/offline'
import type { QueuedOperation } from '@lib/offline'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}))

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }
  // Make the last call in the chain resolve
  ;(chain.eq as jest.Mock).mockResolvedValue(finalResult)
  ;(chain.insert as jest.Mock).mockResolvedValue(finalResult)
  ;(chain.upsert as jest.Mock).mockResolvedValue(finalResult)
  return chain
}

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  // Default: empty queue
  mockGetItem.mockResolvedValue(null)
  mockSetItem.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// enqueueOperation
// ---------------------------------------------------------------------------

describe('enqueueOperation', () => {
  it('adds operation to the queue', async () => {
    mockGetItem.mockResolvedValueOnce(null) // empty queue

    await enqueueOperation({
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', category: 'been' },
    })

    expect(mockSetItem).toHaveBeenCalledWith(
      'driftmark_offline_queue',
      expect.stringContaining('"type":"CREATE_PLACE"'),
    )
  })

  it('appends to existing queue', async () => {
    const existingOp: QueuedOperation = {
      id: 'existing-1',
      type: 'DELETE_PLACE',
      payload: { id: 'place-1' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    mockGetItem.mockResolvedValueOnce(JSON.stringify([existingOp]))

    await enqueueOperation({
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', category: 'been' },
    })

    const saved = JSON.parse(
      (mockSetItem.mock.calls[0] as [string, string])[1],
    ) as QueuedOperation[]
    expect(saved).toHaveLength(2)
    expect(saved[0]?.id).toBe('existing-1')
    expect(saved[1]?.type).toBe('CREATE_PLACE')
  })
})

// ---------------------------------------------------------------------------
// syncQueue
// ---------------------------------------------------------------------------

describe('syncQueue', () => {
  it('returns { succeeded: 0, failed: 0 } for empty queue', async () => {
    mockGetItem.mockResolvedValueOnce(null)

    const result = await syncQueue()

    expect(result).toEqual({ succeeded: 0, failed: 0 })
  })

  it('processes queue and removes successful operations', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-123', category: 'been' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    mockGetItem.mockResolvedValueOnce(JSON.stringify([op]))

    getMockFrom().mockReturnValue(mockChain({ data: null, error: null }))

    const result = await syncQueue()

    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(0)

    // Queue should be empty after success
    const savedQueue = JSON.parse(
      (mockSetItem.mock.calls[0] as [string, string])[1],
    ) as QueuedOperation[]
    expect(savedQueue).toHaveLength(0)
  })

  it('increments retryCount on failure and keeps in queue', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-123', category: 'been' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    mockGetItem.mockResolvedValueOnce(JSON.stringify([op]))

    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'UNKNOWN', message: 'network error' } }),
    )

    // Make insert reject
    const chain = getMockFrom()()
    ;(chain.insert as jest.Mock).mockRejectedValue(new Error('Network error'))
    getMockFrom().mockReturnValue(chain)

    await syncQueue()

    const savedQueue = JSON.parse(
      (mockSetItem.mock.calls[0] as [string, string])[1],
    ) as QueuedOperation[]

    expect(savedQueue).toHaveLength(1)
    expect(savedQueue[0]?.retryCount).toBe(1)
  })

  it('drops operation after MAX_RETRIES (3) failures', async () => {
    const op: QueuedOperation = {
      id: 'op-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-123', category: 'been' },
      createdAt: Date.now(),
      retryCount: 3, // already at max
    }
    mockGetItem.mockResolvedValueOnce(JSON.stringify([op]))

    const chain = {
      insert: jest.fn().mockRejectedValue(new Error('Still failing')),
      from: jest.fn(),
    }
    getMockFrom().mockReturnValue(chain)

    const result = await syncQueue()

    expect(result.failed).toBe(1)

    // Should be dropped from queue
    const savedQueue = JSON.parse(
      (mockSetItem.mock.calls[0] as [string, string])[1],
    ) as QueuedOperation[]
    expect(savedQueue).toHaveLength(0)
  })

  it('handles mixed success and failure in same sync pass', async () => {
    const successOp: QueuedOperation = {
      id: 'success-1',
      type: 'DELETE_PLACE',
      payload: { id: 'place-1' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    const failOp: QueuedOperation = {
      id: 'fail-1',
      type: 'CREATE_PLACE',
      payload: { country_code: 'JP', user_id: 'user-123', category: 'been' },
      createdAt: Date.now(),
      retryCount: 0,
    }
    mockGetItem.mockResolvedValueOnce(JSON.stringify([successOp, failOp]))

    // First call (DELETE_PLACE) succeeds, second (CREATE_PLACE) fails
    getMockFrom()
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockRejectedValue(new Error('Create failed')),
      })

    const result = await syncQueue()

    expect(result.succeeded).toBe(1)
    // failOp has retryCount 0, so it stays in queue (not failed yet)
    expect(result.failed).toBe(0)

    const savedQueue = JSON.parse(
      (mockSetItem.mock.calls[0] as [string, string])[1],
    ) as QueuedOperation[]
    expect(savedQueue).toHaveLength(1)
    expect(savedQueue[0]?.id).toBe('fail-1')
    expect(savedQueue[0]?.retryCount).toBe(1)
  })
})
