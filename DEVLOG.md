# RoomSync UT – Developer Log

This log tracks architecture decisions, progress, todos, and context for the RoomSync UT app. Keep this updated as we ship slices.

## Stack (agreed)
- Backend: Express (Nest-like structure) + MongoDB (Mongoose), JWT auth, socket.io, Cloudinary
- Frontend: React Native Expo (JS), Zustand, Axios, react-native-maps, expo-notifications, expo-location + expo-task-manager
- Styling: UT Austin vibe – burnt orange (#BF5700), white, dark gray. Poppins font. Rounded cards, subtle shadows.

Note: Original spec requested NestJS in JavaScript. Due to JavaScript-only constraint and Nest decorators relying on TypeScript/Babel, we are implementing an Express-based backend with Nest-like modular structure to ship fast while meeting all functional requirements.

## Response & Error Shape
- Success: `{ data, message?, code? }`
- Error: `{ message, code, details? }`
- Always convert `_id` -> `id` on output.

## Env Keys
- Backend: `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLOUDINARY_URL`
- Mobile: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`

## Build Order
1) Auth + Groups [IN PROGRESS]
2) Chores
3) Events
4) Expenses (+ balances)
5) Inventory
6) Marketplace/Sublets
7) Ratings + Map
8) Live Location + Hangouts

## Done Today
- Initialize monorepo structure with `backend/`, `mobile/`, `packages/shared/`
- Implement backend Auth + Groups (Express + Mongoose), JWT, CORS, Helmet, Morgan, rate limiting (auth + listing create placeholder), Cloudinary config scaffold, Socket.io gateway skeleton
- Shared UT places JSON seed
- Added e2e tests (supertest) for auth and groups
- Implemented Chores model/service/routes with repeats (none|daily|weekly|custom) and next-occurrence generation on complete; added e2e tests; extended seed with 2 chores
- Implemented Events model/service/routes; validation for time range and attendees; added e2e tests; extended seed with 1 event
- Implemented Expenses model/service/routes and top-level `GET /balances`; equal/custom splits, validation; e2e tests; seed with one expense
- Implemented Inventory model/service/routes; list/create/update; e2e tests; seed with two items
- Implemented Marketplace/Sublets model/service/routes with filtering (type/q/min/max), create (rate-limited), update; e2e tests; seed with 2 listings
- Implemented Ratings backend: model/service/routes (`GET /ratings/avg`, `GET /ratings/by-place`, `POST /ratings`); e2e tests; seed with sample ratings. UT places available in `packages/shared/ut_places.json` for map pins.
- Implemented in-memory Presence registry; `POST /locations/beacon` updates registry and broadcasts WS; added `GET /locations/presence`; e2e test.
- Expo mobile app scaffolded: navigation (AuthStack → MainTabs), UT theme (Poppins, burnt orange), Axios client with envelope, Zustand stores (auth, group), basic screens (Dashboard, Chores, Events, Expenses, Map with UT pins, Marketplace, Settings), socket client stub. Installed deps.
- Wired mobile Chores list with completion; wired Expenses balances list. Added Zustand stores: `useChoreStore`, `useExpenseStore`.
- Added Group Onboarding UI (create/join) on Dashboard; Map pins now colored by avg rating from backend. Settings includes placeholder location sharing toggle.
- Added mobile Add Expense modal (equal split) with balances auto-refresh.
- Ratings mobile: list screen with averages for UT places and detail screen to view/add reviews.
- Mobile: persisted auth (token+user) via AsyncStorage with hydration on launch; persisted current group; wired Settings presence toggle to send `/locations/beacon` using current group. Socket helpers to join group room and listen for `location:update` (UI hookup pending). Added background location task (expo-location/task-manager) with iOS/Android permissions.

## Assumptions
- For `GET /groups/current`, we return the first group from the user's `groups` array (we may extend to track current group explicitly later)
- Email/password auth (no OAuth for v1)
- Presence is ephemeral (in-memory) for now; may persist last-known in Redis or Mongo if needed later
- For Chores endpoints, if `groupId` is missing we use the current group (first in user's `groups`). POST can optionally include `groupId`; GET filters by current group by default.

## Next
- Mobile: live roommate pins on Map using WS `location:update` + initial `GET /locations/presence`; added Chores create editor (basic title + due in hours). Implemented Marketplace mobile list with filters (type/q/min/max). Implemented Events mobile list with create modal. Implemented Inventory mobile list with add and qty update. Added Hangouts screen with socket-driven proposals and votes (ephemeral). Auto-connect socket on Dashboard when token+group present. Added Marketplace listing detail screen with contact CTA stub. Added local notifications: chore due (1h before) and event start (10m before). Mobile: member name mapping for balances and map roommate pins (fetch current group members and show friendly names). Added custom split support to Add Expense modal with per-member amounts and validation. Fixed backend package.json `private` to boolean true.

## Testing
- e2e tests for Auth + Groups using supertest
- Will expand tests per feature slice

## Security
- Only group members can access group data (middleware checks)
- Rate limit on auth routes and listing create
- CORS enabled for Expo dev 