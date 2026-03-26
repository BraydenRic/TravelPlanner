/**
 * Spacing scale for Driftmark — 4px base unit.
 *
 * Use these tokens for all margin, padding, gap, and size values.
 * Never use arbitrary pixel values in components.
 */

export const spacing = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  smmd: 12,
  /** 16px */
  md: 16,
  /** 24px */
  lg: 24,
  /** 32px */
  xl: 32,
  /** 48px */
  xxl: 48,
  /** 64px */
  xxxl: 64,
} as const

export type SpacingKey = keyof typeof spacing

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export const borderWidth = {
  hairline: 0.5,
  thin: 1,
  medium: 2,
} as const
