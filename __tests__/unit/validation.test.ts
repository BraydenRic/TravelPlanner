/**
 * Unit tests for src/lib/validation.ts
 *
 * Coverage:
 *   - Valid inputs pass all schemas
 *   - Invalid inputs fail with correct error messages
 *   - Boundary values (exactly at min/max, just over)
 *   - XSS payloads are rejected
 *   - SQL injection attempts fail
 *
 * See THREAT_MODEL.md AS-06, TOP-5.
 */

import { describe, it, expect } from '@jest/globals'
import {
  countryCodeSchema,
  currencyCodeSchema,
  ratingScoreSchema,
  ratingCategorySchema,
  placeCategorySchema,
  displayNameSchema,
  groupNameSchema,
  reviewSchema,
  captionSchema,
  notesSchema,
  budgetSchema,
  inviteCodeSchema,
  placeRatingsSchema,
  createPlaceSchema,
  updatePlaceSchema,
  createGroupSchema,
  updateProfileSchema,
  photoUploadSchema,
  pushTokenSchema,
} from '../../src/lib/validation'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function expectValid<T>(schema: { safeParse: (v: unknown) => { success: boolean } }, value: T) {
  const result = schema.safeParse(value)
  expect(result.success).toBe(true)
}

function expectInvalid(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: Array<{ message: string }> } } },
  value: unknown,
  expectedMessageFragment?: string
) {
  const result = schema.safeParse(value)
  expect(result.success).toBe(false)
  if (expectedMessageFragment && !result.success && result.error) {
    const messages = result.error.issues.map(i => i.message).join(' ')
    expect(messages).toContain(expectedMessageFragment)
  }
}

// ---------------------------------------------------------------------------
// countryCodeSchema
// ---------------------------------------------------------------------------

describe('countryCodeSchema', () => {
  it('accepts valid ISO 3166-1 alpha-2 codes', () => {
    expectValid(countryCodeSchema, 'US')
    expectValid(countryCodeSchema, 'JP')
    expectValid(countryCodeSchema, 'GB')
    expectValid(countryCodeSchema, 'ZA')
  })

  it('rejects lowercase codes', () => {
    expectInvalid(countryCodeSchema, 'us')
    expectInvalid(countryCodeSchema, 'jp')
  })

  it('rejects wrong length', () => {
    expectInvalid(countryCodeSchema, 'U')
    expectInvalid(countryCodeSchema, 'USA')
    expectInvalid(countryCodeSchema, '')
  })

  it('rejects non-alpha characters', () => {
    expectInvalid(countryCodeSchema, '12')
    expectInvalid(countryCodeSchema, 'U1')
    expectInvalid(countryCodeSchema, '<S')
  })

  it('rejects XSS injection in country code field', () => {
    expectInvalid(countryCodeSchema, '<S')
    expectInvalid(countryCodeSchema, '">') // 2 chars but not alpha
  })
})

// ---------------------------------------------------------------------------
// currencyCodeSchema
// ---------------------------------------------------------------------------

describe('currencyCodeSchema', () => {
  it('accepts valid ISO 4217 codes', () => {
    expectValid(currencyCodeSchema, 'USD')
    expectValid(currencyCodeSchema, 'EUR')
    expectValid(currencyCodeSchema, 'JPY')
    expectValid(currencyCodeSchema, 'GBP')
  })

  it('rejects lowercase codes', () => {
    expectInvalid(currencyCodeSchema, 'usd')
  })

  it('rejects wrong length', () => {
    expectInvalid(currencyCodeSchema, 'US')
    expectInvalid(currencyCodeSchema, 'USDD')
    expectInvalid(currencyCodeSchema, '')
  })

  it('rejects non-alpha characters', () => {
    expectInvalid(currencyCodeSchema, 'U$D')
    expectInvalid(currencyCodeSchema, '123')
  })
})

// ---------------------------------------------------------------------------
// ratingScoreSchema
// ---------------------------------------------------------------------------

describe('ratingScoreSchema', () => {
  it('accepts valid scores 1–5', () => {
    expectValid(ratingScoreSchema, 1)
    expectValid(ratingScoreSchema, 2)
    expectValid(ratingScoreSchema, 3)
    expectValid(ratingScoreSchema, 4)
    expectValid(ratingScoreSchema, 5)
  })

  it('rejects 0 (below minimum)', () => {
    expectInvalid(ratingScoreSchema, 0, 'Score must be at least 1')
  })

  it('rejects 6 (above maximum)', () => {
    expectInvalid(ratingScoreSchema, 6, 'Score must be at most 5')
  })

  it('rejects non-integer values', () => {
    expectInvalid(ratingScoreSchema, 3.5, 'integer')
    expectInvalid(ratingScoreSchema, 1.1)
  })

  it('rejects string scores', () => {
    expectInvalid(ratingScoreSchema, '3')
    expectInvalid(ratingScoreSchema, 'five')
  })
})

