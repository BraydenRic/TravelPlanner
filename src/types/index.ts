/**
 * Central re-export of all application types.
 *
 * Import types from here:
 *   import type { Profile, VisitedPlace, TravelStats } from '@/types';
 *
 * Or from specific modules for more targeted imports:
 *   import type { Profile } from '@/types/database';
 */

export type * from './database';
export type * from './api';
export type * from './ui';
