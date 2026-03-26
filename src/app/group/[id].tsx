/**
 * Group detail — combined map, member roster, top-rated leaderboard.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/groupStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { GlassPanel } from '@components/ui/GlassPanel'
import { WorldMap } from '@components/map/WorldMap'
import { sanitizeGroupName } from '@lib/sanitize'

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { groups, groupMembers, groupMapData } = useGroupStore()
  const [activeTab, setActiveTab] = useState<'map' | 'ratings'>('map')

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id])
  const members = groupMembers[id] ?? []
  const mapData = groupMapData[id] ?? []

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }, [])

  const groupName = group ? sanitizeGroupName(group.name) : 'Group'

  return (
    <View style={styles.container}>
      {/* Back */}
      <View style={styles.topBar}>
        <GlassPanel style={styles.backBtn}>
          <Pressable onPress={handleBack} style={styles.backPressable}>
            <Text style={styles.backText}>← Groups</Text>
          </Pressable>
        </GlassPanel>
        <Text style={styles.groupName}>{groupName}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['map', 'ratings'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync()
              setActiveTab(tab)
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'map' ? 'Map' : 'Ratings'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'map' && (
        <View style={styles.mapContainer}>
          <WorldMap
            visitedCountries={[]}
            activeCategory="been"
            groupMapData={mapData}
            onCountryPress={() => {}}
          />
        </View>
      )}

      {activeTab === 'ratings' && (
        <ScrollView contentContainerStyle={styles.ratingsContent}>
          {/* Member roster */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members</Text>
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={[styles.memberDot, { backgroundColor: m.color }]} />
                <Text style={styles.memberName}>{m.user_id}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
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
  groupName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: -0.3,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomColor: colors.accentTeal,
  },
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.accentTeal,
  },
  mapContainer: {
    flex: 1,
  },
  ratingsContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  memberName: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
})
