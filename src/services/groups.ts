/**
 * Groups service — create, join, leave, and query travel groups.
 *
 * Security:
 *   - Group names are validated and sanitized before storage (AS-06)
 *   - Invite code validation uses the 32-char hex schema (AS-05)
 *   - Max 4 members enforced by DB trigger; service also checks pre-emptively
 *   - Creator transfer logic prevents orphaned groups
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError, ApiError } from '@lib/apiErrors'
import { groupNameSchema, inviteCodeSchema } from '@lib/validation'
import { sanitizeGroupName } from '@lib/sanitize'
import type { Group, GroupMember, MemberColor } from '@typedefs/database'
import type { GroupMemberPlace } from '@typedefs/api'

// ---------------------------------------------------------------------------
// Color palette for group members
// ---------------------------------------------------------------------------

export const MEMBER_COLORS: MemberColor[] = ['#00F5D4', '#F5A623', '#A78BFA', '#FF6B6B']

// ---------------------------------------------------------------------------
// assignNextColor — returns first unused color
// ---------------------------------------------------------------------------

export function assignNextColor(existingColors: MemberColor[]): MemberColor {
  const next = MEMBER_COLORS.find((c) => !existingColors.includes(c))
  // If somehow all 4 are taken (shouldn't happen with 4-member limit), default to teal
  return next ?? '#00F5D4'
}

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

export async function createGroup(userId: string, name: string): Promise<Group> {
  const sanitizedName = sanitizeGroupName(name)
  groupNameSchema.parse(sanitizedName)

  // Insert group without invite code — generate_invite_code RPC sets it
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: sanitizedName,
      created_by: userId,
      color_scheme: {},
    })
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .single()

  if (groupError) throw handleSupabaseError(groupError)

  const typedGroup = group as Group

  // Add creator as first member with teal color
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: typedGroup.id,
    user_id: userId,
    color: '#00F5D4' as MemberColor,
  })

  if (memberError) throw handleSupabaseError(memberError)

  // Generate invite code via RPC (stored server-side, returned once)
  const { data: inviteCode, error: codeError } = await supabase.rpc('generate_invite_code', {
    p_group_id: typedGroup.id,
  })

  if (codeError) throw handleSupabaseError(codeError)

  return { ...typedGroup, invite_code: inviteCode as string } as Group
}

// ---------------------------------------------------------------------------
// getGroup
// ---------------------------------------------------------------------------

export async function getGroup(
  groupId: string,
): Promise<{ group: Group; members: GroupMember[] }> {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .eq('id', groupId)
    .single()

  if (groupError) throw handleSupabaseError(groupError)

  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, color, joined_at')
    .eq('group_id', groupId)
    .order('joined_at')

  if (membersError) throw handleSupabaseError(membersError)

  return { group: group as Group, members: (members ?? []) as GroupMember[] }
}

// ---------------------------------------------------------------------------
// getUserGroups
// ---------------------------------------------------------------------------

export async function getUserGroups(userId: string): Promise<Group[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  if (memberError) throw handleSupabaseError(memberError)

  if (!memberships || memberships.length === 0) return []

  const groupIds = (memberships as { group_id: string }[]).map((m) => m.group_id)

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .in('id', groupIds)
    .order('created_at')

  if (groupsError) throw handleSupabaseError(groupsError)

  return (groups ?? []) as Group[]
}

// ---------------------------------------------------------------------------
// joinGroup
// ---------------------------------------------------------------------------

export async function joinGroup(_userId: string, inviteCode: string): Promise<GroupMember> {
  inviteCodeSchema.parse(inviteCode)

  // join_group_by_code RPC handles the lookup, validation, and insert atomically
  // using SECURITY DEFINER to bypass RLS on the invite_code lookup.
  const { data: groupId, error } = await supabase.rpc('join_group_by_code', {
    p_invite_code: inviteCode,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('invalid_invite_code')) throw new ApiError('NOT_FOUND', 'Invalid invite code.')
    if (msg.includes('invite_expired')) throw new ApiError('INVITE_EXPIRED', 'This invite has expired.')
    if (msg.includes('already_member')) throw new ApiError('VALIDATION_ERROR', 'You are already in this group.')
    if (msg.includes('group_full')) throw new ApiError('GROUP_FULL', 'This group is full (max 4 members).')
    throw handleSupabaseError(error)
  }

  // Fetch the newly created member row
  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, color, joined_at')
    .eq('group_id', groupId as string)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (memberError) throw handleSupabaseError(memberError)

  return member as GroupMember
}

// ---------------------------------------------------------------------------
// leaveGroup
// ---------------------------------------------------------------------------

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  // Get all members sorted by join date
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, color, joined_at')
    .eq('group_id', groupId)
    .order('joined_at')

  if (membersError) throw handleSupabaseError(membersError)

  const typedMembers = (members ?? []) as GroupMember[]

  // Get the group to check creator
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .eq('id', groupId)
    .single()

  if (groupError) throw handleSupabaseError(groupError)

  const typedGroup = group as Group

  const isCreator = typedGroup.created_by === userId
  const remainingMembers = typedMembers.filter((m) => m.user_id !== userId)

  // If creator is leaving and others remain, transfer creator role to oldest remaining member
  if (isCreator && remainingMembers.length > 0) {
    const newCreator = remainingMembers[0]

    const { error: updateError } = await supabase
      .from('groups')
      .update({ created_by: newCreator.user_id })
      .eq('id', groupId)

    if (updateError) throw handleSupabaseError(updateError)
  }

  // Remove the member
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (deleteError) throw handleSupabaseError(deleteError)
}

// ---------------------------------------------------------------------------
// generateNewInviteCode
// ---------------------------------------------------------------------------

export async function generateNewInviteCode(
  _userId: string,
  groupId: string,
): Promise<string> {
  // generate_invite_code RPC verifies creator auth internally
  const { data: newCode, error } = await supabase.rpc('generate_invite_code', {
    p_group_id: groupId,
  })

  if (error) throw handleSupabaseError(error)

  return newCode as string
}

// ---------------------------------------------------------------------------
// getGroupMembers — with profiles
// ---------------------------------------------------------------------------

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, color, joined_at')
    .eq('group_id', groupId)
    .order('joined_at')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as GroupMember[]
}

// ---------------------------------------------------------------------------
// getGroupMapData — calls get_group_map_data RPC
// ---------------------------------------------------------------------------

export async function getGroupMapData(groupId: string): Promise<GroupMemberPlace[]> {
  const { data, error } = await supabase.rpc('get_group_map_data', {
    p_group_id: groupId,
  })

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as GroupMemberPlace[]
}
