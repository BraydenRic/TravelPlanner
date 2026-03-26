/**
 * Animation spring configs and duration constants for Driftmark.
 *
 * Use these presets with react-native-reanimated's withSpring() or
 * moti's `animate` prop. Never hardcode animation values in components.
 */

/**
 * Spring presets for different interaction types.
 * Tuned for a premium, fluid feel on the dark travel UI.
 */
export const springs = {
  /** General UI transitions (modals, panels) */
  standard: { damping: 15, stiffness: 150 },

  /** Quick feedback (taps, toggles) */
  snappy: { damping: 20, stiffness: 250 },

  /** Slower, more organic transitions (map camera, page entrances) */
  gentle: { damping: 12, stiffness: 80 },

  /** Playful bouncy (achievement unlock, badge pop) */
  bouncy: { damping: 8, stiffness: 120 },
} as const

export type SpringPresetKey = keyof typeof springs

/**
 * Duration constants in milliseconds for non-spring animations
 * (opacity fades, color transitions).
 */
export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const

/**
 * Easing curves for use with timing animations.
 * These are cubic-bezier definitions as string descriptors.
 */
export const easing = {
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  linear: 'linear',
} as const

/**
 * Stagger delays for list item animations (ms between each item).
 */
export const stagger = {
  fast: 30,
  normal: 60,
  slow: 100,
} as const
