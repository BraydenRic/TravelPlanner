/**
 * Midnight Atlas color palette for Driftmark.
 *
 * All UI components must use these tokens — never hardcode hex values.
 * This ensures consistent theming and enables future theme extensions.
 */

export const colors = {
  // Background layers (depth system)
  bgL0: '#07080D', // Deepest background — page/screen fill
  bgL1: '#0F1117', // Card backgrounds
  bgL2: '#171923', // Elevated surfaces
  bgL3: '#1E2235', // Active / selected states

  // Glass morphism
  glass: 'rgba(15,17,23,0.72)',
  glassBorder: 'rgba(255,255,255,0.06)',

  // Text
  textPrimary: '#F0EDEA',
  textSecondary: '#8B8D97',
  textTertiary: '#52545E',

  // Accent palette
  accentTeal: '#00F5D4',
  accentAmber: '#F5A623',
  accentViolet: '#A78BFA',
  accentCoral: '#FF6B6B',

  // Semantic
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Group member colors (must match MemberColor type in src/types/database.ts)
  memberTeal: '#00F5D4',
  memberAmber: '#F5A623',
  memberViolet: '#A78BFA',
  memberCoral: '#FF6B6B',

  // Map
  mapOcean: '#0A0E1A',
  mapLand: '#1E2235',
  mapBorder: 'rgba(255,255,255,0.08)',
  mapVisited: '#00F5D4',
  mapWantToGo: '#F5A623',
  mapLived: '#A78BFA',

  // Utility
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const

export type ColorKey = keyof typeof colors
