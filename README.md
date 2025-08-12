# RoomSync UT

A UT Austin roommate coordination app.

## Stack
- Backend: Express + Mongoose (MongoDB), JWT, Socket.io, Cloudinary
- Mobile: Expo (React Native), Zustand, Axios, react-native-maps, expo-notifications, expo-location/task-manager

## Monorepo structure
- `backend/`: API server
- `mobile/`: Expo app
- `packages/shared/ut_places.json`: UT housing places for map pins

## Backend
### Requirements
- Node 18+
- MongoDB running locally (or Atlas URI)

### Env
Set the following (example values):
- `MONGO_URI=mongodb://localhost:27017/roomsync`
- `JWT_SECRET=devsecret`
- `PORT=4000`
- `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>` (optional for future image uploads)

These can be exported in your shell before running the server.

### Install & Run
```bash
cd backend
npm i
npm run dev
```
Server runs at http://localhost:4000.

### Seed
```bash
npm run seed
```
Seeds: user `alex@utexas.edu` (password `test1234`), group "West Campus Unit", chores, event, expense, listings, ratings.

### Tests
```bash
npm test
```
Uses in-memory MongoDB.

## Mobile (Expo)
### Requirements
- Node 18+
- Expo CLI (via `npx expo`)
- iOS Simulator or Android Emulator, or physical device with Expo Go

### Env (Public)
Provide your API/WS host (LAN IP for devices):
- `EXPO_PUBLIC_API_URL=http://<your_lan_ip>:4000`
- `EXPO_PUBLIC_WS_URL=http://<your_lan_ip>:4000`

Start Expo with env inline:
```bash
cd mobile
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000 EXPO_PUBLIC_WS_URL=http://192.168.1.23:4000 npm start
```

### Install & Start
```bash
cd mobile
npm i
npm start
```
Pick iOS/Android/web from the Expo dev tools.

## API Response shape
All responses are wrapped:
```json
{ "data": <payload>, "message?": "string", "code?": "string" }
```
Errors:
```json
{ "message": "string", "code": "string", "details?": any }
```

## Core features implemented
- Auth (register/login), Users (/users/me)
- Groups (create/join/current)
- Chores (list/create/update/complete) with repeats
- Events (list/create/update)
- Expenses (list/create) + `/balances`
- Inventory (list/create/update)
- Marketplace (list/create/update + filters)
- Ratings (avg/by-place/create) + UT map pins
- Locations: REST beacon + WS live updates; in-memory presence

## Mobile features
- Auth flow and persistent session
- Dashboard with group onboarding (create/join)
- Chores list + create + complete
- Events list + create
- Expenses balances + create (equal/custom)
- Marketplace list + detail
- Inventory list + add + qty update
- Map: UT pins colored by average rating, live roommate pins
- Hangouts: propose & vote (ephemeral via socket)
- Notifications: chore/event reminders
- Background location (iOS/Android perms configured)

## Notes
- JavaScript only (no TypeScript)
- All IDs returned as `id` (not `_id`)
- CORS enabled for common Expo dev hosts
- Rate limit on `/auth` and `/listings` create 