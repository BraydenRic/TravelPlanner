/**
 * Edit Profile screen — update display name.
 */

import React, { useCallback, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@stores/authStore'
import { updateProfile } from '@services/profiles'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { GlassPanel } from '@components/ui/GlassPanel'
import { SpringButton } from '@components/ui/SpringButton'

export default function EditProfileScreen() {
  const { user, profile, setProfile } = useAuthStore()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    const trimmed = displayName.trim()
    if (!trimmed) {
      Alert.alert('Display name required', 'Please enter a display name.')
      return
    }
    if (trimmed.length > 30) {
      Alert.alert('Too long', 'Display name must be 30 characters or less.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateProfile(user.id, { display_name: trimmed })
      setProfile(updated)
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }, [user, displayName, setProfile])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top nav */}
        <View style={styles.topNav}>
          <GlassPanel style={styles.backBtn}>
            <Pressable onPress={handleBack} style={styles.backPressable}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backLabel}>Profile</Text>
            </Pressable>
          </GlassPanel>
        </View>

        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update how you appear to others.</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {(displayName[0] ?? profile?.display_name?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Display name field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => { void handleSave() }}
          />
          <Text style={styles.charCount}>{displayName.length}/30</Text>
        </View>

        {/* Email (read-only) */}
        {user?.email && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{user.email}</Text>
            </View>
            <Text style={styles.fieldHint}>Email cannot be changed here.</Text>
          </View>
        )}

        <SpringButton
          variant="primary"
          onPress={() => { void handleSave() }}
          style={styles.saveBtn}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </SpringButton>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topNav: {
    paddingTop: spacing.xxl + spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backArrow: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  backLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.bgL2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.accentTeal,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    minHeight: 52,
  },
  charCount: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: colors.bgL1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textTertiary,
  },
  fieldHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
})
