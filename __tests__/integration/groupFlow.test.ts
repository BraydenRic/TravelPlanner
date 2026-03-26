/**
 * Integration: group collaboration flow
 *
 * Tests the full chain: create group → generate invite → join → membership checks.
 * All Supabase calls are mocked; real service logic is exercised end-to-end.
 */

import { createClient } from '@supabase/supabase-js'
import {
  createGroup,
  generateNewInviteCode,
  joinGroup,
  leaveGroup,
  assignNextColor,
  MEMBER_COLORS,
} from '@services/groups'
import { getGroupCountryRatings } from '@services/ratings'
import { ApiError } from '@lib/apiErrors'
import {
  createMockGroup,
  createMockGroupMember,
  createMockCountryRatings,
} from '@/../__tests__/factories'
import type { MemberColor } from '@typedefs/database'

// ---------------------------------------------------------------------------
// Setup
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

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Full join flow
// ---------------------------------------------------------------------------

describe('Group flow — full join flow', () => {
  it('User A creates group, User B joins via valid invite code', async () => {
    const group = createMockGroup({
      id: 'group-abc',
      created_by: 'user-A',
      invite_code: 'aabbccdd11223344aabbccdd11223344',
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // createGroup: insert group → insert member
    const groupChain = mockChain({ data: group, error: null })
    groupChain.select = jest.fn().mockReturnThis()
    groupChain.single = jest.fn().mockResolvedValue({ data: group, error: null })
    getMockFrom().mockReturnValueOnce(groupChain)
    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null })) // insert creator member

    const created = await createGroup('user-A', 'Travel Crew')
    expect(created.id).toBe('group-abc')
    expect(created.invite_code).toMatch(/^[0-9a-f]{32}$/)

    // joinGroup: find group by code → check members → insert new member
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: group, error: null }), // group lookup
    )
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: [], error: null }), // existing members (none)
    )

    const newMember = createMockGroupMember({ user_id: 'user-B', group_id: 'group-abc', color: '#F5A623' })
    const insertChain = mockChain({ data: newMember, error: null })
    insertChain.select = jest.fn().mockReturnThis()
    insertChain.single = jest.fn().mockResolvedValue({ data: newMember, error: null })
    getMockFrom().mockReturnValueOnce(insertChain)

    const member = await joinGroup('user-B', 'aabbccdd11223344aabbccdd11223344')
    expect(member.user_id).toBe('user-B')
    expect(member.group_id).toBe('group-abc')
  })

  it('generates a new invite code and returns a 32-char hex string', async () => {
    // generateNewInviteCode: verify creator → update
    const creatorCheckChain = mockChain({ data: { id: 'group-abc', created_by: 'user-A' }, error: null })
    getMockFrom().mockReturnValueOnce(creatorCheckChain)
    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null })) // update

    const newCode = await generateNewInviteCode('user-A', 'group-abc')
    expect(newCode).toHaveLength(32)
    expect(newCode).toMatch(/^[0-9a-f]{32}$/)
  })
})

// ---------------------------------------------------------------------------
// getGroupCountryRatings returns per-member data
// ---------------------------------------------------------------------------

