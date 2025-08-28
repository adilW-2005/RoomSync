### RoomSync UT – iOS App Store deployment guide (Expo + EAS)

This guide is a practical, end‑to‑end checklist to ship the mobile app in `mobile/` to the Apple App Store using Expo Application Services (EAS). It is tailored to this repo: Expo SDK 53, push notifications, background location, background fetch, deep links.

---

### 0) Prerequisites
- **Apple Developer account**: Individual or Company ($99/year)
- **macOS + Xcode** (latest stable), **Homebrew**, **Node 18+**, **npm**
- **Expo CLI** and **EAS CLI**:
```bash
npm i -g expo-cli eas-cli
```
- **Expo + EAS accounts**: run `expo login` and `eas login` before building
- Backend prod API reachable over HTTPS (set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL`)

---

### 1) One‑time Apple setup
- Create/join an Apple Developer team
- Ensure you can sign in to App Store Connect
- Optional: Decide your **bundle identifier** (reverse‑DNS): e.g. `com.yourorg.roomsync` (must be unique)

You do not need to manually create certificates/profiles; EAS can manage these for you.

---

### 2) Link the project to EAS
From `mobile/`:
```bash
cd mobile
npx eas init
```
- Pick or create an EAS project. This will associate a `projectId` and may add `extra.eas.projectId` to your config at build time.

Why it matters: push token registration in `src/lib/notifications.js` uses the EAS project ID for `getExpoPushTokenAsync`.

---

### 3) App configuration (iOS)
Edit `mobile/app.json` to set production‑ready values.

- **Bundle identifier** and **build number**
  - Add `ios.bundleIdentifier` and optionally `ios.buildNumber`.

Example snippet:
```json
{
  "expo": {
    "name": "RoomSync UT",
    "slug": "roomsync-ut",
    "scheme": "roomsync",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourorg.roomsync",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "RoomSync uses your location to share presence with your roommates.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RoomSync uses your location to share presence with your roommates in the background.",
        "NSCameraUsageDescription": "Allow RoomSync to take photos for listings and messages.",
        "NSPhotoLibraryUsageDescription": "Allow RoomSync to pick and upload photos.",
        "NSPhotoLibraryAddUsageDescription": "Allow RoomSync to save photos to your library.",
        "UIBackgroundModes": ["location", "fetch"]
      }
    }
  }
}
```

Notes:
- Background location is already declared; add `fetch` if you rely on `expo-background-fetch` in `src/lib/notifications.js`.
- If you do not plan iPad support now, set `ios.supportsTablet: false` or provide iPad screenshots later.

- **Icons and branding**
  - Set `expo.icon` to a 1024×1024 image (vector‑safe). Current repo has `mobile/assets/icon.png`.
  - Optionally define a splash screen (`expo.splash`) with `image`, `backgroundColor`, and `resizeMode`.

- **Notifications plugin**
  - Add the plugin so iOS entitlements are configured automatically:
```json
{
  "expo": {
    "plugins": [
      "expo-font",
      "expo-notifications"
    ]
  }
}
```

- **Deep links**
  - `scheme` is `roomsync`; ensure your push payloads use `roomsync://...` or the app’s custom scheme already used in code.

- **Environment**
  - `extra.EXPO_PUBLIC_API_URL` and `extra.EXPO_PUBLIC_WS_URL` are read at runtime. Provide production values during build via EAS env (below).

---

### 4) Create `eas.json` build profiles
In `mobile/eas.json`:
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "workflow": "managed", "simulator": false, "autoIncrement": true },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.tld",
        "EXPO_PUBLIC_WS_URL": "wss://api.yourdomain.tld"
      }
    },
    "production": {
      "distribution": "app-store",
      "ios": { "workflow": "managed", "simulator": false, "autoIncrement": true },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.tld",
        "EXPO_PUBLIC_WS_URL": "wss://api.yourdomain.tld"
      }
    }
  },
  "submit": {
    "production": {
      "ios": { "ascAppId": null }
    }
  }
}
```
- You can omit `submit.production.ios.ascAppId`; EAS Submit can create the App Store Connect app during submission if needed.

---

### 5) Provisioning, credentials, and push
EAS can manage Apple certificates/profiles and APNs key automatically.

- Log in to Apple when prompted by EAS during the first iOS build
- Accept letting EAS manage credentials
- For push notifications, the `expo-notifications` plugin and EAS credentials will configure the `aps-environment` entitlement

You can also inspect credentials at any time:
```bash
npx eas credentials
```

---

### 6) Build for internal testing (TestFlight)
From `mobile/`:
```bash
# Internal test build
npx eas build -p ios --profile preview

