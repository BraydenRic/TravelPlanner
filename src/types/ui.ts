/**
 * UI state types for Zustand stores and component props.
 *
 * SECURITY NOTE (THREAT_MODEL M-08-C): Zustand stores containing these
 * types must NOT use persist middleware with AsyncStorage for sensitive
 * user data. Only non-sensitive UI state may be persisted to disk.
 */

import type { BadgeType, MemberColor, PlaceCategory, RatingCategory } from './database';

// ---------------------------------------------------------------------------
// Authentication state
// ---------------------------------------------------------------------------

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

// ---------------------------------------------------------------------------
// Map UI state (non-sensitive — safe to persist)
// ---------------------------------------------------------------------------

export type MapViewMode = 'personal' | 'group';
export type MapColorMode = 'category' | 'rating' | 'intensity';

export interface MapUIState {
  viewMode: MapViewMode;
  colorMode: MapColorMode;
  selectedCountryCode: string | null;
  zoomLevel: number;
  centerLatitude: number;
  centerLongitude: number;
}

// ---------------------------------------------------------------------------
// Rating UI state
// ---------------------------------------------------------------------------

export interface RatingDraftState {
  visitedPlaceId: string;
  scores: Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>;
  overallScore: number | null;
  review: string;
  isDirty: boolean;
}

// ---------------------------------------------------------------------------
// Place entry UI state
// ---------------------------------------------------------------------------

export interface PlaceEntryDraft {
  countryCode: string;
  cityId: string | null;
  category: PlaceCategory;
  visitedDate: string | null;
  plannedDate: string | null;
  plannedBudget: string; // string in UI, parsed to number before DB write
  dailyBudget: string;
  currencyCode: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Group UI state
// ---------------------------------------------------------------------------

export interface GroupMemberDisplay {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: MemberColor;
  isCurrentUser: boolean;
}

// ---------------------------------------------------------------------------
// Achievement/badge display
// ---------------------------------------------------------------------------

export interface AchievementDisplay {
  badgeType: BadgeType;
  label: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

// ---------------------------------------------------------------------------
// Toast / notification UI
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 3000
}

// ---------------------------------------------------------------------------
// Modal state
// ---------------------------------------------------------------------------

export type ModalType =
  | 'ratePlace'
  | 'addToGroup'
  | 'inviteMembers'
  | 'deleteAccount'
  | 'signOut'
  | 'cityPicker'
  | 'datePicker'
  | 'currencyPicker';

export interface ModalState {
  activeModal: ModalType | null;
  modalProps: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Offline queue state
// ---------------------------------------------------------------------------

/**
 * Operation descriptor for offline queue.
 * SECURITY (THREAT_MODEL M-08-B): Only store operation metadata,
 * NOT the full payload. Re-fetch data from DB on reconnect.
 */
export type OfflineOperationType =
  | 'upsert_visited_place'
  | 'upsert_place_rating'
  | 'add_to_group'
  | 'remove_from_group';

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  resourceId: string;
  enqueuedAt: string;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Tab / navigation state (safe to persist)
// ---------------------------------------------------------------------------

export type TabRoute = 'map' | 'explore' | 'groups' | 'profile';

export interface NavigationUIState {
  activeTab: TabRoute;
  lastVisitedCountryCode: string | null;
}

// ---------------------------------------------------------------------------
// Theme / appearance state (safe to persist)
// ---------------------------------------------------------------------------

export type ColorScheme = 'dark'; // Driftmark is dark-only in v1