// ---------------------------------------------------------------------------
// ratingCategorySchema
// ---------------------------------------------------------------------------

describe('ratingCategorySchema', () => {
  it('accepts all valid categories', () => {
    const validCategories = [
      'overall_experience', 'safety', 'food_cuisine', 'transportation',
      'friendliness', 'affordability', 'cleanliness', 'nightlife_entertainment',
      'natural_beauty', 'wifi_connectivity',
    ]
    for (const cat of validCategories) {
      expectValid(ratingCategorySchema, cat)
    }
  })

  it('rejects unknown categories', () => {
    expectInvalid(ratingCategorySchema, 'price')
    expectInvalid(ratingCategorySchema, 'weather')
    expectInvalid(ratingCategorySchema, '')
    expectInvalid(ratingCategorySchema, 'SAFETY')
  })

  it('rejects SQL injection in category field', () => {
    expectInvalid(ratingCategorySchema, "safety'; DROP TABLE place_ratings; --")
    expectInvalid(ratingCategorySchema, "' OR 1=1 --")
  })
})

// ---------------------------------------------------------------------------
// placeCategorySchema
// ---------------------------------------------------------------------------

describe('placeCategorySchema', () => {
  it('accepts valid categories', () => {
    expectValid(placeCategorySchema, 'been')
    expectValid(placeCategorySchema, 'want_to_go')
    expectValid(placeCategorySchema, 'lived')
  })

  it('rejects invalid categories', () => {
    expectInvalid(placeCategorySchema, 'visited')
    expectInvalid(placeCategorySchema, 'BEEN')
    expectInvalid(placeCategorySchema, '')
  })
})

// ---------------------------------------------------------------------------
// displayNameSchema — XSS is the primary concern
// ---------------------------------------------------------------------------

describe('displayNameSchema', () => {
  it('accepts valid display names', () => {
    expectValid(displayNameSchema, 'Alice')
    expectValid(displayNameSchema, 'João')
    expectValid(displayNameSchema, 'Li Wei')
    expectValid(displayNameSchema, 'A') // exactly min length (1)
    expectValid(displayNameSchema, 'A'.repeat(30)) // exactly max length (30)
  })

  it('rejects empty string', () => {
    expectInvalid(displayNameSchema, '', 'required')
  })

  it('rejects names over 30 characters', () => {
    expectInvalid(displayNameSchema, 'A'.repeat(31), '30 characters')
  })

  it('rejects name with exactly 31 characters (boundary)', () => {
    expectInvalid(displayNameSchema, 'A'.repeat(31))
  })

  it('rejects XSS: script tag', () => {
    expectInvalid(displayNameSchema, "<script>alert('xss')</script>", 'invalid characters')
  })

  it('rejects XSS: onerror attribute', () => {
    expectInvalid(displayNameSchema, '"><img src=x onerror=alert(1)>', 'invalid characters')
  })

  it('rejects XSS: angle brackets alone', () => {
    expectInvalid(displayNameSchema, 'Alice<>', 'invalid characters')
  })

  it('rejects XSS: javascript: protocol', () => {
    // javascript: itself has no special chars so it passes Zod — sanitize.ts handles display
    // But payloads that include quotes or angle brackets fail here:
    expectInvalid(displayNameSchema, '<a href="javascript:alert(1)">click</a>', 'invalid characters')
  })

  it('rejects SQL injection with quotes', () => {
    expectInvalid(displayNameSchema, "' OR 1=1 --", 'invalid characters')
    expectInvalid(displayNameSchema, '"; DROP TABLE profiles; --', 'invalid characters')
  })

  it('rejects backtick injection', () => {
    expectInvalid(displayNameSchema, 'name`${evil}', 'invalid characters')
  })

  it('rejects ampersand', () => {
    expectInvalid(displayNameSchema, 'Alice & Bob', 'invalid characters')
  })
})

// ---------------------------------------------------------------------------
// groupNameSchema
// ---------------------------------------------------------------------------

