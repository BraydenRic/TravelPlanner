# Driftmark

> Your world, mapped.

A dark-themed cross-platform travel logging and rating app built with React Native + Expo + Supabase. Rate cities across 10 categories, visualize your world map, and compare travels with friends in groups.

## Screenshots
<!-- Screenshots will be added after first build -->

## Features

- **Interactive World Map** — color-coded by visit status and rating intensity
- **City-Level Ratings** — rate any of 1,000+ cities across 10 categories (safety, food, transport, etc.)
- **Group Travel** — create squads of up to 4, share maps, compare ratings side-by-side
- **Trip Planning** — wishlist countries with dates and budget tracking
- **Achievements** — unlock badges as you explore the world
- **Offline-First** — all changes queue and sync when back online
- **Cross-Platform** — iOS, Android, and Web from a single codebase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 53 |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Realtime + Storage + Auth) |
| Auth | Google OAuth via Supabase Auth |
| State | Zustand with optimistic updates |
| Styling | NativeWind + Midnight Atlas design system |
| Animations | React Native Reanimated + Moti (spring physics) |
| Lists | FlashList (60fps virtualized) |
| Charts | react-native-svg + victory-native |
| Maps | react-simple-maps (web) + react-native-svg (mobile) |
| Testing | Jest + React Native Testing Library + Playwright |
| CI/CD | GitHub Actions + EAS Build + Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project (for OAuth)

### Installation

```bash
git clone https://github.com/yourusername/driftmark.git
cd driftmark
npm install
cp .env.example .env
```

### Environment Setup

Edit `.env` with your credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EAS_PROJECT_ID=your-eas-project-id
```

See [docs/SETUP.md](docs/SETUP.md) for detailed Supabase + Google OAuth setup.

### Running Locally

```bash
# Web
npm run web

# iOS simulator (Mac only)
npm run ios

# Android emulator
npm run android

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── app/              # Expo Router screens
│   ├── (auth)/       # Login + onboarding
│   ├── (tabs)/       # Main tabs: map, explore, groups, profile
│   ├── country/      # Country + city detail screens
│   ├── group/        # Group detail
│   └── settings/     # Account settings
├── components/
│   ├── map/          # WorldMap, CountryDrillDown, CityPin, SplitCountry
│   ├── ratings/      # StarRating, RatingForm, RatingRadarChart, RatingBarChart
│   ├── cards/        # PlaceCard, GroupCard, AchievementBadge
│   ├── layout/       # BottomTabBar, CategoryTabs, SearchBar, EmptyState
│   └── ui/           # GlassPanel, SpringButton, AnimatedNumber, ShimmerSkeleton
├── services/         # Supabase data access (places, ratings, groups, photos, …)
├── stores/           # Zustand state (auth, places, ratings, groups, ui, …)
├── lib/              # Core utilities (auth, validation, sanitize, offline, realtime)
├── hooks/            # Custom React hooks
├── types/            # TypeScript types (database, api, ui)
├── theme/            # Colors, typography, spacing, animations
└── constants/        # Countries list, rating categories
supabase/
├── migrations/       # SQL migrations (run in order: 001→007)
├── functions/        # Edge Functions (rate-limit, send-push-notification)
└── seed/             # cities.sql (1,071 cities across 195 countries)
__tests__/
├── unit/             # Unit tests for services, stores, lib
├── components/       # Component render + interaction tests
├── integration/      # Full flow tests (rating, group, photo, offline)
├── performance/      # Bundle size, query perf, pagination
└── e2e/web/          # Playwright E2E tests
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run web` | Start web dev server |
| `npm run ios` | Start iOS simulator |
| `npm run android` | Start Android emulator |
| `npm test` | Run all Jest tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint (zero warnings policy) |
| `npm run typecheck` | TypeScript check (zero errors policy) |
| `npm run build:web` | Build web production bundle |
| `npm run format` | Prettier format all files |

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.

**Quick deploy to Vercel:**
```bash
eas build --platform all --profile production
npx expo export --platform web
vercel --prod
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
