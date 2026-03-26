# Driftmark — Testing Guide

## Testing philosophy

Driftmark follows the **test pyramid**:

```
        /\
       /E2E\         ← few, slow, high-confidence
      /------\
     /  Integ \      ← service chains, flows
    /----------\
   /  Unit Tests\    ← many, fast, isolated
  /--------------\
```

Tests are ordered by value: **Security → Performance → Correctness → Design → Speed**.

- **Unit tests** verify individual functions and stores in isolation (mocked dependencies).
- **Integration tests** verify full service chains (places → ratings → achievements), still with mocked Supabase.
- **E2E tests** verify real user journeys in a running browser against the built web app.
- **Performance tests** enforce hard budgets — they must fail when limits are exceeded.

No test may make a real network call or touch a real database. All Supabase, AsyncStorage, and expo module calls are mocked.

---

## Directory structure

```
__tests__/
  factories/          # Shared data factories (createMockPlace, etc.)
  mocks/
    supabase.ts        # Reusable Supabase mock helpers
  unit/
    apiErrors.test.ts
    photoSecurity.test.ts
    sanitize.test.ts
    validation.test.ts
    offline.test.ts    # Offline queue unit tests
    realtime.test.ts   # Realtime subscription unit tests
    services/          # Per-service unit tests
    stores/            # Per-store unit tests
  integration/
    ratingFlow.test.ts
    groupFlow.test.ts
    photoFlow.test.ts
    offlineFlow.test.ts
  performance/
    bundleSize.test.ts
    ratingsPerf.test.ts
    pagination.test.ts
  components/          # React Native component tests
  e2e/
    web/
      journey.spec.ts        # Playwright user journey
      accessibility.spec.ts  # Playwright axe-core accessibility
```

---

## Coverage requirements

**Minimum: 85% lines, 85% functions, 85% statements, 75% branches** (enforced by jest.config.ts `coverageThreshold`).

### Excluded paths

The following paths are excluded from coverage metrics (see `coveragePathIgnorePatterns` in `jest.config.ts`):

| Path | Reason |
|------|--------|
| `src/app/` | Expo Router screen wrappers — tested via E2E only |
| `src/types/` | Type definitions only, no executable code |
| `src/theme/` | Constant objects, no logic |
| `src/constants/` | Constant objects, no logic |

---

## Running tests

### Unit + integration tests (Jest)

```bash
# Run all Jest tests
npx jest

# Run with coverage report
npx jest --coverage

# Run a single file
npx jest __tests__/unit/stores/placesStore.test.ts

# Run in watch mode
npx jest --watch

# Run only integration tests
npx jest __tests__/integration/

# Run only performance tests
npx jest __tests__/performance/
```

### E2E tests (Playwright)

```bash
# First, install Playwright browsers (once)
npx playwright install chromium

# Run E2E tests (starts dev server automatically)
npx playwright test

# Run a specific spec
npx playwright test __tests__/e2e/web/journey.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Generate an HTML report
npx playwright show-report
```

### Bundle size test

The bundle size test requires a built web output:

```bash
npx expo export --platform web
npx jest __tests__/performance/bundleSize.test.ts
```

---

## Test file naming conventions

| Test type | Location | Filename pattern |
|-----------|----------|-----------------|
| Unit — service | `__tests__/unit/services/` | `<serviceName>.test.ts` |
| Unit — store | `__tests__/unit/stores/` | `<storeName>.test.ts` |
| Unit — lib | `__tests__/unit/` | `<libName>.test.ts` |
| Unit — component | `__tests__/components/<category>/` | `<ComponentName>.test.tsx` |
| Integration | `__tests__/integration/` | `<flowName>Flow.test.ts` |
| Performance | `__tests__/performance/` | `<subject>Perf.test.ts` or `<subject>.test.ts` |
| E2E | `__tests__/e2e/web/` | `<scenario>.spec.ts` |

---

## Writing a service test

Service tests mock Supabase at the module boundary and verify both the happy path and error paths.

```typescript
// __tests__/unit/services/myService.test.ts
import { createClient } from '@supabase/supabase-js'
import { myServiceFunction } from '@services/myService'
import { ApiError } from '@lib/apiErrors'
import { createMockPlace } from '@/../__tests__/factories'

// Pull the mock instance created by jest.setup.ts
const mockSupabase = (() => {
  const m = createClient as jest.Mock
  return m.mock.results[0]?.value ?? m('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    // add other chainable methods as needed
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('myServiceFunction', () => {
  it('returns data on success', async () => {
    const place = createMockPlace()
    getMockFrom().mockReturnValueOnce(mockChain({ data: place, error: null }))

    const result = await myServiceFunction('user-123')
    expect(result).toEqual(place)
  })

  it('throws ApiError when Supabase returns an error', async () => {
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: null, error: { code: '42501', message: 'forbidden' } })
    )

    await expect(myServiceFunction('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})
```

