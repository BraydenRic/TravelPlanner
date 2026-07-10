/**
 * Explore screen — Browse countries by continent, search, top rated.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { COUNTRIES, CONTINENTS } from '@constants/countries'
import { SearchBar, type SearchBarHandle } from '@components/layout/SearchBar'
import { CategoryBadge } from '@components/ui/CategoryBadge'
import { usePlacesStore } from '@stores/placesStore'
import type { PlaceCategory } from '@typedefs/database'

const ALL_CONTINENTS = ['All', ...CONTINENTS] as const

export default function ExploreScreen() {
  const [activeContinent, setActiveContinent] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const { places } = usePlacesStore()
  const { width } = useWindowDimensions()
  const numColumns = width >= 768 ? 2 : 1

  const visitedMap = useMemo(() => {
    const m = new Map<string, PlaceCategory>()
    places.forEach((p) => m.set(p.country_code, p.category))
    return m
  }, [places])

  const filteredCountries = useMemo(() => {
    let list = COUNTRIES
    if (activeContinent !== 'All') {
      list = list.filter((c) => c.continent === activeContinent)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q),
      )
    }
    return list
  }, [activeContinent, searchQuery])

  const handleContinentPress = useCallback((cont: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync()
    setActiveContinent(cont)
  }, [])

  const handleCountryPress = useCallback((code: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/country/${code}`)
  }, [])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
  }, [])

  const searchRef = useRef<SearchBarHandle>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const dismissSearch = useCallback(() => searchRef.current?.collapse(), [])

  const renderCountryItem = useCallback(
    ({ item: country }: { item: typeof COUNTRIES[number] }) => {
      const visitStatus = visitedMap.get(country.code)
      return (
        <Pressable
          key={country.code}
          onPress={() => handleCountryPress(country.code)}
          style={styles.countryCard}
          accessibilityRole="button"
          accessibilityLabel={country.name}
        >
          <View style={styles.cardInner}>
            <Image
              source={{ uri: `https://flagcdn.com/w80/${country.code.toLowerCase()}.png` }}
              style={styles.flagImg}
              resizeMode="cover"
            />
            <View style={styles.cardMeta}>
              <Text style={styles.cardName} numberOfLines={1}>
                {country.name}
              </Text>
              <Text style={styles.cardContinent}>{country.continent}</Text>
            </View>
            {visitStatus && (
              <CategoryBadge
                category={visitStatus}
                style={styles.cardBadge}
              />
            )}
          </View>
        </Pressable>
      )
    },
    [visitedMap, handleCountryPress],
  )

  return (
    <View style={styles.container}>
      {/* Tap-away backdrop — closes the search when tapping anywhere else.
          The typed filter stays applied to the list after dismissal. */}
      {searchExpanded && (
        <Pressable
          style={styles.searchBackdrop}
          onPress={dismissSearch}
          accessibilityLabel="Close search"
        />
      )}

      {/* Header — the expanded bar (260pt) + title don't fit side by side on
          a phone, so the search takes over the row while open */}
      <View style={styles.header}>
        {!searchExpanded && <Text style={styles.title}>Explore</Text>}
        {/* No onCountrySelect here on purpose: explore shows matches by
            live-filtering the country cards below, not an attached dropdown */}
        <SearchBar
          ref={searchRef}
          onSearch={handleSearch}
          onExpandedChange={setSearchExpanded}
          placeholder="Search countries..."
        />
      </View>

      {/* Continent filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.continentRow}
        style={styles.continentScroll}
      >
        {ALL_CONTINENTS.map((cont) => (
          <Pressable
            key={cont}
            onPress={() => handleContinentPress(cont)}
            style={[
              styles.continentChip,
              activeContinent === cont && styles.continentChipActive,
            ]}
            accessibilityRole="tab"
          >
            <Text
              style={[
                styles.continentLabel,
                activeContinent === cont && styles.continentLabelActive,
              ]}
            >
              {cont}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Country list */}
      <FlashList
        data={filteredCountries}
        renderItem={renderCountryItem}
        keyExtractor={(item) => item.code}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    // Above the search backdrop so the open bar stays interactive
    zIndex: 20,
  },
  searchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  continentScroll: {
    flexGrow: 0,
  },
  continentRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  continentChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgL2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 36,
    justifyContent: 'center',
  },
  continentChipActive: {
    backgroundColor: colors.tealAlpha15,
    borderColor: colors.accentTeal,
  },
  continentLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  continentLabelActive: {
    color: colors.accentTeal,
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + spacing.xxxl,
  },
  countryCard: {
    flex: 1,
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 68,
  },
  flagImg: {
    width: 52,
    height: 36,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  cardMeta: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  cardContinent: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  cardBadge: {
    alignSelf: 'center',
  },
})