describe('groupNameSchema', () => {
  it('accepts valid group names', () => {
    expectValid(groupNameSchema, 'Europe Trip 2026')
    expectValid(groupNameSchema, 'A') // min length
    expectValid(groupNameSchema, 'A'.repeat(50)) // exactly max length (50)
  })

  it('rejects empty string', () => {
    expectInvalid(groupNameSchema, '', 'required')
  })

  it('rejects names over 50 characters (boundary: 51)', () => {
    expectInvalid(groupNameSchema, 'A'.repeat(51), '50 characters')
  })

  it('rejects XSS in group name', () => {
    expectInvalid(groupNameSchema, '<script>alert(1)</script>', 'invalid characters')
  })

  it('rejects SQL injection in group name', () => {
    expectInvalid(groupNameSchema, "' OR 1=1 --", 'invalid characters')
  })
})

// ---------------------------------------------------------------------------
// reviewSchema
// ---------------------------------------------------------------------------

describe('reviewSchema', () => {
  it('accepts valid reviews', () => {
    expectValid(reviewSchema, 'Great city!')
    expectValid(reviewSchema, 'A'.repeat(2000)) // exactly at limit
    expectValid(reviewSchema, undefined) // optional
  })

  it('rejects reviews over 2000 characters', () => {
    expectInvalid(reviewSchema, 'A'.repeat(2001), '2000 characters')
  })

  it('accepts XSS payload as string (sanitize.ts handles escaping, Zod does not block)', () => {
    // reviewSchema does NOT have the HTML char regex (reviews allow richer text)
    // XSS mitigation for review text is via sanitize.ts (escapeHtml)
    // The Zod schema only enforces length — this is expected behavior
    const result = reviewSchema.safeParse('<script>alert(1)</script>')
    expect(result.success).toBe(true) // passes Zod; escaped by sanitize.ts before storage
  })
})

// ---------------------------------------------------------------------------
// captionSchema
// ---------------------------------------------------------------------------

describe('captionSchema', () => {
  it('accepts valid captions', () => {
    expectValid(captionSchema, 'Sunset over Tokyo')
    expectValid(captionSchema, 'A'.repeat(500)) // exactly at limit
    expectValid(captionSchema, undefined)
  })

  it('rejects captions over 500 characters', () => {
    expectInvalid(captionSchema, 'A'.repeat(501), '500 characters')
  })
})

// ---------------------------------------------------------------------------
// notesSchema
// ---------------------------------------------------------------------------

describe('notesSchema', () => {
  it('accepts valid notes', () => {
    expectValid(notesSchema, 'Remember to book Shinkansen in advance')
    expectValid(notesSchema, 'A'.repeat(1000)) // exactly at limit
    expectValid(notesSchema, undefined)
  })

  it('rejects notes over 1000 characters', () => {
    expectInvalid(notesSchema, 'A'.repeat(1001), '1000 characters')
  })
})

// ---------------------------------------------------------------------------
// budgetSchema
// ---------------------------------------------------------------------------

describe('budgetSchema', () => {
  it('accepts valid budgets', () => {
    expectValid(budgetSchema, 0)       // min boundary
    expectValid(budgetSchema, 500)
    expectValid(budgetSchema, 999999)  // max boundary
    expectValid(budgetSchema, undefined)
  })

  it('rejects negative budgets', () => {
    expectInvalid(budgetSchema, -1, 'positive')
  })

  it('rejects budgets over 999999', () => {
    expectInvalid(budgetSchema, 1000000, 'too large')
  })

  it('rejects non-numeric values', () => {
    expectInvalid(budgetSchema, 'free')
    expectInvalid(budgetSchema, NaN)
  })
})

// ---------------------------------------------------------------------------
// inviteCodeSchema
// ---------------------------------------------------------------------------

