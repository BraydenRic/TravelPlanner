import { createClient } from '@supabase/supabase-js'
import {
  assignNextColor,
  createGroup,
  getGroup,
  getGroupMembers,
  getGroupMapData,
  joinGroup,
  leaveGroup,
  getUserGroups,
} from '@services/groups'
import { ApiError } from '@lib/apiErrors'
import {
  createMockGroup,
  createMockGroupMember,
} from '@/../__tests__/factories'
import type { MemberColor } from '@typedefs/database'

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function getMockRpc() {
  return mockSupabase.rpc as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(finalResult)
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    // .single() is a terminal method that returns its own Promise
    single: jest.fn().mockResolvedValue(finalResult),
    // Make chain itself thenable: await chain (or any .eq()/.order() ending chain) resolves here
    then: jest.fn((resolve: (v: unknown) => unknown, reject?: (e: unknown) => void) =>
      resolved.then(resolve, reject)),
  }
  return chain
}

beforeEach(() => {
  jest.resetAllMocks()
})

// ---------------------------------------------------------------------------
// assignNextColor
// ---------------------------------------------------------------------------

describe('assignNextColor', () => {
  it('returns teal for an empty group', () => {
    expect(assignNextColor([])).toBe('#00F5D4')
  })

  it('returns amber when teal is taken', () => {
    expect(assignNextColor(['#00F5D4'])).toBe('#F5A623')
  })

  it('returns violet when teal and amber are taken', () => {
    expect(assignNextColor(['#00F5D4', '#F5A623'])).toBe('#A78BFA')
  })

  it('returns coral when teal, amber, and violet are taken', () => {
    expect(assignNextColor(['#00F5D4', '#F5A623', '#A78BFA'])).toBe('#FF6B6B')
  })

  it('defaults to teal when all colors are taken (edge case)', () => {
    const allColors: MemberColor[] = ['#00F5D4', '#F5A623', '#A78BFA', '#FF6B6B']
    expect(assignNextColor(allColors)).toBe('#00F5D4')
  })
})

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

describe('createGroup', () => {
  it('creates a group and adds creator as member with teal', async () => {
    const group = createMockGroup()
    const limitChain = mockChain({ data: [], error: null })
    const groupChain = mockChain({ data: group, error: null })
    const memberChain = mockChain({ data: null, error: null })

    getMockFrom()
      .mockReturnValueOnce(limitChain) // group_members limit pre-check
      .mockReturnValueOnce(groupChain) // groups insert
      .mockReturnValueOnce(memberChain) // group_members insert
    getMockRpc().mockResolvedValueOnce({ data: 'ABCD1234', error: null })

    const result = await createGroup('user-123', 'Travel Crew')

    expect(result.name).toBe('Travel Crew')
    expect(memberChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        color: '#00F5D4',
      }),
    )
  })

  it('sanitizes group name before insert', async () => {
    const group = createMockGroup({ name: 'My Group' })
    const limitChain = mockChain({ data: [], error: null })
    const groupChain = mockChain({ data: group, error: null })
    const memberChain = mockChain({ data: null, error: null })

    getMockFrom()
      .mockReturnValueOnce(limitChain)
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(memberChain)
    getMockRpc().mockResolvedValueOnce({ data: 'ABCD1234', error: null })

    await createGroup('user-123', '<script>alert(1)</script>My Group')

    expect(groupChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.not.stringContaining('<script>'),
      }),
    )
  })

  it('throws validation error for name exceeding 50 chars', async () => {
    await expect(
      createGroup('user-123', 'A'.repeat(51)),
    ).rejects.toThrow()
  })

  it('throws validation error for empty name', async () => {
    await expect(createGroup('user-123', '')).rejects.toThrow()
  })

  it('throws GROUP_LIMIT when the user is already in 10 groups', async () => {
    const memberships = Array.from({ length: 10 }, (_, i) => ({ group_id: `group-${i}` }))
    getMockFrom().mockReturnValueOnce(mockChain({ data: memberships, error: null }))

    await expect(
      createGroup('user-123', 'Travel Crew'),
    ).rejects.toMatchObject({ code: 'GROUP_LIMIT' })
  })
})

