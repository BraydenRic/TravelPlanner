# Driftmark — Deployment Guide

**Version**: 1.0
**Date**: 2026-03-24

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [EAS Project Setup](#4-eas-project-setup)
5. [Web Deployment (Vercel)](#5-web-deployment-vercel)
6. [First Deployment Checklist](#6-first-deployment-checklist)
7. [OTA Update Process](#7-ota-update-process)
8. [Rollback Procedures](#8-rollback-procedures)

---

## 1. Prerequisites

You need accounts and CLI tools in place before any deployment step will succeed.

### Accounts Required

| Service | Purpose | URL |
|---|---|---|
| Supabase | Database, Auth, Storage, Edge Functions | https://supabase.com |
| Expo / EAS | Mobile builds and OTA updates | https://expo.dev |
| Vercel | Web hosting | https://vercel.com |
| Apple Developer Program | iOS App Store distribution | https://developer.apple.com |
| Google Play Console | Android distribution | https://play.google.com/console |

### CLI Tools Required

```bash
# Node.js 20+
node --version  # must be >= 20.0.0

# EAS CLI
npm install -g eas-cli
eas --version  # must be >= 12.0.0

# Expo CLI (bundled with expo package, but global install useful)
npm install -g expo-cli

# Vercel CLI (optional — CI handles deploys, but useful for manual work)
npm install -g vercel
```

---

## 2. Local Development Setup

### Step 1 — Clone and Install

```bash
git clone https://github.com/your-org/driftmark.git
cd driftmark
npm install
```

### Step 2 — Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`.env.local` is gitignored. Never commit real secrets.

### Step 3 — Start the Development Server

```bash
# Mobile (Expo Go or development build)
npm start

# Web only
npm run start:web

# Native iOS simulator
npm run ios

# Native Android emulator
npm run android
```

### Step 4 — Run Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E web tests (requires a running web server)
npm run build:web
npm run test:e2e
```

### Step 5 — Linting and Type Checking

```bash
npm run lint
npm run typecheck
```

---

## 3. Supabase Project Setup

### Step 1 — Create a New Project

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Choose your organization, set a name (`driftmark-production`), strong database password, and region closest to your users
4. Wait for provisioning (approx 2 minutes)

### Step 2 — Run Migrations in Order

Migrations live in `supabase/migrations/`. Run them in filename order (they are prefixed with timestamps):

```bash
# Using Supabase CLI (recommended)
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or apply manually via the SQL Editor in the Supabase dashboard, pasting each file in timestamp order.

Critical migration order:
1. `001_initial_schema.sql` — core tables
2. `002_rls_policies.sql` — Row Level Security (must run before any data is written)
3. `003_storage_buckets.sql` — storage bucket definitions
4. `004_edge_functions.sql` — helper functions
5. Any subsequent migrations in order

### Step 3 — Configure Auth Providers

1. In the Supabase dashboard go to **Authentication > Providers**
2. Enable **Google**:
   - Create a Google OAuth 2.0 client at https://console.cloud.google.com
   - Authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Paste the **Client ID** and **Client Secret** into Supabase
3. Set **JWT expiry** to `3600` (1 hour) under **Authentication > Settings**
4. Set **Refresh token expiry** to `2592000` (30 days)
5. Add your app's URL to the **Allowed redirect URLs**: `driftmark://` and `https://driftmark.app`

### Step 4 — Configure Storage Buckets

The migration creates buckets, but verify policies manually:

1. Go to **Storage** in the dashboard
2. Confirm these buckets exist:
   - `place-photos` — private, RLS enforced
   - `avatars` — public read, authenticated write
3. Verify storage policies match the patterns in `supabase/migrations/003_storage_buckets.sql`

### Step 5 — Deploy Edge Functions

```bash
supabase functions deploy --project-ref your-project-ref
```

Or deploy individual functions:

```bash
supabase functions deploy send-push-notification --project-ref your-project-ref
supabase functions deploy process-photo-upload --project-ref your-project-ref
supabase functions deploy check-achievements --project-ref your-project-ref
```

Set Edge Function secrets in the dashboard under **Edge Functions > Manage secrets**, or via CLI:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref your-project-ref
```

### Step 6 — Retrieve Your Keys

From **Project Settings > API**:
- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Never use the `service_role` key in the client app.

---

## 4. EAS Project Setup

### Step 1 — Create the EAS Project

```bash
eas login
eas init --id your-project-id
```

Or create via the Expo dashboard at https://expo.dev, then link:

```bash
eas init --id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

This writes the `projectId` into `app.config.ts` (via `EAS_PROJECT_ID` env var).

### Step 2 — Set EAS Secrets

Set secrets for each build profile. These are stored securely in EAS and injected at build time:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project-ref.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

### Step 3 — Set GitHub Actions Secrets

In your GitHub repository go to **Settings > Secrets and variables > Actions** and add:

| Secret Name | Value |
|---|---|
| `EXPO_TOKEN` | EAS access token from https://expo.dev/accounts/[user]/settings/access-tokens |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Vercel org/team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Step 4 — Configure iOS Credentials

```bash
eas credentials --platform ios
```

EAS will guide you through provisioning profiles and certificates. For automated builds, EAS manages credentials on its servers.

### Step 5 — Configure Android Keystore

```bash
eas credentials --platform android
```

EAS will generate and securely store a keystore. For existing keystores:

```bash
eas credentials --platform android --set-keystore
```

### Step 6 — Test a Development Build

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

Install the resulting `.ipa` / `.apk` via QR code or the Expo dashboard.

---

## 5. Web Deployment (Vercel)

### Step 1 — Import the Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel auto-detects the framework. Override if needed:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build:web`
   - **Output Directory**: `dist`

### Step 2 — Set Environment Variables in Vercel

In the Vercel project dashboard go to **Settings > Environment Variables**:

| Variable | Value | Environments |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview, Development |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |

### Step 3 — Verify Security Headers

After the first deploy, verify headers are applied using curl or browser DevTools:

```bash
curl -I https://driftmark.app | grep -E "Strict-Transport|Content-Security|X-Frame"
```

Expected output includes:
```
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
content-security-policy: default-src 'self'; ...
```

These are configured in `vercel.json` at the repository root.

### Step 4 — Configure Custom Domain

1. In the Vercel project go to **Settings > Domains**
2. Add `driftmark.app` and `www.driftmark.app`
3. Update your DNS records as instructed by Vercel
4. SSL certificates are provisioned automatically

---

## 6. First Deployment Checklist

Work through this list in order before announcing the app publicly.

### Infrastructure

- [ ] Supabase project created in correct region
- [ ] All migrations applied in order with no errors
- [ ] RLS enabled and verified on all user-data tables (`visited_places`, `place_ratings`, `place_photos`, `profiles`, `groups`, `group_members`)
- [ ] Google OAuth provider configured and tested end-to-end
- [ ] Storage buckets created with correct policies
- [ ] Edge Functions deployed and all return 401 on unauthenticated requests
- [ ] JWT expiry set to 3600 seconds
- [ ] Supabase service role key is NOT in any client bundle or public repository

### CI/CD

- [ ] All GitHub Actions secrets set
- [ ] CI workflow passes on `main` branch (lint, typecheck, tests, bundle size)
- [ ] `deploy-web.yml` has triggered successfully and Vercel deployment is live
- [ ] `ota-update.yml` configured and tested with a minor change

### Security

- [ ] `vercel.json` headers verified with curl
- [ ] CSP header does not include untrusted domains
- [ ] HSTS preload submitted at https://hstspreload.org
- [ ] No secrets committed to git (`git log --all -- .env*`)
- [ ] EXIF stripping confirmed working (upload a photo with GPS data, check output file)

### Mobile

- [ ] EAS project linked (`eas.json` has correct project ID)
- [ ] iOS credentials configured
- [ ] Android keystore configured
- [ ] Development build installable on physical device
- [ ] OTA update channel `production` exists

### App Store (when ready to ship)

- [ ] iOS production build triggered via `v*` tag
- [ ] Android production build triggered via `v*` tag
- [ ] Both builds pass EAS validation
- [ ] Submit workflow credentials filled in `eas.json`

---

## 7. OTA Update Process

Over-the-Air (OTA) updates via Expo Updates allow JS/asset changes to reach users without App Store review, within the constraints of your `runtimeVersion` policy.

### Automatic OTA (CI)

Every push to `main` triggers `.github/workflows/ota-update.yml`, which publishes an update to the `production` channel automatically.

The update message is taken from the git commit message.

### Manual OTA

```bash
# Publish to production channel
eas update --channel production --message "Fix map rendering on Android"

# Publish to preview channel (internal testers)
eas update --channel preview --message "Test new trip stats UI"
```

### When OTA is NOT Sufficient

OTA updates can only change JavaScript and assets. A new native build is required when:
- A new native module is added (`expo install some-native-module`)
- `app.config.ts` changes to `ios`, `android`, or `plugins` sections
- The `runtimeVersion` changes
- Expo SDK version is bumped

In these cases, increment the version tag and push:

```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers `.github/workflows/build-mobile.yml`.

---

## 8. Rollback Procedures

### Web Rollback (Vercel)

Vercel retains every deployment. To roll back:

1. Go to the Vercel project dashboard
2. Click **Deployments**
3. Find the last known-good deployment
4. Click the three-dot menu and select **Promote to Production**

This is instant — no rebuild required.

Via CLI:

```bash
vercel rollback [deployment-url]
```

### OTA Rollback

Expo allows republishing a previous update to a channel:

```bash
# List recent updates
eas update:list --channel production

# Roll back by republishing the previous update ID
eas update:republish --group [update-group-id] --channel production --message "Rollback to previous version"
```

### Mobile Build Rollback (App Store)

For iOS and Android, you cannot un-release a version. Options:

1. **Expedited OTA**: Push a hotfix via `eas update` — users on the broken version will receive the fix without installing a new build (JS-only fixes only).
2. **Emergency build**: Fix the bug, increment the `versionCode`/`buildNumber`, tag with `v*`, and submit an expedited review to Apple. Apple's expedited review typically resolves within 24 hours for genuine crashes.
3. **Emergency halt**: For critical security issues, use App Store Connect to halt the rollout of a phased release before it reaches 100% of users.

### Database Rollback

Supabase does not support automatic schema rollback. For data issues:

1. Restore from a Supabase point-in-time backup (available on Pro tier):
   - Go to **Database > Backups** in the dashboard
   - Select a restore point
   - Confirm — this replaces the entire database

2. For schema-only issues, write a corrective migration and apply it via `supabase db push`.

Always test rollback migrations in your `preview` Supabase project before applying to production.

### Emergency Secret Rotation

If a secret (anon key, service role key) is compromised:

1. In Supabase dashboard go to **Project Settings > API > JWT Settings**
2. Click **Generate new JWT secret** — this immediately invalidates all existing JWTs, logging out all users
3. Update `EXPO_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables and redeploy
4. Update the EAS secret: `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "new-key"` (this requires a new build for native clients)
5. Rotate the GitHub Actions secret immediately
