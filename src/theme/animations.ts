/**
 * Animation spring configs and duration constants for Driftmark.
 *
 * Use these presets with react-native-reanimated's withSpring().
 * Never hardcode animation values in components.
 */

/**
 * Spring presets for different interaction types.
 * Tuned for a premium, fluid feel on the dark travel UI.
 *
 * The three UI presets are critically damped AND overshoot-clamped: they
 * ease out with spring pacing but never travel past the target, so panels,
 * the search bar, and entrances land dead — no bounce-back. Only `bouncy`
 * (achievement/badge pops) is allowed to oscillate.
 */
export const springs = {
  /** General UI transitions (modals, panels) */
  standard: { damping: 25, stiffness: 150, overshootClamping: true },

  /** Quick feedback (taps, toggles) */
  snappy: { damping: 32, stiffness: 250, overshootClamping: true },

  /** Slower, more organic transitions (map camera, page entrances) */
  gentle: { damping: 18, stiffness: 80, overshootClamping: true },

  /** Playful bouncy (achievement unlock, badge pop) */
  bouncy: { damping: 13, stiffness: 120 },
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