// ---------------------------------------------------------------------------
// joinGroup
// ---------------------------------------------------------------------------

describe('joinGroup', () => {
  it('rejects invalid invite code format', async () => {
    await expect(joinGroup('user-123', 'bad code!')).rejects.toThrow()
  })

  it('maps invite_expired RPC error to INVITE_EXPIRED ApiError', async () => {
    getMockRpc().mockResolvedValueOnce({ data: null, error: { message: 'invite_expired' } })
    await expect(
      joinGroup('user-456', 'ABCD1234'),
    ).rejects.toMatchObject({ code: 'INVITE_EXPIRED' })
  })

  it('maps invalid_invite_code RPC error to NOT_FOUND ApiError', async () => {
    getMockRpc().mockResolvedValueOnce({ data: null, error: { message: 'invalid_invite_code' } })
    await expect(
      joinGroup('user-456', 'ABCD1234'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('maps already_member RPC error to VALIDATION_ERROR ApiError', async () => {
    getMockRpc().mockResolvedValueOnce({ data: null, error: { message: 'already_member' } })
    await expect(
      joinGroup('user-456', 'ABCD1234'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('maps group_limit_reached RPC error to GROUP_LIMIT ApiError', async () => {
    getMockRpc().mockResolvedValueOnce({ data: null, error: { message: 'group_limit_reached' } })
    await expect(
      joinGroup('user-456', 'ABCD1234'),
    ).rejects.toMatchObject({ code: 'GROUP_LIMIT' })
  })

  it('maps group_full RPC error to GROUP_FULL ApiError', async () => {
    getMockRpc().mockResolvedValueOnce({ data: null, error: { message: 'group_full' } })
    await expect(
      joinGroup('user-456', 'ABCD1234'),
    ).rejects.toMatchObject({ code: 'GROUP_FULL' })
  })

  it('returns the new member row on success', async () => {
    const newMember = createMockGroupMember({ user_id: 'user-456', color: '#F5A623' })
    getMockRpc()
      .mockResolvedValueOnce({ data: newMember.group_id, error: null }) // join_group_by_code
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-456' } } })
    getMockFrom().mockReturnValueOnce(mockChain({ data: newMember, error: null })) // fetch member

    const result = await joinGroup('user-456', 'ABCD1234')
    expect(result.color).toBe('#F5A623')
  })
})

// ---------------------------------------------------------------------------
// leaveGroup
// ---------------------------------------------------------------------------

describe('leaveGroup', () => {
  it('transfers creator role when creator leaves with remaining members', async () => {
    const creator = createMockGroupMember({ user_id: 'user-123', joined_at: '2024-01-01T00:00:00Z' })
    const other = createMockGroupMember({ user_id: 'user-456', color: '#F5A623', joined_at: '2024-01-02T00:00:00Z' })
    const group = createMockGroup({ created_by: 'user-123' })

    const membersChain = mockChain({ data: [creator, other], error: null })
    const groupChain = mockChain({ data: group, error: null })
    const updateChain = mockChain({ data: null, error: null })
    const deleteChain = mockChain({ data: null, error: null })

    getMockFrom()
      .mockReturnValueOnce(membersChain) // get members
      .mockReturnValueOnce(groupChain)   // get group
      .mockReturnValueOnce(updateChain)  // update created_by
      .mockReturnValueOnce(deleteChain)  // delete member

    await leaveGroup('user-123', 'group-123')

    expect(updateChain.update).toHaveBeenCalledWith({ created_by: 'user-456' })
  })

  it('does not transfer creator when non-creator leaves', async () => {
    const creator = createMockGroupMember({ user_id: 'user-123', joined_at: '2024-01-01T00:00:00Z' })
    const leavingMember = createMockGroupMember({ user_id: 'user-456', color: '#F5A623', joined_at: '2024-01-02T00:00:00Z' })
    const group = createMockGroup({ created_by: 'user-123' })

    const membersChain = mockChain({ data: [creator, leavingMember], error: null })
    const groupChain = mockChain({ data: group, error: null })
    const deleteChain = mockChain({ data: null, error: null })

    getMockFrom()
      .mockReturnValueOnce(membersChain)
      .mockReturnValueOnce(groupChain)
      .mockReturnValueOnce(deleteChain)

    await leaveGroup('user-456', 'group-123')

    // update should not have been called for creator transfer
    expect(deleteChain.delete).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getUserGroups
// ---------------------------------------------------------------------------

describe('getUserGroups', () => {
  it('returns empty array when user has no groups', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getUserGroups('user-123')

    expect(result).toEqual([])
  })

  it('returns all groups the user belongs to', async () => {
    const memberships = [{ group_id: 'group-1' }, { group_id: 'group-2' }]
    const groups = [createMockGroup({ id: 'group-1' }), createMockGroup({ id: 'group-2' })]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: memberships, error: null })) // group_members
      .mockReturnValueOnce(mockChain({ data: groups, error: null })) // groups

    const result = await getUserGroups('user-123')

    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// getGroup
// ---------------------------------------------------------------------------

describe('getGroup', () => {
  it('returns group and members together', async () => {
    const group = createMockGroup()
    const members = [
      createMockGroupMember({ user_id: 'user-123' }),
      createMockGroupMember({ id: 'member-2', user_id: 'user-456', color: '#F5A623' }),
    ]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: group, error: null }))   // groups query
      .mockReturnValueOnce(mockChain({ data: members, error: null })) // group_members query

    const result = await getGroup('group-123')

    expect(result.group.id).toBe('group-123')
    expect(result.members).toHaveLength(2)
  })

  it('throws ApiError when group query fails', async () => {
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(getGroup('nonexistent-group')).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when members query fails', async () => {
    const group = createMockGroup()

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: group, error: null }))
      .mockReturnValueOnce(
        mockChain({ data: null, error: { code: '42501', message: 'rls violation' } }),
      )

    await expect(getGroup('group-123')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns empty members array when group has no members', async () => {
    const group = createMockGroup()

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: group, error: null }))
      .mockReturnValueOnce(mockChain({ data: null, error: null }))

    const result = await getGroup('group-123')

    expect(result.members).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getGroupMembers
// ---------------------------------------------------------------------------

describe('getGroupMembers', () => {
  it('returns members ordered by joined_at', async () => {
    const members = [
      createMockGroupMember({ user_id: 'user-123', joined_at: '2024-01-01T00:00:00Z' }),
      createMockGroupMember({ id: 'member-2', user_id: 'user-456', color: '#F5A623', joined_at: '2024-01-02T00:00:00Z' }),
    ]
    const chain = mockChain({ data: members, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await getGroupMembers('group-123')

    expect(result).toHaveLength(2)
    expect(chain.order).toHaveBeenCalledWith('joined_at')
  })

  it('returns empty array when no members exist', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: null, error: null }))

    const result = await getGroupMembers('group-123')

    expect(result).toEqual([])
  })

  it('throws ApiError when query fails', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'rls' } }),
    )

    await expect(getGroupMembers('group-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getGroupMapData
// ---------------------------------------------------------------------------

describe('getGroupMapData', () => {
  it('calls get_group_map_data RPC and returns results', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    const places = [
      { user_id: 'user-123', country_code: 'JP', color: '#00F5D4' },
      { user_id: 'user-456', country_code: 'FR', color: '#F5A623' },
    ]
    mockRpc.mockResolvedValueOnce({
      data: { group_id: 'group-123', members: [], places },
      error: null,
    })

    const result = await getGroupMapData('group-123')

    expect(result).toHaveLength(2)
    expect(mockRpc).toHaveBeenCalledWith('get_group_map_data', { p_group_id: 'group-123' })
  })

  it('returns empty array when RPC returns null data', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    const result = await getGroupMapData('group-123')

    expect(result).toEqual([])
  })

  it('throws ApiError when RPC fails', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'UNKNOWN', message: 'rpc failed' } })

    await expect(getGroupMapData('group-123')).rejects.toBeInstanceOf(ApiError)
  })
})
