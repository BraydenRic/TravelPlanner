/**
 * SearchBar — Expandable search bar with glass results dropdown.
 * Collapses to icon, expands with spring animation.
 */

import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Path, Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { colors } from '@theme/colors'
import { borderRadius, borderWidth, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { COUNTRIES } from '@constants/countries'
import type { CountryEntry } from '@constants/countries'

interface SearchBarProps {
  onSearch: (query: string) => void
  onCountrySelect?: (code: string) => void
  /** Fires when the bar expands/collapses — lets the host screen show a
      tap-away backdrop (touches outside this small overlay can't be caught
      from inside it, so dismissal has to live at screen level). */
  onExpandedChange?: (expanded: boolean) => void
  placeholder?: string
  style?: object
}

export interface SearchBarHandle {
  collapse: () => void
}

const EXPANDED_WIDTH = 260
const COLLAPSED_WIDTH = 44

const SearchBarInner = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBarInner({
  onSearch,
  onCountrySelect,
  onExpandedChange,
  placeholder = 'Search countries...',
}: SearchBarProps, ref) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CountryEntry[]>([])
  const inputRef = useRef<TextInput>(null)
  const widthAnim = useSharedValue(COLLAPSED_WIDTH)

  const expand = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpanded(true)
    onExpandedChange?.(true)
    widthAnim.value = withSpring(EXPANDED_WIDTH, springs.standard)
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [widthAnim, onExpandedChange])

  const collapse = useCallback(() => {
    Keyboard.dismiss()
    onExpandedChange?.(false)
    widthAnim.value = withSpring(COLLAPSED_WIDTH, springs.standard)
    setTimeout(() => {
      setExpanded(false)
      setQuery('')
      setResults([])
    }, 200)
  }, [widthAnim, onExpandedChange])

  useImperativeHandle(ref, () => ({ collapse }), [collapse])

  const handleTextChange = useCallback(
    (text: string) => {
      setQuery(text)
      onSearch(text)

      if (text.length > 0) {
        const filtered = COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(text.toLowerCase()),
        ).slice(0, 6)
        setResults(filtered)
      } else {
        setResults([])
      }
    },
    [onSearch],
  )

  const animatedContainerStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
  }))

  const renderResult = useCallback(
    ({ item }: { item: CountryEntry }) => {
      const matchIndex = item.name.toLowerCase().indexOf(query.toLowerCase())

      return (
        <Pressable
          onPress={() => {
            onCountrySelect?.(item.code)
            onSearch(item.name)
            collapse()
          }}
          style={styles.resultItem}
        >
          <View style={styles.resultCodeBox}>
            <Text style={styles.resultCode}>{item.code}</Text>
          </View>
          <Text style={styles.resultName}>
            {matchIndex >= 0 ? (
              <>
                <Text style={styles.resultName}>{item.name.slice(0, matchIndex)}</Text>
                <Text style={[styles.resultName, styles.highlight]}>
                  {item.name.slice(matchIndex, matchIndex + query.length)}
                </Text>
                <Text style={styles.resultName}>{item.name.slice(matchIndex + query.length)}</Text>
              </>
            ) : (
              item.name
            )}
          </Text>
        </Pressable>
      )
    },
    [query, onSearch, onCountrySelect, collapse],
  )

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
        ]}
      >
        {/* Text input spans full width; icon overlays on top-left */}
        {expanded && (
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={() => {
              onSearch(query)
              collapse()
            }}
          />
        )}

        {/* Search icon — absolutely positioned, no DOM boundary with input */}
        <Pressable
          onPress={expanded ? collapse : expand}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Close search' : 'Open search'}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle
              cx={11}
              cy={11}
              r={8}
              fill="none"
              stroke={colors.textSecondary}
              strokeWidth={1.8}
            />
            <Path
              d="M21 21 L16.65 16.65"
              stroke={colors.textSecondary}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </Animated.View>

      {/* Results dropdown — only when a selection handler is provided (e.g. map, not explore) */}
      {expanded && results.length > 0 && onCountrySelect && (
        <View style={styles.dropdown}>
          <FlashList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.code}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
  container: {
    height: 44,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.full,
    borderWidth: borderWidth.thin,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } as Record<string, string>,
      // Native has no backdrop blur, so the glass alpha reads as plain
      // transparency and whatever the expanded bar overlaps (the category
      // tabs) shows through the input. Use the solid card color instead.
      default: { backgroundColor: colors.bgL1 },
    }),
  },
  iconButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...Platform.select({
      web: { outline: 'none' } as Record<string, unknown>,
      default: {},
    }),
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    paddingLeft: 44,
    paddingRight: spacing.md,
    height: 44,
    ...Platform.select({
      web: { outline: 'none' } as Record<string, unknown>,
      default: {},
    }),
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: EXPANDED_WIDTH,
    backgroundColor: colors.bgL1,
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.thin,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
      } as Record<string, string>,
      default: {},
    }),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    minHeight: 44,
  },
  resultCodeBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.tealAlpha08,
    borderWidth: 1,
    borderColor: colors.tealAlpha20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCode: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.accentTeal,
    letterSpacing: 0.8,
  },
  resultName: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  highlight: {
    color: colors.accentTeal,
    fontFamily: fontFamily.medium,
  },
})

export const SearchBar = memo(SearchBarInner)
