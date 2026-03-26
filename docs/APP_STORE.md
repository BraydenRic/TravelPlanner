# Driftmark — App Store Submission Checklist

**Version**: 1.0
**Date**: 2026-03-24

---

## Table of Contents

1. [iOS App Store](#1-ios-app-store)
2. [Google Play Store](#2-google-play-store)
3. [Shared Assets & Copy](#3-shared-assets--copy)
4. [Privacy Policy Requirement](#4-privacy-policy-requirement)
5. [Pre-Submission Testing](#5-pre-submission-testing)

---

## 1. iOS App Store

### 1.1 Screenshots Required

Apple requires screenshots for each device size you support. The minimum set for a phone-only app:

| Device | Resolution | Required |
|---|---|---|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 x 2868 px | Yes — primary |
| iPhone 6.7" (iPhone 14 Plus / 15 Plus) | 1290 x 2796 px | Yes |
| iPhone 6.5" (iPhone 11 Pro Max / XS Max) | 1242 x 2688 px | Yes |
| iPhone 5.5" (iPhone 8 Plus) | 1242 x 2208 px | Yes |
| iPad Pro 12.9" (6th gen) | 2048 x 2732 px | Required if `supportsTablet: true` |
| iPad Pro 11" | 1668 x 2388 px | Required if `supportsTablet: true` |

**Note**: `app.config.ts` sets `supportsTablet: false`, so iPad screenshots are not required for Phase 1. If this changes, add iPad screenshots before submission.

Minimum screenshots per device: **3**, recommended: **5–10**.

Screenshot content checklist:
- [ ] World map showing visited countries highlighted
- [ ] Trip detail / photo view
- [ ] Stats / analytics screen
- [ ] Group / social feature
- [ ] Onboarding / auth screen (optional, adds context)

Screenshots must not contain the status bar with real time or carrier information. Use a clean simulator state (full battery, Wi-Fi signal, 9:41 AM).

### 1.2 App Preview (Video — Optional but Recommended)

- Format: `.mov` or `.mp4`
- Resolution: match the screenshot resolution for the device
- Duration: 15–30 seconds
- Must not show a loading spinner for more than a second

### 1.3 App Metadata

#### App Name
`Driftmark`

Maximum 30 characters. This is the name displayed on the App Store and device home screen.

#### Subtitle
`Track every place you've been`

Maximum 30 characters.

#### Promotional Text (first 170 characters shown without "more")
```
Driftmark is your personal travel journal. Track every country and city you've visited, collect photos, and share adventures with friends.
```

#### Description (full)

```
Driftmark is your personal travel tracker and journal — built for people who love to explore.

TRACK YOUR WORLD
• Mark every country and city you've visited on an interactive world map
• Add travel dates, ratings, and personal notes to each destination
• Watch your map fill in as your adventures grow

CAPTURE MEMORIES
• Attach photos to any place you've visited
• Photos are stored privately and securely — only you can see them
• EXIF location data is stripped automatically to protect your privacy

SHARE WITH FRIENDS
• Create travel groups with up to 4 people
• See where your friends have been and compare travel stats
• Share invite links directly to your group

UNDERSTAND YOUR TRAVELS
• View detailed stats: countries visited, distances travelled, most visited regions
• Earn achievements as your travel history grows
• Export your data at any time

BUILT FOR PRIVACY
• Sign in securely with Google
• All data is encrypted in transit
• No ads, no tracking, no selling your data

Driftmark is free to download and use.
```

Maximum 4,000 characters.

#### Keywords

Maximum 100 characters total, comma-separated:

```
travel,tracker,journal,map,visited,countries,cities,trips,adventures,explore,bucket list,travel log
```

Do not repeat words already in the app name or subtitle.

#### Category

- **Primary**: Travel
- **Secondary**: Lifestyle

#### Age Rating

Complete the content questionnaire in App Store Connect. For Driftmark:
- No explicit sexual content: None
- No realistic violence: None
- No profanity or crude humor: None
- No contests or sweepstakes: None
- No alcohol/tobacco: None
- Minimal/infrequent cartoon violence: None
- User-generated content (reviews, captions): **Yes — Infrequent/Mild**

Expected rating: **4+**

### 1.4 Required Capabilities and Permissions

These match the `infoPlist` entries in `app.config.ts`:

| Permission | Purpose Text | Trigger |
|---|---|---|
| `NSPhotoLibraryUsageDescription` | "Driftmark needs photo access to add travel photos." | User taps "Add photo" to a place |
| `NSCameraUsageDescription` | "Driftmark needs camera access to take travel photos." | User taps "Take photo" |

Push notifications are requested at runtime, not declared in `infoPlist` for this entitlement.

### 1.5 App Store Review Notes

Include in the "Notes for App Review" field:

```
Test account credentials:
Email: review@driftmark.app
Password: [provide a dedicated review account password]

The app uses Google OAuth sign-in. To test without a Google account, please use the test account above if we have implemented email fallback, or contact [developer email] for a pre-authenticated test build.

Relevant features to review:
1. World map — tap any country to mark as visited
2. Add a place — long-press on map or use the + button
3. Group invite — create a group and share the invite link
4. Photo upload — attach a photo to a visited place (EXIF is stripped automatically)
```

### 1.6 iOS Submission Checklist

- [ ] App builds successfully with `eas build --platform ios --profile production`
- [ ] Build uploaded to App Store Connect via `eas submit --platform ios` or Transporter
- [ ] All required screenshot sizes uploaded
- [ ] App description under 4,000 characters
- [ ] Keywords under 100 characters
- [ ] Age rating questionnaire completed
- [ ] Privacy policy URL entered (see Section 4)
- [ ] Support URL entered
- [ ] Review notes and test account credentials provided
- [ ] Export compliance: set `ITSAppUsesNonExemptEncryption` to `false` in `infoPlist` (already configured in `app.config.ts`)
- [ ] App icon: 1024x1024 px PNG, no alpha channel, no rounded corners (Apple applies the mask)

---

## 2. Google Play Store

### 2.1 Screenshots Required

| Device Type | Minimum Size | Maximum Size | Required Count |
|---|---|---|---|
| Phone | 320 x 568 px | 3840 x 3840 px | Min 2, max 8 |
| 7" tablet | 320 x 568 px | 3840 x 3840 px | Optional |
| 10" tablet | 1080 x 1920 px | 3840 x 3840 px | Optional |

Recommended phone screenshot resolution: **1080 x 1920 px** (portrait).

Same content as iOS screenshots is acceptable. Export at the correct resolution.

### 2.2 Feature Graphic

Required for Play Store listing:

- Size: **1024 x 500 px** (landscape banner)
- Format: JPG or 24-bit PNG (no alpha)
- Used as the hero image on the store listing page

### 2.3 App Icon

- Size: **512 x 512 px**
- Format: 32-bit PNG with alpha
- This is separate from the adaptive icon used on devices

### 2.4 App Metadata

#### Short Description
```
Track every country and city you've visited on an interactive world map.
```
Maximum 80 characters.

#### Full Description

```
Driftmark is your personal travel tracker and journal — built for people who love to explore.

TRACK YOUR WORLD
• Mark every country and city you've visited on an interactive world map
• Add travel dates, ratings, and personal notes to each destination
• Watch your map fill in as your adventures grow

CAPTURE MEMORIES
• Attach photos to any place you've visited
• Photos are stored privately and securely — only you can see them
• EXIF location data is stripped automatically to protect your privacy

SHARE WITH FRIENDS
• Create travel groups with up to 4 people
• See where your friends have been and compare travel stats
• Share invite links directly to your group

UNDERSTAND YOUR TRAVELS
• View detailed stats: countries visited, distances travelled, most visited regions
• Earn achievements as your travel history grows
• Export your data at any time

BUILT FOR PRIVACY
• Sign in securely with Google
• All data is encrypted in transit and at rest
• No ads, no tracking, no selling your data

Driftmark is free to download and use.
```

Maximum 4,000 characters.

### 2.5 Category and Tags

- **Category**: Travel & Local
- **Tags** (up to 5): Travel, Map, Journal, Countries, Trip Planner

### 2.6 Content Rating

Complete the IARC questionnaire in Play Console. For Driftmark:
- Violence: None
- Sexual content: None
- Profanity: None
- Controlled substances: None
- User-generated content (captions, reviews): **Yes**

Expected rating: **Everyone** (E) or **Everyone 3+** depending on UGC classification.

### 2.7 Data Safety Section

The Data Safety form is mandatory. Fill in accurately:

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Name / display name | Yes | No | App functionality |
| Email address | Yes | No | Account authentication |
| User ID | Yes | No | App functionality |
| Photos / videos | Yes | No | App functionality (travel photos) |
| Location (approximate) | No | — | — |
| Location (precise) | No | — | — |
| App activity (interactions) | Yes | No | Analytics (if Supabase analytics enabled) |

Data is encrypted in transit: **Yes** (HTTPS/TLS 1.2+)
Users can request data deletion: **Yes** (via in-app account deletion)

### 2.8 Permissions Declared

| Permission | Reason |
|---|---|
| `READ_MEDIA_IMAGES` | Select travel photos from the photo library |
| `CAMERA` | Take travel photos within the app |
| `INTERNET` | Required for all network communication |
| `RECEIVE_BOOT_COMPLETED` | Required by expo-notifications for scheduled notifications |
| `POST_NOTIFICATIONS` (Android 13+) | Send trip reminders and group activity notifications |

### 2.9 Android Submission Checklist

- [ ] App builds successfully with `eas build --platform android --profile production`
- [ ] `.aab` (Android App Bundle) generated — do not submit `.apk` to production
- [ ] Google Play signing enabled (first upload only — cannot change after)
- [ ] Service account key at `./google-services-key.json` configured (see `eas.json`)
- [ ] All required screenshots uploaded
- [ ] Feature graphic (1024 x 500 px) uploaded
- [ ] App icon (512 x 512 px) uploaded
- [ ] Short and full descriptions entered
- [ ] Content rating questionnaire completed
- [ ] Data Safety form completed
- [ ] Privacy policy URL entered (see Section 4)
- [ ] Target API level is >= 34 (required from August 2025 for new apps)
- [ ] `versionCode` incremented for each submission (handled automatically by `autoIncrement: true` in `eas.json`)

---

## 3. Shared Assets & Copy

### App Icon Specifications

| Platform | Size | Format | Notes |
|---|---|---|---|
| iOS App Store | 1024 x 1024 px | PNG, no alpha | No rounded corners |
| Android Play Store | 512 x 512 px | 32-bit PNG | May have alpha |
| Android adaptive foreground | Per density | PNG | Safe zone: inner 66% |
| Expo/EAS icon | 1024 x 1024 px | PNG | Used by EAS for all platforms |

All icons live in `assets/icons/`.

### Screenshot Tips

- Use real content — show a populated world map, not an empty state
- Avoid personal data in screenshots (blur or replace real names with demo data)
- Use a single visual style and color scheme consistent with the app's dark theme (`#07080D` background)
- Add marketing copy overlays (optional) to highlight key features — these are common on both stores

---

## 4. Privacy Policy Requirement

Both the App Store and Play Store **require** a privacy policy URL for apps that:
- Collect personal data (Driftmark does: email, display name, photos)
- Use authentication (Google OAuth)

### What the Privacy Policy Must Cover

- What data is collected (email, name, photos, usage data)
- How data is stored and secured (Supabase, encrypted in transit)
- Whether data is shared with third parties (Google for OAuth; no others)
- User rights: data deletion, export
- Contact email for privacy requests
- Effective date and update policy

### Hosting

Host the privacy policy at a stable URL, e.g.:

```
https://driftmark.app/privacy
```

Enter this URL in:
- App Store Connect: **App Information > Privacy Policy URL**
- Play Console: **Store Listing > Privacy Policy**

---

## 5. Pre-Submission Testing

### Device Testing Matrix (Minimum)

| Device | OS | Test |
|---|---|---|
| iPhone 16 Pro (or simulator) | iOS 18 | Full smoke test |
| iPhone SE 3rd gen (4.7") | iOS 16 | Layout at small screen |
| iPhone 11 (6.1") | iOS 15 | Oldest supported iOS |
| Pixel 8 (or emulator) | Android 15 | Full smoke test |
| Galaxy A series (mid-range) | Android 13 | Performance test |
| Older device (Android 10) | Android 10 | Minimum supported API |

### Smoke Test Checklist

- [ ] Sign in with Google completes successfully
- [ ] World map renders with no blank tiles
- [ ] Tap a country — modal appears, can mark as visited
- [ ] Add a place with a photo — photo uploads and displays
- [ ] Create a group and copy invite link
- [ ] Join a group via deep link (`driftmark://group/join/[code]`)
- [ ] Push notification received when a group member adds a place
- [ ] Sign out, then sign in again — data persists
- [ ] Offline state — app shows meaningful error, no crash
- [ ] App returns from background after 10 minutes — session still valid

### Performance Benchmarks

- [ ] Cold start to interactive: < 3 seconds on mid-range device
- [ ] World map pan/zoom at 60 fps on iPhone 11 or Pixel 6
- [ ] Photo upload < 5 seconds on a 5 MB JPEG over 4G
- [ ] App bundle size: < 350 KB gzipped (enforced by CI)
