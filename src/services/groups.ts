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
  // Sanitize first, then validate the clean result
  const sanitizedName = sanitizeGroupName(name)
  groupNameSchema.parse(sanitizedName)

  // Generate invite code (32 hex chars = 16 bytes entropy)
  const inviteCode = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: sanitizedName,
      created_by: userId,
      invite_code: inviteCode,
      invite_expires_at: inviteExpiresAt,
      color_scheme: {},
    })
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .single()

  if (groupError) throw handleSupabaseError(groupError)

  // Add creator as first member with teal color
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: (group as Group).id,
    user_id: userId,
    color: '#00F5D4' as MemberColor,
  })

  if (memberError) throw handleSupabaseError(memberError)

  return group as Group
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

export async function joinGroup(userId: string, inviteCode: string): Promise<GroupMember> {
  // Validate invite code format
  inviteCodeSchema.parse(inviteCode)

  // Find group by invite code
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, created_by, invite_code, invite_expires_at, color_scheme, created_at')
    .eq('invite_code', inviteCode)
    .single()

  if (groupError) throw handleSupabaseError(groupError)

  const typedGroup = group as Group

  // Check invite expiry
  if (!typedGroup.invite_expires_at || new Date(typedGroup.invite_expires_at) < new Date()) {
    throw new ApiError('INVITE_EXPIRED', 'This invite link has expired')
  }

  // Check existing members
  const { data: existingMembers, error: membersError } = await supabase
    .from('group_members')
    .select('id, user_id, color, joined_at')
    .eq('group_id', typedGroup.id)

  if (membersError) throw handleSupabaseError(membersError)

  const members = (existingMembers ?? []) as { id: string; user_id: string; color: string; joined_at: string }[]

  // Check if already a member
  if (members.some((m) => m.user_id === userId)) {
    throw new ApiError('VALIDATION_ERROR', 'You are already a member of this group')
  }

  // Check group is not full
  if (members.length >= 4) {
    throw new ApiError('GROUP_FULL', 'This group is full (max 4 members)')
  }

  // Assign next available color
  const usedColors = members.map((m) => m.color as MemberColor)
  const color = assignNextColor(usedColors)

  const { data: member, error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: typedGroup.id,
      user_id: userId,
      color,
    })
    .select('id, group_id, user_id, color, joined_at')
    .single()

  if (insertError) throw handleSupabaseError(insertError)

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
  userId: string,
  groupId: string,
): Promise<string> {
  // Verify user is the creator
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, created_by')
    .eq('id', groupId)
    .eq('created_by', userId)
    .single()

  if (groupError) throw handleSupabaseError(groupError)
  if (!group) throw new ApiError('FORBIDDEN', 'Only the group creator can regenerate the invite code')

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await supabase
    .from('groups')
    .update({ invite_code: newCode, invite_expires_at: newExpiry })
    .eq('id', groupId)

  if (updateError) throw handleSupabaseError(updateError)

  return newCode
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