# When finished, submit the latest build to App Store Connect (TestFlight)
npx eas submit -p ios --latest
```
- The first submission may take 10–30 minutes for Apple processing.
- Add testers in App Store Connect → TestFlight (internal testers are immediate; external testers require Beta App Review).

---

### 7) Production build & submit
```bash
# Production build
npx eas build -p ios --profile production

# Submit that build
npx eas submit -p ios --latest
```
- Alternatively, enable automatic submit on successful build with `--auto-submit`.

---

### 8) App Store Connect checklist (metadata)
Prepare before pressing “Submit for Review”.

- **App Information**
  - Name, Subtitle, Category, Content Rights, Age Rating questionnaire
  - Primary language
- **Pricing and Availability**
- **App Privacy → Data collection**
  - Location (precise/approximate), Identifiers (device push token), Diagnostics (if any)
  - State purposes: app functionality, notifications, etc.
- **Screenshots** (6.7" and 5.5" iPhones; iPad if `supportsTablet: true`)
- **App Icon** (1024×1024)
- **Support URL**, **Marketing URL** (optional), **Privacy Policy URL**
- **Sign‑in required?** Yes → Provide a demo account in Review Notes
  - Example from this repo’s seed: `alex@utexas.edu` / `test1234`
- **Background location justification** (Review Notes)
  - Explain why location background is required (roommate presence/ETA and chore/event reminders).

---

### 9) QA checklist before shipping
- [ ] App builds and runs on a physical iPhone
- [ ] Push notifications: permission prompt, receive local + remote push
- [ ] Background location: permission prompts (While Using + Always), blue bar indicator shows when active
- [ ] Background fetch tasks don’t crash; app remains responsive after hours
- [ ] Image picker (camera/library) works and shows iOS permission prompts
- [ ] Deep links from notification open the correct screen
- [ ] All flows behind auth work with a real prod backend
- [ ] No development URLs or logos remain
- [ ] Version and build number incremented

---

### 10) Review‑friendly notes template
When submitting, use the “Notes for Review” field:

- This app uses background location to share presence with roommates and provide timely reminders for chores/events. Location is the core feature even when the app is not in the foreground.
- Sign‑in credentials for review:
  - Email: alex@utexas.edu
  - Password: test1234
- Steps to validate background location:
  1) Log in, create/join a group
  2) Accept location permissions (Always) when prompted
  3) Walk with the device; presence indicators update for group members
- Steps to validate notifications:
  1) Accept notifications
  2) You will receive local reminders for upcoming chores/events

---

### 11) Troubleshooting
- Build fails fetching credentials → run `npx eas build:configure` and re‑authenticate with Apple
- Push tokens return `null` in production → ensure EAS project is linked (`eas init`) so `getExpoPushTokenAsync` has a project ID
- Background fetch does nothing → add `"fetch"` to `UIBackgroundModes` and test on a real device (simulator is unreliable for fetch)
- Missing permission prompts → add the relevant `NS*UsageDescription` keys under `ios.infoPlist`
- iPad screenshots missing → set `supportsTablet: false` or upload proper iPad screenshots

---

### 12) Reference commands
```bash
# Login
expo login
npx eas login

# Link project to EAS (creates/links projectId)
cd mobile
npx eas init

# Build & submit
npx eas build -p ios --profile preview
npx eas submit -p ios --latest

# Production
npx eas build -p ios --profile production
npx eas submit -p ios --latest
```

---

### 13) Optional: keep config in sync
- Keep `app.json` in source control with:
  - `ios.bundleIdentifier`, `ios.buildNumber`
  - `infoPlist` permission strings
  - `plugins: ["expo-notifications"]`
- Keep `eas.json` profiles (`preview`, `production`) with environment variables
- Increment `expo.version` and iOS `buildNumber` per release 