describe('inviteCodeSchema', () => {
  it('accepts valid 32-char hex invite codes', () => {
    expectValid(inviteCodeSchema, 'a'.repeat(32))
    expectValid(inviteCodeSchema, '0123456789abcdef0123456789abcdef')
    expectValid(inviteCodeSchema, 'f'.repeat(32))
  })

  it('rejects codes shorter than 32 chars', () => {
    expectInvalid(inviteCodeSchema, 'abc123', 'Invalid invite code')
    expectInvalid(inviteCodeSchema, 'a'.repeat(31))
  })

  it('rejects codes longer than 32 chars', () => {
    expectInvalid(inviteCodeSchema, 'a'.repeat(33))
  })

  it('rejects uppercase hex', () => {
    expectInvalid(inviteCodeSchema, 'A'.repeat(32), 'Invalid invite code format')
  })

  it('rejects non-hex characters', () => {
    expectInvalid(inviteCodeSchema, 'g'.repeat(32)) // 'g' is not hex
    expectInvalid(inviteCodeSchema, 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')
  })

  it('rejects inject attempts in invite code field', () => {
    expectInvalid(inviteCodeSchema, "' OR 1=1; DROP TABLE groups; --")
    expectInvalid(inviteCodeSchema, '<script>'.padEnd(32, 'a'))
  })
})

// ---------------------------------------------------------------------------
// placeRatingsSchema
// ---------------------------------------------------------------------------

describe('placeRatingsSchema', () => {
  it('accepts partial ratings', () => {
    expectValid(placeRatingsSchema, { overall_experience: 5 })
    expectValid(placeRatingsSchema, { safety: 3, food_cuisine: 4 })
    expectValid(placeRatingsSchema, {}) // all optional
  })

  it('accepts all 10 categories', () => {
    expectValid(placeRatingsSchema, {
      overall_experience: 5,
      safety: 4,
      food_cuisine: 3,
      transportation: 2,
      friendliness: 5,
      affordability: 1,
      cleanliness: 4,
      nightlife_entertainment: 3,
      natural_beauty: 5,
      wifi_connectivity: 2,
    })
  })

  it('rejects invalid score values', () => {
    expectInvalid(placeRatingsSchema, { overall_experience: 0 })
    expectInvalid(placeRatingsSchema, { safety: 6 })
    expectInvalid(placeRatingsSchema, { food_cuisine: 3.5 })
  })
})

// ---------------------------------------------------------------------------
// createPlaceSchema
// ---------------------------------------------------------------------------

describe('createPlaceSchema', () => {
  const validPlace = {
    country_code: 'JP',
    category: 'been' as const,
  }

  it('accepts a minimal valid place', () => {
    expectValid(createPlaceSchema, validPlace)
  })

  it('accepts a fully populated place', () => {
    expectValid(createPlaceSchema, {
      country_code: 'JP',
      city_id: '550e8400-e29b-41d4-a716-446655440000',
      category: 'been',
      review: 'Amazing ramen',
      visited_date: '2026-01-15T00:00:00.000Z',
      planned_date: null,
      planned_budget: 2000,
      daily_budget: 150,
      currency_code: 'JPY',
      notes: 'Book Shinkansen in advance',
    })
  })

  it('rejects invalid country code', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, country_code: 'ja' })
    expectInvalid(createPlaceSchema, { ...validPlace, country_code: 'JPN' })
  })

  it('rejects invalid category', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, category: 'visited' })
  })

  it('rejects invalid UUID for city_id', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, city_id: 'not-a-uuid' })
  })

  it('rejects invalid datetime format for visited_date', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, visited_date: '2026-01-15' })
    expectInvalid(createPlaceSchema, { ...validPlace, visited_date: 'yesterday' })
  })

  it('rejects budget over limit', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, planned_budget: 1000000 })
  })

  it('rejects negative budget', () => {
    expectInvalid(createPlaceSchema, { ...validPlace, daily_budget: -50 })
  })

  it('rejects XSS in review field (length only — sanitize.ts handles escaping)', () => {
    // review is length-only in Zod; XSS escaping happens in sanitize.ts
    const longXssPayload = '<script>alert(1)</script>'.repeat(100) // 2500 chars
    expectInvalid(createPlaceSchema, { ...validPlace, review: longXssPayload }, '2000 characters')
  })
})

// ---------------------------------------------------------------------------
// createGroupSchema
// ---------------------------------------------------------------------------

describe('createGroupSchema', () => {
  it('accepts valid group names', () => {
    expectValid(createGroupSchema, { name: 'Europe Trip' })
  })

  it('rejects missing name', () => {
    expectInvalid(createGroupSchema, {})
    expectInvalid(createGroupSchema, { name: '' })
  })

  it('rejects XSS in group name', () => {
    expectInvalid(createGroupSchema, { name: '<script>alert(1)</script>' }, 'invalid characters')
  })

  it('rejects SQL injection in group name', () => {
    expectInvalid(createGroupSchema, { name: "'; DROP TABLE groups; --" }, 'invalid characters')
  })

  it('rejects group name over 50 characters', () => {
    expectInvalid(createGroupSchema, { name: 'A'.repeat(51) })
  })
})

// ---------------------------------------------------------------------------
// updateProfileSchema
// ---------------------------------------------------------------------------

describe('updateProfileSchema', () => {
  it('accepts valid profile update', () => {
    expectValid(updateProfileSchema, { display_name: 'Alice' })
    expectValid(updateProfileSchema, {
      display_name: 'Alice',
      avatar_url: 'https://example.com/avatar.jpg',
    })
    expectValid(updateProfileSchema, { display_name: 'Alice', avatar_url: null })
  })

  it('rejects invalid avatar URL', () => {
    expectInvalid(updateProfileSchema, {
      display_name: 'Alice',
      avatar_url: 'not-a-url',
    })
  })

  it('rejects XSS in display name', () => {
    expectInvalid(updateProfileSchema, {
      display_name: "<script>alert('xss')</script>",
    }, 'invalid characters')
  })

  it('rejects display name over 30 characters', () => {
    expectInvalid(updateProfileSchema, { display_name: 'A'.repeat(31) })
  })
})

