/**
 * Typography tokens for Driftmark.
 *
 * Font stack uses system fonts as fallbacks to avoid layout shift
 * before custom fonts load.
 */

export const fontFamily = {
  // Display / headings — Inter preferred
  heading: 'Inter_700Bold',
  headingFallback: 'System',

  // Body text
  body: 'Inter_400Regular',
  bodyFallback: 'System',

  // Medium weight for labels, buttons
  medium: 'Inter_500Medium',
  mediumFallback: 'System',

  // Semi-bold for subheadings
  semibold: 'Inter_600SemiBold',
  semiboldFallback: 'System',

  // Monospace for codes, coordinates
  mono: 'SpaceMono_400Regular',
  monoFallback: 'Courier New',
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
} as const

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const

export type FontSizeKey = keyof typeof fontSize