**Key rules:**
1. Always import factories from `__tests__/factories/index.ts` — do not inline test data.
2. Call `jest.clearAllMocks()` in `beforeEach` to prevent state leakage.
3. Mock **both** the success path and at least one error path.
4. Use `getMockFrom().mockReturnValueOnce(...)` when a service makes multiple DB calls.

---

## Writing a component test

Component tests use `@testing-library/react-native` and render in isolation.

```typescript
// __tests__/components/ui/MyComponent.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MyComponent } from '@components/ui/MyComponent'

describe('MyComponent', () => {
  it('renders the label', () => {
    const { getByText } = render(<MyComponent label="Hello" />)
    expect(getByText('Hello')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<MyComponent label="Tap me" onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

**Key rules:**
1. Wrap any component that uses Zustand stores with `renderWithProviders` if you need store state.
2. Avoid testing implementation details — test what the user sees and can interact with.
3. Expo modules are already mocked in `jest.setup.ts`; do not re-mock them per file.

---

## Writing an E2E test

E2E tests use Playwright and run against the live web server.

```typescript
// __tests__/e2e/web/myFeature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('My feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8081')
  })

  test('user can do the thing', async ({ page }) => {
    await page.click('[data-testid="my-button"]')
    await expect(page.getByText('Success!')).toBeVisible({ timeout: 5000 })
  })
})
```

**Key rules:**
1. Use `data-testid` attributes for element targeting where text/role selectors are ambiguous.
2. Always set a `timeout` (5000ms minimum) on `expect(...).toBeVisible()` for async elements.
3. Inject a mock session via `sessionStorage` when testing authenticated routes rather than running a real OAuth flow.
4. Never depend on shared state between tests — each test must be self-contained.

---

## Mocking conventions

### Supabase

The global Supabase mock is defined in `jest.setup.ts`. It creates a single mock client that all services share. Tests retrieve this instance via:

```typescript
const mockSupabase = (() => {
  const m = createClient as jest.Mock
  return m.mock.results[0]?.value ?? m('', '')
})()
```

Use the helpers from `__tests__/mocks/supabase.ts` for common patterns:

```typescript
import { mockSupabaseSuccess, mockSupabaseError, mockRpcSuccess } from '@/../__tests__/mocks/supabase'

// Succeeds with data
mockSupabaseSuccess(createMockPlace())

// Fails with a Supabase error
mockSupabaseError('PGRST116', 'not found')

// RPC success
mockRpcSuccess({ overall_score: 4.2, categories: {} })
```

### Expo modules

All expo modules that require native binaries are mocked globally in `jest.setup.ts`:

- `expo-secure-store`
- `expo-haptics`
- `expo-image-picker`
- `expo-image-manipulator`
- `expo-notifications`

Do not re-mock these in individual test files unless you need to override specific return values.

### AsyncStorage

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))
```

### NetInfo

```typescript
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()), // returns unsubscribe fn
}))
```

---

## Factory usage

All test data must come from the factories in `__tests__/factories/index.ts`. This ensures consistent, typed test data that matches the real schema.

```typescript
import {
  createMockProfile,
  createMockPlace,
  createMockGroup,
  createMockGroupMember,
  createMockRatings,
  createMockCountryRatings,
  createMockPlaceRating,
  createMockPhoto,
  createMockAchievement,
  createMockTravelStats,
} from '@/../__tests__/factories'

// With overrides
const place = createMockPlace({ country_code: 'FR', category: 'want_to_go' })
const group = createMockGroup({ name: 'My Crew' })
```

**Do not hardcode test data inline** — always use factories. This makes tests resilient to schema changes and ensures type correctness.

---

## CI testing pipeline

The GitHub Actions CI pipeline runs tests in three stages:

### Stage 1: Unit + Integration (fast, ~2 min)

```yaml
- name: Run Jest tests
  run: npx jest --coverage --ci
```

### Stage 2: Build + Bundle size (medium, ~5 min)

```yaml
- name: Build web
  run: npx expo export --platform web

- name: Check bundle size
  run: npx jest __tests__/performance/bundleSize.test.ts
```

### Stage 3: E2E (slow, ~10 min, only on PR to main)

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
```

Coverage is reported after Stage 1. A PR cannot merge if:
- Any test fails
- Coverage drops below 85% lines/functions/statements or 75% branches
- The bundle exceeds 350 KB gzipped

---

## Performance test budgets

| Test | Budget | Failure action |
|------|--------|---------------|
| `computeOverallScore × 1000` | < 10 ms | Block merge |
| Gzipped JS bundle | < 350 KB | Block merge |
| TTI (Playwright) | < 3 000 ms | Block merge |

Performance tests use hard `expect()` assertions — they do not warn, they fail.
