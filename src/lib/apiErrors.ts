/**
 * Typed Supabase error handler — Driftmark
 *
 * Maps raw PostgrestError codes and messages to typed ApiError instances
 * with user-friendly messages. This keeps error-handling logic in one place
 * and ensures consistent behavior across all API calls.
 *
 * Security note: getUserFacingMessage() returns generic messages in production
 * to prevent internal error details (table names, SQL state codes, stack traces)
 * from leaking to the UI — information that could assist an attacker.
 *
 * See THREAT_MODEL.md AS-07 (information disclosure via error messages).
 */

import { PostgrestError } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | 'UNAUTHORIZED'      // Not authenticated (no session / expired JWT)
  | 'FORBIDDEN'         // Authenticated but not permitted (RLS violation)
  | 'NOT_FOUND'         // Resource does not exist (or RLS hides it)
  | 'GROUP_FULL'        // Group member limit (4) reached
  | 'INVITE_EXPIRED'    // Group invite code expired or already used
  | 'VALIDATION_ERROR'  // Input failed DB-level constraint
  | 'RATE_LIMITED'      // Too many requests
  | 'NETWORK_ERROR'     // No network / connection refused
  | 'UNKNOWN'           // Unmapped error

// ---------------------------------------------------------------------------
// ApiError class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly cause?: PostgrestError | Error
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---------------------------------------------------------------------------
// Supabase error mapper
// ---------------------------------------------------------------------------

/**
 * Converts a PostgrestError into a typed ApiError.
 *
 * PostgreSQL error codes reference:
 *   42501  — insufficient_privilege (RLS USING clause returned false)
 *   PGRST301 — JWT expired / missing (Supabase PostgREST layer)
 *   PGRST116 — Row not found (single() with no matching row)
 *
 * Custom error messages from DB triggers/functions are matched by substring
 * because PostgreSQL RAISE EXCEPTION messages are passed through verbatim.
 */
export function handleSupabaseError(error: PostgrestError): ApiError {
  // RLS violation — row-level security USING clause denied access
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return new ApiError('FORBIDDEN', 'Access denied', error)
  }

  // JWT not present, expired, or malformed (Supabase returns PGRST301)
  if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    return new ApiError('UNAUTHORIZED', 'Authentication required', error)
  }

  // Group member limit trigger (enforce_group_member_limit in migration 001)
  if (error.message?.includes('Group is full')) {
    return new ApiError('GROUP_FULL', 'This group is full (max 4 members)', error)
  }

  // Invite code expired or already used (checked in join_group DB function)
  if (error.message?.includes('invite') && error.message?.includes('expired')) {
    return new ApiError('INVITE_EXPIRED', 'This invite link has expired', error)
  }

  // Single row expected (PostgREST) but none found — treat as not found
  if (error.code === 'PGRST116') {
    return new ApiError('NOT_FOUND', 'Resource not found', error)
  }

  // Rate limited (HTTP 429 surfaced as a PostgREST code in some configurations)
  if (error.code === '429') {
    return new ApiError('RATE_LIMITED', 'Too many requests, please slow down', error)
  }

  // DB constraint violations (CHECK constraints, UNIQUE, FK, NOT NULL, etc.)
  // 23514 — check_violation, 23505 — unique_violation, 23503 — foreign_key_violation,
  // 23502 — not_null_violation
  if (
    error.code === '23514' ||
    error.code === '23505' ||
    error.code === '23503' ||
    error.code === '23502'
  ) {
    return new ApiError('VALIDATION_ERROR', 'Invalid data provided', error)
  }

  return new ApiError('UNKNOWN', error.message || 'An unexpected error occurred', error)
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Type guard — returns true if the value is an ApiError instance. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

// ---------------------------------------------------------------------------
// User-facing message helper
// ---------------------------------------------------------------------------

/**
 * Returns a safe, user-facing error message.
 *
 * In production: returns the message from ApiError (pre-screened) or a
 * generic fallback — never exposes raw error details.
 * In development: exposes the full error message to aid debugging.
 *
 * Mitigates AS-07: prevents internal error details from reaching the UI.
 */
export function getUserFacingMessage(error: unknown): string {
  if (isApiError(error)) {
    // ApiError messages are pre-approved user-facing strings
    return error.message
  }
  if (error instanceof Error) {
    return __DEV__ ? error.message : 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}
