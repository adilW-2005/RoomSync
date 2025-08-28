# RoomSync UT

Monorepo: Express backend + Expo React Native app.

## Setup
- Backend: `cd backend && npm i && npm run dev`
- Mobile: `cd mobile && npm i && npx expo start`

## Env
Back-end required:
- `MONGO_URI`
- `JWT_SECRET`
- `PORT` (optional, default 4000)
- `CLOUDINARY_URL` (for uploads)
- `APP_SCHEME` (e.g., `roomsyncut`) for deep links
- `DEEP_LINK_HOST` (e.g., `roomsync.local`) for universal links

See `backend/src/config/env.js` for defaults in dev/test. 

## Schedule Direction Reminder – Verification Guide

- Manual QA (iOS and Android):
  - Upload or manually enter schedule via Living → FAB → Upload Schedule.
  - Verify next class appears on Living “Next Class” card with building and start time.
  - Tap Guide Me → confirm ETA renders within ~2s on good network; deny location, confirm guidance text appears to enable permissions; offline, confirm retry message appears.
  - Change device time/timezone; confirm next class and reminders still compute at local device time.
  - Update lead time via hidden Diagnostics not required; reminders auto-reschedule when next class changes.

- Run backend tests:
  - `cd backend && npm test`

- Run mobile unit/integration tests:
  - `cd mobile && npm test`

- Run Detox (requires simulators/emulators):
  - iOS: `cd mobile && npm run e2e:build:ios && npm run e2e:test:ios`
  - Android: `cd mobile && npm run e2e:build:android && npm run e2e:test:android`

- Known limitations:
  - Background fetch cadence is OS-managed; “leave now” notifications run best between 7am–7pm.
  - Offline route fallback uses last successful server-side route only if requested in-session per user. 