describe('Group flow — getGroupCountryRatings', () => {
  it('calls compute_group_country_ratings RPC and maps response', async () => {
    const countryRatings = createMockCountryRatings('JP')
    ;(mockSupabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: {
        group_average: countryRatings.categories,
        group_overall: 4.2,
        member_ratings: [
          { user_id: 'user-A', color: '#00F5D4', ratings: countryRatings.categories, overall: 4.2 },
          { user_id: 'user-B', color: '#F5A623', ratings: countryRatings.categories, overall: 3.8 },
        ],
      },
      error: null,
    })

    const result = await getGroupCountryRatings('group-abc', 'JP')
    expect(result.country_code).toBe('JP')
    expect(result.group_overall).toBe(4.2)
    expect(result.member_ratings).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Expired invite code
// ---------------------------------------------------------------------------

describe('Group flow — expired invite', () => {
  it('throws INVITE_EXPIRED when invite_expires_at is in the past', async () => {
    const expiredGroup = createMockGroup({
      invite_code: 'aabbccdd11223344aabbccdd11223344',
      invite_expires_at: new Date(Date.now() - 1000).toISOString(), // already expired
    })

    getMockFrom().mockReturnValueOnce(mockChain({ data: expiredGroup, error: null }))

    await expect(
      joinGroup('user-B', 'aabbccdd11223344aabbccdd11223344'),
    ).rejects.toMatchObject({ code: 'INVITE_EXPIRED' })
  })
})

// ---------------------------------------------------------------------------
// Group full — 5th user cannot join
// ---------------------------------------------------------------------------

describe('Group flow — GROUP_FULL', () => {
  it('throws GROUP_FULL when group already has 4 members', async () => {
    const group = createMockGroup({
      invite_code: 'aabbccdd11223344aabbccdd11223344',
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const fourMembers = MEMBER_COLORS.map((color, i) =>
      createMockGroupMember({ user_id: `user-${i + 1}`, color }),
    )

    getMockFrom().mockReturnValueOnce(mockChain({ data: group, error: null })) // group lookup
    getMockFrom().mockReturnValueOnce(mockChain({ data: fourMembers, error: null })) // members

    await expect(
      joinGroup('user-5', 'aabbccdd11223344aabbccdd11223344'),
    ).rejects.toMatchObject({ code: 'GROUP_FULL' })
  })
})

// ---------------------------------------------------------------------------
// Creator leaves — role transferred to oldest remaining member
// ---------------------------------------------------------------------------

describe('Group flow — creator leaves', () => {
  it('transfers creator role to oldest remaining member when creator leaves', async () => {
    const group = createMockGroup({ id: 'group-transfer', created_by: 'user-A' })

    const members = [
      createMockGroupMember({ user_id: 'user-A', joined_at: '2024-01-01T00:00:00Z' }),
      createMockGroupMember({ id: 'member-B', user_id: 'user-B', joined_at: '2024-01-02T00:00:00Z' }),
      createMockGroupMember({ id: 'member-C', user_id: 'user-C', joined_at: '2024-01-03T00:00:00Z' }),
    ]

    // leaveGroup: get members → get group → update creator → delete member
    getMockFrom().mockReturnValueOnce(mockChain({ data: members, error: null }))
    getMockFrom().mockReturnValueOnce(mockChain({ data: group, error: null }))

    const updateChain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValueOnce(updateChain)
    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null })) // delete

    await leaveGroup('user-A', 'group-transfer')

    // The update call should have transferred creator to user-B (oldest remaining)
    expect(updateChain.update).toHaveBeenCalledWith({ created_by: 'user-B' })
  })
})

// ---------------------------------------------------------------------------
// Color assignment: 4 members each get a different color
// ---------------------------------------------------------------------------

describe('Group flow — color assignment', () => {
  it('assigns 4 unique colors to 4 members', () => {
    const assigned: MemberColor[] = []
    for (let i = 0; i < 4; i++) {
      const color = assignNextColor(assigned)
      expect(assigned).not.toContain(color)
      assigned.push(color)
    }
    // All 4 should be distinct
    const unique = new Set(assigned)
    expect(unique.size).toBe(4)
  })

  it('assignNextColor returns first unused color in order', () => {
    expect(assignNextColor([])).toBe('#00F5D4')
    expect(assignNextColor(['#00F5D4'])).toBe('#F5A623')
    expect(assignNextColor(['#00F5D4', '#F5A623'])).toBe('#A78BFA')
    expect(assignNextColor(['#00F5D4', '#F5A623', '#A78BFA'])).toBe('#FF6B6B')
  })

  it('falls back to teal when all colors are taken', () => {
    const allColors = MEMBER_COLORS as MemberColor[]
    const fallback = assignNextColor([...allColors])
    expect(fallback).toBe('#00F5D4')
  })
})

// ---------------------------------------------------------------------------
// Invalid invite code format
// ---------------------------------------------------------------------------

describe('Group flow — invite code validation', () => {
  it('throws validation error for invite code shorter than 32 chars', async () => {
    await expect(joinGroup('user-X', 'tooshort')).rejects.toThrow()
  })

  it('throws validation error for invite code with non-hex characters', async () => {
    await expect(
      joinGroup('user-X', 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ'),
    ).rejects.toThrow()
  })
})
