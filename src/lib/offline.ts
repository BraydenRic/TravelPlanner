import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { db as supabase } from './supabase'
import { handleSupabaseError } from './apiErrors'

export type QueuedOperation = {
  id: string
  type:
    | 'CREATE_PLACE'
    | 'UPDATE_PLACE'
    | 'DELETE_PLACE'
    | 'UPSERT_RATINGS'
    | 'UPDATE_PROFILE'
    | 'UPLOAD_PHOTO'
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
}

const QUEUE_KEY = 'driftmark_offline_queue'
const MAX_RETRIES = 3

/**
 * Adds a write operation to the persistent offline queue.
 *
 * The queue is stored in AsyncStorage under `driftmark_offline_queue`.
 * Each enqueued item receives a generated `id`, a `createdAt` timestamp,
 * and a `retryCount` of 0. Operations are appended in arrival order and
 * processed FIFO when `syncQueue` runs.
 *
 * Call this function instead of writing directly to Supabase whenever the
 * app detects no network connectivity. The caller is responsible for
 * detecting the offline state (e.g. via NetInfo or the ui store) before
 * enqueuing; this function does not check connectivity itself.
 *
 * Supported operation types: CREATE_PLACE, UPDATE_PLACE, DELETE_PLACE,
 * UPSERT_RATINGS, UPDATE_PROFILE, UPLOAD_PHOTO.
 *
 * @param op - The operation type and payload; `id`, `createdAt`, and
 *   `retryCount` are assigned automatically
 */
export async function enqueueOperation(
  op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount'>,
): Promise<void> {
  const queue = await getQueue()
  const newOp: QueuedOperation = {
    ...op,
    id: Math.random().toString(36).slice(2),
    createdAt: Date.now(),
    retryCount: 0,
  }
  queue.push(newOp)
  await saveQueue(queue)
}

export async function getQueue(): Promise<QueuedOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? (JSON.parse(raw) as QueuedOperation[]) : []
}

async function saveQueue(queue: QueuedOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Attempts to replay all queued operations against Supabase.
 *
 * Iterates through the stored queue in order. For each operation:
 * - On success: the operation is removed from the queue and `succeeded`
 *   is incremented.
 * - On failure with retries remaining: the operation is kept in the queue
 *   with `retryCount` incremented and will be retried on the next sync.
 * - On failure after `MAX_RETRIES` (3) attempts: the operation is dropped
 *   permanently to prevent the queue from growing without bound. `failed`
 *   is incremented.
 *
 * `UPLOAD_PHOTO` operations always throw (photos cannot be queued offline)
 * and will consume their retry budget before being dropped.
 *
 * After processing, the remaining (not-yet-succeeded) operations are saved
 * back to AsyncStorage atomically before this function returns.
 *
 * This function is called automatically by `initOfflineSync` when the
 * device regains connectivity. It can also be called manually to force
 * a sync attempt.
 *
 * @returns Object with `succeeded` and `failed` counts for the sync run
 */
export async function syncQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = await getQueue()
  if (queue.length === 0) return { succeeded: 0, failed: 0 }

  let succeeded = 0
  let failed = 0
  const remaining: QueuedOperation[] = []

  for (const op of queue) {
    try {
      await executeOperation(op)
      succeeded++
    } catch {
      if (op.retryCount >= MAX_RETRIES) {
        failed++
        // Drop after max retries — don't accumulate forever
      } else {
        remaining.push({ ...op, retryCount: op.retryCount + 1 })
      }
    }
  }

  await saveQueue(remaining)
  return { succeeded, failed }
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  switch (op.type) {
    case 'CREATE_PLACE': {
      const { error } = await supabase.from('visited_places').insert(op.payload)
      if (error) throw handleSupabaseError(error)
      break
    }
    case 'UPDATE_PLACE': {
      const { id, ...data } = op.payload
      const { error } = await supabase
        .from('visited_places')
        .update(data)
        .eq('id', id as string)
      if (error) throw handleSupabaseError(error)
      break
    }
    case 'DELETE_PLACE': {
      const { error } = await supabase
        .from('visited_places')
        .delete()
        .eq('id', op.payload['id'] as string)
      if (error) throw handleSupabaseError(error)
      break
    }
    case 'UPSERT_RATINGS': {
      const { rows } = op.payload as { rows: Record<string, unknown>[] }
      const { error } = await supabase
        .from('place_ratings')
        .upsert(rows, { onConflict: 'visited_place_id,category' })
      if (error) throw handleSupabaseError(error)
      break
    }
    case 'UPDATE_PROFILE': {
      const { userId, ...updates } = op.payload
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId as string)
      if (error) throw handleSupabaseError(error)
      break
    }
    case 'UPLOAD_PHOTO': {
      // Photo uploads require network — flag as needing retry
      throw new Error('Photo uploads require network connection')
    }
    default:
      throw new Error(`Unknown operation type: ${(op).type}`)
  }
}

/**
 * Registers a network connectivity listener that automatically syncs the
 * offline queue whenever the device comes back online.
 *
 * Uses `@react-native-community/netinfo` to subscribe to connectivity
 * changes. When both `isConnected` and `isInternetReachable` are true,
 * `syncQueue` is triggered immediately. The optional `onSync` callback
 * receives the sync result (`{ succeeded, failed }`) after each run,
 * which can be used to show a toast or refresh UI state.
 *
 * Must be called once at app startup (e.g. in the root layout). Calling
 * it multiple times will register duplicate listeners; always call the
 * returned cleanup function before re-initializing.
 *
 * @param onSync - Optional callback invoked after each successful sync run
 * @returns A cleanup function that unsubscribes the network listener.
 *   Call this in a useEffect cleanup or component unmount handler to
 *   prevent memory leaks.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const cleanup = initOfflineSync((result) => {
 *     if (result.succeeded > 0) showToast(`Synced ${result.succeeded} changes`)
 *   })
 *   return cleanup
 * }, [])
 * ```
 */
export function initOfflineSync(
  onSync?: (result: { succeeded: number; failed: number }) => void,
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      syncQueue().then(onSync).catch(console.error)
    }
  })
  return unsubscribe
}
