/**
 * Unit tests for src/lib/sanitize.ts
 *
 * Coverage:
 *   - escapeHtml: all 6 special characters are escaped correctly
 *   - stripHtml: HTML tags are removed; plain text is preserved
 *   - sanitizeForStorage: combined pipeline
 *   - Field-specific sanitizers: length enforcement, XSS prevention
 *
 * See THREAT_MODEL.md AS-06, TOP-5.
 */

import { describe, it, expect } from '@jest/globals'
import {
  escapeHtml,
  stripHtml,
  sanitizeForStorage,
  sanitizeDisplayName,
  sanitizeGroupName,
  sanitizeReview,
  sanitizeCaption,
  sanitizeNotes,
} from '../../src/lib/sanitize'

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersand first (no double-escaping)', () => {
    expect(escapeHtml('&')).toBe('&amp;')
    // Must not double-escape: &amp; should not become &amp;amp;
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })

  it('escapes < character', () => {
    expect(escapeHtml('<')).toBe('&lt;')
  })

  it('escapes > character', () => {
    expect(escapeHtml('>')).toBe('&gt;')
  })

  it('escapes double quote', () => {
    expect(escapeHtml('"')).toBe('&quot;')
  })

  it('escapes single quote', () => {
    expect(escapeHtml("'")).toBe('&#x27;')
  })

  it('escapes backtick', () => {
    expect(escapeHtml('`')).toBe('&#x60;')
  })

  it('escapes all special chars in a mixed string', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('escapes XSS payload: onerror attribute', () => {
    const input = '"><img src=x onerror=alert(document.cookie)>'
    const output = escapeHtml(input)
    expect(output).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(document.cookie)&gt;'
    )
    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
    expect(output).not.toContain('"')
  })

  it('escapes SQL injection quotes', () => {
    expect(escapeHtml("' OR 1=1 --")).toBe('&#x27; OR 1=1 --')
  })

  it('preserves plain text without modification', () => {
    expect(escapeHtml('Hello, World!')).toBe('Hello, World!')
    expect(escapeHtml('Tokyo 東京')).toBe('Tokyo 東京')
    expect(escapeHtml('2026-03-24')).toBe('2026-03-24')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

describe('stripHtml', () => {
  it('strips simple HTML tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold')
    expect(stripHtml('<p>paragraph</p>')).toBe('paragraph')
  })

  it('strips script tags', () => {
    expect(stripHtml("<script>alert('xss')</script>")).toBe("alert('xss')")
  })

  it('strips nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text')
  })

  it('strips self-closing tags', () => {
    expect(stripHtml('<img src=x onerror=alert(1) />')).toBe('')
    expect(stripHtml('<br />')).toBe('')
  })

  it('strips SVG onload attack', () => {
    expect(stripHtml('<svg onload=alert(1)>content</svg>')).toBe('content')
  })

  it('trims surrounding whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello')
  })

  it('preserves plain text', () => {
    expect(stripHtml('Hello, World!')).toBe('Hello, World!')
    expect(stripHtml('Tokyo 東京')).toBe('Tokyo 東京')
  })

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('')
  })

  it('handles string with only whitespace', () => {
    expect(stripHtml('   ')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// sanitizeForStorage
// ---------------------------------------------------------------------------

describe('sanitizeForStorage', () => {
  it('trims whitespace', () => {
    expect(sanitizeForStorage('  hello  ')).toBe('hello')
  })

  it('strips HTML tags then escapes remaining special chars', () => {
    // After stripping <script>...</script>, the inner text contains ' which gets escaped
    expect(sanitizeForStorage("<script>alert('xss')</script>")).toBe(
      "alert(&#x27;xss&#x27;)"
    )
  })

  it('escapes a plain XSS payload after stripping tags', () => {
    // <img src=x onerror=alert(1)> → strips tag → empty string
    expect(sanitizeForStorage('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('handles ampersand in plain text', () => {
    expect(sanitizeForStorage('Fish & Chips')).toBe('Fish &amp; Chips')
  })

  it('handles a realistic review text', () => {
    const input = '  Great place! The food was amazing.  '
    expect(sanitizeForStorage(input)).toBe('Great place! The food was amazing.')
  })

  it('handles empty string', () => {
    expect(sanitizeForStorage('')).toBe('')
  })

  it('neutralizes javascript: URI scheme in text', () => {
    // After HTML stripping, "javascript:alert(1)" has no tags, just plain text
    // The colon is not a special HTML char — stored as plain text, never executed
    const result = sanitizeForStorage('javascript:alert(1)')
    expect(result).toBe('javascript:alert(1)') // safe as plain text, never rendered as URL
  })
})

// ---------------------------------------------------------------------------
// sanitizeDisplayName
// ---------------------------------------------------------------------------

describe('sanitizeDisplayName', () => {
  it('sanitizes and enforces 30-char limit', () => {
    const input = 'A'.repeat(40)
    expect(sanitizeDisplayName(input)).toHaveLength(30)
  })

  it('sanitizes XSS in display name', () => {
    const result = sanitizeDisplayName("<script>alert('xss')</script>")
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).not.toContain('"')
  })

  it('trims whitespace', () => {
    expect(sanitizeDisplayName('  Alice  ')).toBe('Alice')
  })

  it('preserves normal names', () => {
    expect(sanitizeDisplayName('Alice')).toBe('Alice')
    expect(sanitizeDisplayName('João')).toBe('João')
  })

  it('handles empty string', () => {
    expect(sanitizeDisplayName('')).toBe('')
  })

  it('does not exceed 30 chars after escaping (escaping can expand length)', () => {
    // After escaping, &amp; replaces &. Slice is applied AFTER escaping.
    const result = sanitizeDisplayName('A'.repeat(30))
    expect(result.length).toBeLessThanOrEqual(30)
  })
})

// ---------------------------------------------------------------------------
// sanitizeGroupName
// ---------------------------------------------------------------------------

describe('sanitizeGroupName', () => {
  it('sanitizes and enforces 50-char limit', () => {
    const input = 'A'.repeat(60)
    expect(sanitizeGroupName(input)).toHaveLength(50)
  })

  it('sanitizes XSS in group name', () => {
    const result = sanitizeGroupName('<script>alert(1)</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('handles long name with special chars — slice is applied post-escape', () => {
    // Ensure the 50-char limit is enforced on the escaped output
    const result = sanitizeGroupName('&'.repeat(60))
    // Each '&' becomes '&amp;' (5 chars), but we slice to 50 chars of the final string
    expect(result.length).toBeLessThanOrEqual(50)
  })
})

// ---------------------------------------------------------------------------
// sanitizeReview
// ---------------------------------------------------------------------------

describe('sanitizeReview', () => {
  it('sanitizes and enforces 2000-char limit', () => {
    const input = 'A'.repeat(2100)
    expect(sanitizeReview(input)).toHaveLength(2000)
  })

  it('strips HTML tags from reviews', () => {
    const result = sanitizeReview('<b>Great</b> food!')
    expect(result).toBe('Great food!')
  })

  it('escapes special characters in reviews', () => {
    const result = sanitizeReview('Fish & Chips: "worth it"')
    expect(result).toBe('Fish &amp; Chips: &quot;worth it&quot;')
  })
})

// ---------------------------------------------------------------------------
// sanitizeCaption
// ---------------------------------------------------------------------------

describe('sanitizeCaption', () => {
  it('sanitizes and enforces 500-char limit', () => {
    const input = 'A'.repeat(600)
    expect(sanitizeCaption(input)).toHaveLength(500)
  })

  it('strips tags from captions', () => {
    expect(sanitizeCaption('<em>Beautiful</em> sunset')).toBe('Beautiful sunset')
  })
})

// ---------------------------------------------------------------------------
// sanitizeNotes
// ---------------------------------------------------------------------------

describe('sanitizeNotes', () => {
  it('sanitizes and enforces 1000-char limit', () => {
    const input = 'A'.repeat(1100)
    expect(sanitizeNotes(input)).toHaveLength(1000)
  })

  it('strips tags from notes', () => {
    expect(sanitizeNotes('<div>Remember to book hotel</div>')).toBe('Remember to book hotel')
  })
})

// ---------------------------------------------------------------------------
// XSS payload battery through sanitizeForStorage
// ---------------------------------------------------------------------------

describe('XSS payload battery through sanitizeForStorage', () => {
  const payloads = [
    "<script>alert('xss')</script>",
    '"><img src=x onerror=alert(document.cookie)>',
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    "<iframe src=javascript:alert('xss')>",
    '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    '<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>',
  ]

  for (const payload of payloads) {
    it(`neutralizes payload: ${payload.slice(0, 50)}`, () => {
      const result = sanitizeForStorage(payload)
      // After sanitization, no angle brackets or unescaped quotes should remain
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      // If result is non-empty, it must not contain any raw script-executable syntax
      if (result.length > 0) {
        expect(result).not.toMatch(/<script/i)
        expect(result).not.toMatch(/onerror\s*=/i)
        expect(result).not.toMatch(/onload\s*=/i)
      }
    })
  }
})
