/**
 * Unit tests — realtime subscriptions (src/lib/realtime.ts)
 *
 * Tests channel lifecycle: subscribe, duplicate subscribe, unsubscribe, unsubscribeAll,
 * and the cleanup function returned by subscribeToGroup.
 *
 * The Supabase channel mock is already set up in jest.setup.ts.
 */

import { createClient } from '@supabase/supabase-js'
import {
  subscribeToGroup,
  unsubscribeFromGroup,
  unsubscribeAll,
} from '@lib/realtime'

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockSupabase = (() => {
  const mockCreate = createClient as jest.Mock
  return mockCreate.mock.results[0]?.value ?? mockCreate('', '')
})()

function buildMockChannel() {
  return {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  // Clear channels first (may call removeChannel internally), then reset mock call counts
  unsubscribeAll()
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// subscribeToGroup
// ---------------------------------------------------------------------------

describe('realtime — subscribeToGroup', () => {
  it('creates a channel with the correct group filter string', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    subscribeToGroup('group-123', {})

    expect(mockSupabase.channel).toHaveBeenCalledWith('group:group-123')
  })

  it('subscribes to group_places INSERT events with group_id filter', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    subscribeToGroup('group-123', {})

    // At least one .on() call should reference group_places with the group filter
    const onCalls = (mockChannel.on as jest.Mock).mock.calls
    const groupPlacesCall = onCalls.find(
      (args: unknown[]) =>
        typeof args[1] === 'object' &&
        args[1] !== null &&
        (args[1] as Record<string, unknown>).table === 'group_places',
    )
    expect(groupPlacesCall).toBeDefined()
    expect((groupPlacesCall![1] as Record<string, unknown>).filter).toBe('group_id=eq.group-123')
  })

  it('calls .subscribe() on the channel', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    subscribeToGroup('group-456', {})

    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('returns a cleanup function', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const cleanup = subscribeToGroup('group-789', {})

    expect(typeof cleanup).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Subscribing to the same group twice replaces the existing channel
// ---------------------------------------------------------------------------

describe('realtime — duplicate subscription', () => {
  it('subscribing twice for the same group removes the first channel', () => {
    const channel1 = buildMockChannel()
    const channel2 = buildMockChannel()

    ;(mockSupabase.channel as jest.Mock)
      .mockReturnValueOnce(channel1)
      .mockReturnValueOnce(channel2)

    subscribeToGroup('group-dup', {})
    subscribeToGroup('group-dup', {})

    // The first channel should have been removed when the second subscription was made
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel1)
  })

  it('does not stack up duplicate channels', () => {
    const channels = [buildMockChannel(), buildMockChannel(), buildMockChannel()]
    channels.forEach((ch) => (mockSupabase.channel as jest.Mock).mockReturnValueOnce(ch))

    subscribeToGroup('group-dup2', {})
    subscribeToGroup('group-dup2', {})
    subscribeToGroup('group-dup2', {})

    // After 3 subscriptions to the same group, removeChannel should have been
    // called twice (once for channel[0] when channel[1] subscribed,
    // once for channel[1] when channel[2] subscribed)
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// unsubscribeFromGroup
// ---------------------------------------------------------------------------

describe('realtime — unsubscribeFromGroup', () => {
  it('calls supabase.removeChannel with the correct channel', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    subscribeToGroup('group-unsub', {})
    unsubscribeFromGroup('group-unsub')

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('is a no-op for a group that was never subscribed', () => {
    unsubscribeFromGroup('nonexistent-group')
    expect(mockSupabase.removeChannel).not.toHaveBeenCalled()
  })

  it('does not remove channels for other groups', () => {
    const ch1 = buildMockChannel()
    const ch2 = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock)
      .mockReturnValueOnce(ch1)
      .mockReturnValueOnce(ch2)

    subscribeToGroup('group-A', {})
    subscribeToGroup('group-B', {})

    unsubscribeFromGroup('group-A')

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(ch1)
    expect(mockSupabase.removeChannel).not.toHaveBeenCalledWith(ch2)
  })
})

// ---------------------------------------------------------------------------
// unsubscribeAll
// ---------------------------------------------------------------------------

describe('realtime — unsubscribeAll', () => {
  it('removes all active channels', () => {
    const ch1 = buildMockChannel()
    const ch2 = buildMockChannel()
    const ch3 = buildMockChannel()

    ;(mockSupabase.channel as jest.Mock)
      .mockReturnValueOnce(ch1)
      .mockReturnValueOnce(ch2)
      .mockReturnValueOnce(ch3)

    subscribeToGroup('group-1', {})
    subscribeToGroup('group-2', {})
    subscribeToGroup('group-3', {})

    unsubscribeAll()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(ch1)
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(ch2)
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(ch3)
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(3)
  })

  it('is a no-op when no channels are active', () => {
    unsubscribeAll()
    expect(mockSupabase.removeChannel).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cleanup function returned from subscribeToGroup
// ---------------------------------------------------------------------------

describe('realtime — cleanup function', () => {
  it('calling the cleanup function unsubscribes from the group', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const cleanup = subscribeToGroup('group-cleanup', {})
    cleanup()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('cleanup called twice does not throw', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const cleanup = subscribeToGroup('group-cleanup2', {})
    cleanup()
    expect(() => cleanup()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Callbacks are invoked correctly
// ---------------------------------------------------------------------------

describe('realtime — callbacks', () => {
  it('registers onPlaceAdded, onMemberChanged, onRatingUpdated listeners', () => {
    const mockChannel = buildMockChannel()
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const callbacks = {
      onPlaceAdded: jest.fn(),
      onMemberChanged: jest.fn(),
      onRatingUpdated: jest.fn(),
    }

    subscribeToGroup('group-cb', callbacks)

    // .on() should have been called 3 times (once per callback type)
    expect(mockChannel.on).toHaveBeenCalledTimes(3)
  })

  it('invokes onPlaceAdded with full payload when group_places changes (INSERT or DELETE)', () => {
    const capturedCallbacks: Record<string, (payload: unknown) => void> = {}
    const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn((eventType: string, config: Record<string, unknown>, cb: (p: unknown) => void) => {
        if ((config as Record<string, unknown>).table === 'group_places') {
          capturedCallbacks.onPlaceAdded = cb
        }
        return mockChannel as unknown
      }),
      subscribe: jest.fn().mockReturnThis(),
    }
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const onPlaceAdded = jest.fn()
    subscribeToGroup('group-payload', { onPlaceAdded })

    // The subscription forwards the entire payload now so DELETE events
    // (which have no `new` row) can also trigger a map refresh.
    const payload = {
      eventType: 'INSERT',
      new: { id: 'place-1', group_id: 'group-payload', country_code: 'JP' },
    }
    capturedCallbacks.onPlaceAdded?.(payload)

    expect(onPlaceAdded).toHaveBeenCalledWith(payload)
  })

  it('invokes onMemberChanged with the full payload when group_members changes', () => {
    const capturedCallbacks: Record<string, (payload: unknown) => void> = {}
    const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn((eventType: string, config: Record<string, unknown>, cb: (p: unknown) => void) => {
        if ((config as Record<string, unknown>).table === 'group_members') {
          capturedCallbacks.onMemberChanged = cb
        }
        return mockChannel as unknown
      }),
      subscribe: jest.fn().mockReturnThis(),
    }
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const onMemberChanged = jest.fn()
    subscribeToGroup('group-member-cb', { onMemberChanged })

    const payload = { eventType: 'INSERT', new: { user_id: 'u1' } }
    capturedCallbacks.onMemberChanged?.(payload)

    expect(onMemberChanged).toHaveBeenCalledWith(payload)
  })

  it('invokes onRatingUpdated with the full payload when place_ratings changes', () => {
    const capturedCallbacks: Record<string, (payload: unknown) => void> = {}
    const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn((eventType: string, config: Record<string, unknown>, cb: (p: unknown) => void) => {
        if ((config as Record<string, unknown>).table === 'place_ratings') {
          capturedCallbacks.onRatingUpdated = cb
        }
        return mockChannel as unknown
      }),
      subscribe: jest.fn().mockReturnThis(),
    }
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    const onRatingUpdated = jest.fn()
    subscribeToGroup('group-rating-cb', { onRatingUpdated })

    const payload = { eventType: 'UPDATE', new: { score: 5 } }
    capturedCallbacks.onRatingUpdated?.(payload)

    expect(onRatingUpdated).toHaveBeenCalledWith(payload)
  })

  it('does not throw when callbacks are omitted and events fire', () => {
    const capturedCallbacks: Record<string, (payload: unknown) => void> = {}
    const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn((eventType: string, config: Record<string, unknown>, cb: (p: unknown) => void) => {
        const table = (config as Record<string, unknown>).table as string
        capturedCallbacks[table] = cb
        return mockChannel as unknown
      }),
      subscribe: jest.fn().mockReturnThis(),
    }
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    // Subscribe with no callbacks at all
    subscribeToGroup('group-no-cb', {})

    // Firing each handler should not throw (callbacks are optional)
    expect(() => capturedCallbacks['group_places']?.({ new: {} })).not.toThrow()
    expect(() => capturedCallbacks['group_members']?.({})).not.toThrow()
    expect(() => capturedCallbacks['place_ratings']?.({})).not.toThrow()
  })

  it('triggers retry via setTimeout when subscribe status is CHANNEL_ERROR', () => {
    jest.useFakeTimers()
    const mockChannel = buildMockChannel()
    let subscribeCb: ((status: string) => void) | undefined
    ;(mockChannel.subscribe as jest.Mock).mockImplementation((cb: (s: string) => void) => {
      subscribeCb = cb
      return mockChannel
    })
    ;(mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel)

    subscribeToGroup('group-err', {})

    // Simulate CHANNEL_ERROR status
    const channelCallCount = (mockSupabase.channel as jest.Mock).mock.calls.length
    subscribeCb?.('CHANNEL_ERROR')

    // After the timeout fires, subscribeToGroup should be called again
    jest.runAllTimers()

    expect((mockSupabase.channel as jest.Mock).mock.calls.length).toBeGreaterThan(channelCallCount)
    jest.useRealTimers()
  })
})
