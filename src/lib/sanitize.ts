/**
 * HTML sanitization for user-generated content — Driftmark
 *
 * Security mitigations implemented here:
 *   AS-06 (TOP-5): Prevents stored XSS by escaping HTML entities before DB storage.
 *
 * Architecture:
 *   - React Native native text components (Text, TextInput) are XSS-immune
 *     by design — they render text, not HTML.
 *   - The web build (React DOM) and any future WebView usage ARE vulnerable
 *     to stored XSS if content is rendered with dangerouslySetInnerHTML.
 *   - This module escapes content before it reaches the database, so stored
 *     data is always safe regardless of how it is later rendered.
 *
 * Pipeline: user input → Zod validate (validation.ts) → sanitize (here) → DB write
 *
 * See THREAT_MODEL.md AS-06, TOP-5.
 */

// ---------------------------------------------------------------------------
// Core escape functions
// ---------------------------------------------------------------------------

/**
 * Escapes HTML special characters to their entity equivalents.
 * Prevents stored XSS on web by ensuring content cannot be interpreted
 * as HTML markup when rendered in a DOM context.
 *
 * Characters escaped:
 *   &  → &amp;   (must be first to avoid double-escaping)
 *   <  → &lt;
 *   >  → &gt;
 *   "  → &quot;
 *   '  → &#x27;
 *   `  → &#x60;  (blocks template literal injection in HTML attributes)
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
}

/**
 * Strips all HTML tags from a string.
 * Removes any markup that may have slipped through validation.
 * Applied BEFORE escapeHtml so that any leftover < > from tags are also escaped.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

// ---------------------------------------------------------------------------
// Storage sanitizer (used before every DB write)
// ---------------------------------------------------------------------------

/**
 * Full sanitization pipeline for storing user-generated text:
 *   1. Trim whitespace
 *   2. Strip HTML tags (removes any markup)
 *   3. Escape HTML entities (neutralizes any remaining special characters)
 *
 * This ensures content in the database is always plain text, never markup.
 */
export function sanitizeForStorage(input: string): string {
  return escapeHtml(stripHtml(input.trim()))
}

// ---------------------------------------------------------------------------
// Field-specific sanitizers
// ---------------------------------------------------------------------------
// Each function applies sanitizeForStorage and then enforces the DB length
// limit as a final safety net (primary enforcement is in validation.ts).

/**
 * Sanitize display name (max 30 chars per DB constraint).
 */
export function sanitizeDisplayName(name: string): string {
  return sanitizeForStorage(name).slice(0, 30)
}

/**
 * Sanitize group name (max 50 chars per DB constraint).
 */
export function sanitizeGroupName(name: string): string {
  return sanitizeForStorage(name).slice(0, 50)
}

/**
 * Sanitize review text (max 2000 chars per DB constraint).
 */
export function sanitizeReview(text: string): string {
  return sanitizeForStorage(text).slice(0, 2000)
}

/**
 * Sanitize photo caption (max 500 chars per DB constraint).
 */
export function sanitizeCaption(text: string): string {
  return sanitizeForStorage(text).slice(0, 500)
}

/**
 * Sanitize notes field (max 1000 chars per DB constraint).
 */
export function sanitizeNotes(text: string): string {
  return sanitizeForStorage(text).slice(0, 1000)
}
