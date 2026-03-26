/**
 * Delete account screen — type "DELETE" confirmation.
 */

import React, { useCallback, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { GlassPanel } from '@components/ui/GlassPanel'
import { SpringButton } from '@components/ui/SpringButton'

const WHAT_WILL_BE_DELETED = [
  'Your profile and display name',
  'All visited places and ratings',
  'All photos you\'ve uploaded',
  'Your travel timeline',
  'Group memberships',
]

export default function DeleteAccountScreen() {
  const [confirmText, setConfirmText] = useState('')
  const isConfirmed = confirmText === 'DELETE'

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }, [])

  const handleDelete = useCallback(() => {
    if (!isConfirmed) return
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    // Deletion handled by auth service
  }, [isConfirmed])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <GlassPanel style={styles.backBtn}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </GlassPanel>

      <View style={styles.warningBlock}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.title}>Delete Account</Text>
        <Text style={styles.subtitle}>
          This action is permanent and cannot be undone.
        </Text>
      </View>

      <GlassPanel style={styles.listCard}>
        <Text style={styles.listTitle}>What will be deleted:</Text>
        {WHAT_WILL_BE_DELETED.map((item) => (
          <View key={item} style={styles.listItem}>
            <Text style={styles.listBullet}>·</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </GlassPanel>

      <View style={styles.confirmSection}>
        <Text style={styles.confirmLabel}>
          Type <Text style={styles.confirmKeyword}>DELETE</Text> to confirm:
        </Text>
        <TextInput
          style={styles.confirmInput}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder="DELETE"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
      </View>

      <SpringButton
        variant="primary"
        onPress={handleDelete}
        disabled={!isConfirmed}
        style={[styles.deleteBtn, !isConfirmed && styles.deleteBtnDisabled]}
      >
        Delete My Account
      </SpringButton>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  content: {
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  backPressable: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  warningBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningIcon: {
    fontSize: 48,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.danger,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  listTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 24,
    alignItems: 'flex-start',
  },
  listBullet: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.danger,
    marginTop: 1,
  },
  listText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  confirmSection: {
    gap: spacing.sm,
  },
  confirmLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  confirmKeyword: {
    fontFamily: fontFamily.mono,
    color: colors.danger,
  },
  confirmInput: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `rgba(239,68,68,0.4)`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.danger,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    height: 52,
    letterSpacing: 3,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
  },
  deleteBtnDisabled: {
    backgroundColor: colors.bgL3,
  },
})
