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