/**
 * Midnight Atlas color palette for Driftmark.
 *
 * All UI components must use these tokens — never hardcode hex values.
 * This ensures consistent theming and enables future theme extensions.
 */

export const colors = {
  // Background layers (depth system)
  bgL0: '#1A1D2E', // Deepest background — page/screen fill
  bgL1: '#242837', // Card backgrounds
  bgL2: '#2E3347', // Elevated surfaces
  bgL3: '#383D55', // Active / selected states

  // Glass morphism
  glass: 'rgba(36,40,55,0.80)',
  glassBorder: 'rgba(255,255,255,0.09)',

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
  mapOcean: '#141729',
  mapLand: '#2E3347',
  mapBorder: 'rgba(255,255,255,0.08)',
  mapVisited: '#00F5D4',
  mapWantToGo: '#F5A623',
  mapLived: '#A78BFA',

  // White overlays (used for borders, dividers, subtle backgrounds)
  whiteAlpha05: 'rgba(255,255,255,0.05)',
  whiteAlpha06: 'rgba(255,255,255,0.06)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha09: 'rgba(255,255,255,0.09)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha22: 'rgba(255,255,255,0.22)',
  whiteAlpha28: 'rgba(255,255,255,0.28)',
  whiteAlpha30: 'rgba(255,255,255,0.30)',
  whiteAlpha55: 'rgba(255,255,255,0.55)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',

  // Dark overlays (used for elevated panels, tab bar)
  darkOverlay85: 'rgba(10,12,18,0.85)',
  darkOverlay90: 'rgba(10,12,18,0.90)',
  darkOverlay95: 'rgba(8,10,18,0.95)',

  // Accent overlays — teal
  tealAlpha08: 'rgba(0,245,212,0.08)',
  tealAlpha15: 'rgba(0,245,212,0.15)',
  tealAlpha20: 'rgba(0,245,212,0.20)',

  // Accent overlays — coral / danger
  coralAlpha08: 'rgba(255,107,107,0.08)',
  coralAlpha15: 'rgba(255,80,80,0.15)',
  coralAlpha30: 'rgba(255,80,80,0.30)',

  // Accent overlays — success / green
  successAlpha10: 'rgba(34,197,94,0.10)',
  successAlpha30: 'rgba(34,197,94,0.30)',

  // Utility
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  shadowBlack: '#000',
} as const

export type ColorKey = keyof typeof colors
