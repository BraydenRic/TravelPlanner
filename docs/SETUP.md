# Driftmark — Setup Guide

This guide walks you through a complete local development setup from zero to running app.

---

## 1. Prerequisites

Make sure the following tools are installed before you begin.

### Node.js 20+

```bash
node --version   # must be v20.x or higher
```

Download from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`:

```bash
nvm install 20
nvm use 20
```

### Expo CLI

```bash
npm install -g expo-cli
expo --version
```

### EAS CLI (for builds and OTA updates)

```bash
npm install -g eas-cli
eas --version
```

### Supabase account

Create a free account at [supabase.com](https://supabase.com). The free tier is sufficient for local development.

### Google Cloud account

You need a Google Cloud project to enable Google OAuth. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.

---

## 2. Clone and Install

```bash
git clone https://github.com/yourusername/driftmark.git
cd driftmark
npm install
```

---

## 3. Supabase Project Setup

### 3.1 Create a new project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose your organization, give the project a name (e.g. `driftmark-dev`), set a strong database password, and select a region close to you
4. Wait for the project to finish provisioning (about 1–2 minutes)

### 3.2 Run database migrations

All schema is managed via ordered SQL migration files in `supabase/migrations/`. You must run them in order.

1. In the Supabase dashboard, go to **SQL Editor**
2. Open and run each migration file in numerical order:
   - `001_extensions.sql`
   - `002_profiles.sql`
   - `003_places.sql`
   - `004_ratings.sql`
   - `005_groups.sql`
   - `006_photos_achievements.sql`
   - `007_functions_rls.sql`

To run a file: open it in your editor, copy the contents, paste into the SQL Editor, and click **Run**.

> **Important**: Never skip a migration or run them out of order. Each file depends on objects created by the previous one.

### 3.3 Seed the cities dataset

After all migrations are applied:

1. In the SQL Editor, open `supabase/seed/cities.sql`
2. Run the file — this inserts 1,071 cities across 195 countries
3. Verify with: `SELECT COUNT(*) FROM cities;` — should return `1071`

### 3.4 Enable Google OAuth

1. In the Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list and toggle it to **Enabled**
3. Enter your Google OAuth **Client ID** and **Client Secret** (obtained in Section 4 below)
4. Click **Save**

### 3.5 Verify Storage buckets

The migrations create three Storage buckets automatically. Confirm they exist:

1. Go to **Storage** in the Supabase dashboard
2. Verify these buckets are present:
   - `place-photos` — user travel photos
   - `avatars` — user profile pictures
   - `share-cards` — generated share card images

If any bucket is missing, create it manually with **New bucket** and set it to private (not public).

### 3.6 Copy your project credentials

1. Go to **Project Settings** → **API**
2. Copy your **Project URL** (e.g. `https://abcdefgh.supabase.co`)
3. Copy your **anon / public** key (the long `eyJ...` string)

You will use these in Section 5.

---

## 4. Google OAuth Setup

### 4.1 Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it (e.g. `driftmark`) and click **Create**

### 4.2 Enable the Google+ API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google+ API** and click **Enable**

> Note: Newer projects may see "People API" instead. Enable whichever is available.

### 4.3 Create OAuth 2.0 credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - Set application name, support email, and developer contact
   - Add your domain (or use `localhost` for dev)
   - Save and go back to create credentials
4. For **Application type**, choose **Web application**
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
   Replace `your-project-ref` with your actual Supabase project reference (the subdomain of your Project URL).
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** shown in the dialog

### 4.4 Add credentials to Supabase

Return to **Authentication** → **Providers** → **Google** in your Supabase dashboard and paste the Client ID and Client Secret you just copied. Click **Save**.

---

## 5. Environment Configuration

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EAS_PROJECT_ID=your-eas-project-id
```

- `EXPO_PUBLIC_SUPABASE_URL` — the Project URL from Section 3.6
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the anon key from Section 3.6
- `EAS_PROJECT_ID` — run `eas init` to create an EAS project and get this value, or find it at [expo.dev](https://expo.dev)

> **Security**: Never commit your `.env` file. It is listed in `.gitignore` by default.

---

## 6. Running Locally

### Web

```bash
npm run web
```

Opens the app at `http://localhost:8081` in your browser. Hot reload is enabled.

### iOS simulator (Mac only)

Requires Xcode installed with at least one iOS simulator.

```bash
npm run ios
```

### Android emulator

Requires Android Studio installed with an AVD configured.

```bash
npm run android
```

---

## 7. Running Tests

### Unit and integration tests (Jest)

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file save)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

Coverage threshold is 85%. The CI pipeline fails if coverage drops below this.

### E2E tests (Playwright)

Playwright tests run against the web build. You need the web dev server running first.

**Terminal 1:**
```bash
npm run web
```

**Terminal 2:**
```bash
npm run test:e2e
```

On first run, Playwright will prompt you to install browser binaries:

```bash
npx playwright install
```

The E2E tests live in `__tests__/e2e/web/`. They test full user flows including sign-in, adding a visited place, and group creation.

---

## 8. Common Issues

### RLS errors: "new row violates row-level security policy"

This means a Supabase RLS policy is blocking your query.

- Make sure you are authenticated (the user session must be valid)
- Check that the `user_id` in your insert matches `auth.uid()`
- If testing with the SQL Editor, queries run as the `postgres` superuser and bypass RLS — use the **API** tab or the app itself to test RLS behavior accurately
- Run migrations again if you recently added new tables — RLS policies may be missing

### Auth redirect issues: blank screen or "invalid redirect URL"

- Confirm the redirect URI in Google Cloud Console **exactly** matches `https://your-project.supabase.co/auth/v1/callback`
- Check that Google OAuth is enabled in Supabase Authentication settings
- On web, ensure `EXPO_PUBLIC_SUPABASE_URL` in `.env` is correct and the dev server has been restarted after editing `.env`

### Missing environment variables: "supabaseUrl is required"

- Confirm `.env` exists (not just `.env.example`)
- Restart the Expo dev server — env vars are only read at startup
- On Expo Go, note that `EXPO_PUBLIC_` prefix is required for variables to be embedded in the client bundle

### "cities table not found" or empty map

- Confirm you ran all 7 migrations in order before seeding
- Confirm `supabase/seed/cities.sql` was executed in the SQL Editor
- Run `SELECT COUNT(*) FROM cities;` to verify the seed completed

### Husky pre-commit hook failures

The pre-commit hook runs `npm run typecheck && npm run lint`. Fix any reported errors before committing. To see the full output:

```bash
npm run typecheck
npm run lint
```
