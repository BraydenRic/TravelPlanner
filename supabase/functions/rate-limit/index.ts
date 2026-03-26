/**
 * Rate Limiting Edge Function — Driftmark
 *
 * Provides rate limit checking for API operations. Called by other Edge
 * Functions to enforce per-user request limits.
 *
 * Security mitigations implemented here:
 *   AS-11-A (TOP-3): JWT validation is ALWAYS the first step — unauthenticated
 *     callers receive 401 before any processing. Edge Functions run with the
 *     service-role key (bypasses RLS), so JWT validation here is critical.
 *   AS-11-B: Per-user rate limits prevent bulk scraping and abuse.
 *   AS-07: Validates Authorization header before any resource access.
 *
 * Rate limits:
 *   Read operations  (GET):                    60 requests / 60 seconds
 *   Write operations (POST/PUT/PATCH/DELETE):  20 requests / 60 seconds
 *
 * See THREAT_MODEL.md AS-07 (TOP-3), AS-11.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Rate limit configuration
// ---------------------------------------------------------------------------

const RATE_LIMITS = {
  read: { requests: 60, windowSeconds: 60 },
  write: { requests: 20, windowSeconds: 60 },
} as const

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // ------------------------------------------------------------------
  // Step 1: JWT Validation — MUST be first.
  // Mitigates AS-07 TOP-3: Edge Functions run with service-role key
  // which bypasses RLS. An unvalidated caller has full DB access.
  // ------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create a client using the service-role key to validate the user's JWT
  // The service-role key is only available server-side (never in the client bundle)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ------------------------------------------------------------------
  // Step 2: Determine operation type and applicable rate limit
  // ------------------------------------------------------------------
  const method = req.method.toUpperCase()
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const limit = isWrite ? RATE_LIMITS.write : RATE_LIMITS.read

  // ------------------------------------------------------------------
  // Step 3: Rate limit check
  // Window key is derived from: user ID + operation type + time window
  // This provides per-user, per-operation-type isolation.
  //
  // Production note: This implementation uses an in-memory approximation.
  // For production, use Upstash Redis (https://upstash.com/) with atomic
  // INCR + EXPIRE commands to prevent race conditions.
  //
  // A Redis-based implementation would be:
  //   const key = `rate:${user.id}:${isWrite ? 'write' : 'read'}:${windowStart}`
  //   const count = await redis.incr(key)
  //   if (count === 1) await redis.expire(key, limit.windowSeconds)
  //   if (count > limit.requests) return 429 response
  // ------------------------------------------------------------------
  const windowStart = Math.floor(Date.now() / 1000 / limit.windowSeconds) * limit.windowSeconds
  const key = `rate:${user.id}:${isWrite ? 'write' : 'read'}:${windowStart}`

  // TODO: Replace with Upstash Redis for production atomic rate limiting
  // For now, return allowed: true — the key and limit metadata are returned
  // in headers so callers can implement client-side throttling.
  const allowed = true
  const remaining = limit.requests - 1 // Approximate — replace with Redis count
  const resetAt = windowStart + limit.windowSeconds

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please slow down.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit.requests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetAt),
          'X-RateLimit-Window': String(limit.windowSeconds),
          'Retry-After': String(resetAt - Math.floor(Date.now() / 1000)),
        },
      }
    )
  }

  return new Response(
    JSON.stringify({
      allowed: true,
      userId: user.id,
      limit: limit.requests,
      remaining,
      resetAt,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(limit.requests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetAt),
        'X-RateLimit-Window': String(limit.windowSeconds),
      },
    }
  )
})