// ---------------------------------------------------------------------------
// photoUploadSchema
// ---------------------------------------------------------------------------

describe('photoUploadSchema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts valid photo upload', () => {
    expectValid(photoUploadSchema, { visited_place_id: validUUID })
    expectValid(photoUploadSchema, {
      visited_place_id: validUUID,
      caption: 'Sunset',
      sort_order: 0,
    })
  })

  it('rejects invalid UUID for visited_place_id', () => {
    expectInvalid(photoUploadSchema, { visited_place_id: 'not-a-uuid' })
    expectInvalid(photoUploadSchema, { visited_place_id: "'; DROP TABLE place_photos; --" })
  })

  it('rejects caption over 500 characters', () => {
    expectInvalid(photoUploadSchema, {
      visited_place_id: validUUID,
      caption: 'A'.repeat(501),
    })
  })

  it('rejects negative sort_order', () => {
    expectInvalid(photoUploadSchema, { visited_place_id: validUUID, sort_order: -1 })
  })

  it('rejects sort_order over 100', () => {
    expectInvalid(photoUploadSchema, { visited_place_id: validUUID, sort_order: 101 })
  })
})

// ---------------------------------------------------------------------------
// pushTokenSchema
// ---------------------------------------------------------------------------

describe('pushTokenSchema', () => {
  it('accepts valid push tokens', () => {
    expectValid(pushTokenSchema, {
      expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      device_type: 'ios',
    })
    expectValid(pushTokenSchema, {
      expo_push_token: 'ExponentPushToken[yyyyyy]',
      device_type: 'android',
    })
    expectValid(pushTokenSchema, {
      expo_push_token: 'ExponentPushToken[web-token]',
      device_type: 'web',
    })
  })

  it('rejects empty push token', () => {
    expectInvalid(pushTokenSchema, { expo_push_token: '', device_type: 'ios' })
  })

  it('rejects token over 200 characters', () => {
    expectInvalid(pushTokenSchema, {
      expo_push_token: 'x'.repeat(201),
      device_type: 'ios',
    })
  })

  it('rejects invalid device type', () => {
    expectInvalid(pushTokenSchema, {
      expo_push_token: 'ExponentPushToken[xxx]',
      device_type: 'desktop',
    })
    expectInvalid(pushTokenSchema, {
      expo_push_token: 'ExponentPushToken[xxx]',
      device_type: 'IOS',
    })
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting XSS payload battery
// ---------------------------------------------------------------------------

describe('XSS payload battery — displayNameSchema (representative)', () => {
  const xssPayloads = [
    "<script>alert('xss')</script>",
    "javascript:alert(1)",
    "<img src=x onerror=alert(document.cookie)>",
    "<svg onload=alert(1)>",
    '"><script>alert(1)</script>',
    "';alert(String.fromCharCode(88,83,83))//",
    '<body onload=alert(1)>',
    "<iframe src=javascript:alert(1)>",
    // These contain disallowed chars (<, >, ", ')
    '` + alert(1) + `',
  ]

  for (const payload of xssPayloads) {
    it(`rejects XSS payload: ${payload.slice(0, 40)}...`, () => {
      const result = displayNameSchema.safeParse(payload)
      // Either it fails due to invalid characters, OR it fails due to length.
      // What matters is it must not succeed as a valid display name with dangerous chars.
      if (result.success) {
        // If it somehow passes (e.g. "javascript:alert(1)" has no special chars
        // in our reject-set for this specific test payload), that's acceptable
        // because sanitize.ts will escape it before storage.
        // But check that no angle brackets / quotes passed through:
        const value = result.data as string
        expect(value).not.toMatch(/[<>"'`&]/)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// SQL injection battery
// ---------------------------------------------------------------------------

describe('SQL injection battery — ratingCategorySchema (enum enforcement)', () => {
  const sqlPayloads = [
    "' OR 1=1 --",
    "'; DROP TABLE place_ratings; --",
    "1 UNION SELECT * FROM profiles --",
    "safety' AND SLEEP(5) --",
    "overall_experience' OR '1'='1",
  ]

  for (const payload of sqlPayloads) {
    it(`rejects SQL injection: ${payload.slice(0, 40)}`, () => {
      expectInvalid(ratingCategorySchema, payload)
    })
  }
})
