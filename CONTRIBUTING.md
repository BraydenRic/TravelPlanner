# Contributing to Driftmark

## Code Style

- **TypeScript**: strict mode, zero `any` types
- **Formatting**: Prettier (run `npm run format` before committing)
- **Linting**: ESLint zero-warnings policy (`npm run lint`)
- **Testing**: TDD — write tests alongside every new function/component

## Priority Order

When making any code change, apply this priority:
1. **Security** — never sacrifice security for convenience
2. **Performance** — 50+ concurrent users, <200ms queries, <500ms map render
3. **Correctness** — correct behavior before optimization
4. **Design** — Midnight Atlas design system, spring animations only
5. **Speed** — developer velocity last

## Rules (Non-Negotiable)

- No `select('*')` — always specify columns
- No `Button` from React Native — always `Pressable`
- No `.map()` for lists of unknown length — always `FlashList`
- No hardcoded colors — always from `@theme/colors`
- No `withTiming` for visible animations — always `withSpring`
- All user inputs validated with Zod before use
- All user text sanitized with `sanitize.ts` before DB writes
- All useEffect hooks must return cleanup functions
- All photos must go through `processPhotoForUpload` before upload

## Development Workflow

1. Fork and clone
2. `npm install`
3. Copy `.env.example` to `.env` and fill in credentials
4. Create a feature branch: `git checkout -b feat/my-feature`
5. Write your code + tests (85%+ coverage required)
6. `npm run typecheck && npm run lint && npm test`
7. Commit (Husky pre-commit hook runs checks automatically)
8. Open a PR

## Pull Request Guidelines

- PRs must pass all CI checks before merge
- Include a clear description of what changed and why
- Add or update tests for any changed behavior
- Update documentation if adding new features

## Database Changes

- All schema changes go in a new migration file (`supabase/migrations/NNN_description.sql`)
- All new tables MUST have RLS enabled and policies defined
- Never modify existing migration files — create a new one

## Design System

All UI must follow the **Midnight Atlas** design system:
- Zero light backgrounds — use `colors.bgL0` through `colors.bgL3`
- Spring animations: `{ damping: 15, stiffness: 150 }`
- Glass surfaces: `GlassPanel` component
- Typography hierarchy: 32-48px headings, 14-16px body, 11-12px labels
