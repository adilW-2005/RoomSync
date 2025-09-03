## Living Tab Forensics Report

### Scope
- Investigate the Living tab in the React Native app without refactoring or changing code.
- Identify components used, data sources, directions/routing path, state management, file/function map, API key exposure, and end-to-end data flow.

---

### Entry Points and Files
- Navigation registration: `mobile/src/app/MainTabs.js`
  - `Living` tab uses `LivingStack` with the following screens:
    - `LivingHome` → `mobile/src/screens/Living/LivingScreen.js`
    - `RatingsList` → `mobile/src/screens/Ratings/RatingsListScreen.js`
    - `RatingsDetail` → `mobile/src/screens/Ratings/RatingsDetailScreen.js`
    - `Map` → `mobile/src/screens/Map/MapScreen.js`
    - `MapGuide` → `mobile/src/screens/Map/MapGuideScreen.js`

---

### Components Used by `LivingScreen`
File: `mobile/src/screens/Living/LivingScreen.js`
- Map and overlays:
  - `MapView`, `Marker`, `Callout`, `PROVIDER_GOOGLE` (react-native-maps)
  - `LinearGradient` (expo-linear-gradient)
- UI components:
  - `GradientHeader`, `UTText`, `UTInput`, `UTCard`, `UTButton`, `UTPin`, `RatingStars`, `FadeSlideIn`, `Ionicons`
- State and stores:
  - `useListingStore`, `useMemberStore`, `useAuthStore`, `useGroupStore`, `useMessageStore`, `useScheduleStore`, `useSafeAreaInsets`
- Networking and sockets:
  - `api` (axios client), `connectSocket`, `joinGroupRoom`, `onLocationUpdate`, `getSocket`

---

### Data Sources and Calls

#### Places (static)
- Source: Local JSON file `mobile/src/assets/ut_places.json` with fields like `placeId`, `placeName`, `address`, `lat`, `lng`, `category`.
- Usage: Imported and filtered in `LivingScreen` for map markers and list.

#### Ratings (per place)
- Client calls (average rating for each place) in `LivingScreen`:
```js
const r = await api.get(`/ratings/avg?placeId=${p.placeId}`);
```
- Ratings detail screen fetch and mutations:
```js
// List reviews for a place
await api.get(`/ratings/by-place?placeId=${place.placeId}`);
// Create a rating
await api.post('/ratings', payload);
// Delete a rating
await api.delete(`/ratings/${id}`);
```
- Backend routes: `backend/src/routes/ratings.js`
  - `GET /ratings/avg`
  - `GET /ratings/by-place`
  - `POST /ratings`
  - `DELETE /ratings/:id`

#### Roommate pins (presence)
- Initial presence fetch in `LivingScreen`:
```js
const presence = await api.get(`/locations/presence?groupId=${currentGroup.id}`);
```
- Live updates via websockets in `LivingScreen`:
```js
const url = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
if (!getSocket()) connectSocket(url, token);
joinGroupRoom(currentGroup.id);
onLocationUpdate((payload) => { /* update roommatePins */ });
```
- Client background beacon (device → server) in `mobile/src/lib/locationTask.js`:
```js
await api.post('/locations/beacon', { groupId, lat: latitude, lng: longitude });
```
- Backend presence and socket broadcasting:
  - Routes: `backend/src/routes/locations.js`
    - `GET /locations/presence?groupId=...`
    - `POST /locations/beacon` → emits `location:update` to group room
  - Socket server: `backend/src/socket.js`
    - Handles `join:group`, rebroadcasts `location:update`

- Member name mapping for roommate pins:
```js
// mobile/src/state/useMemberStore.js
const group = await api.get('/groups/current');
// Builds membersById from group.members
```

#### Sublets (optional layer)
- `LivingScreen` triggers listings fetch when `layers.sublets` is enabled:
```js
setFilters({ type: 'sublet', q: search });
fetchListings();
```
- Store and SDK:
```js
// mobile/src/state/useListingStore.js
const res = await sdk.listings.list({ type, q, min, max });
// mobile/src/api/sdk.js
GET /listings?type=sublet&q=...
```
- Backend route: `backend/src/routes/listings.js` → `GET /listings`

---

### Directions: Source, Proxy, and Polyline
- Provider: Google Directions API (walking mode).
- Client uses a backend proxy (never calls Google directly from the app):
```js
// mobile/src/api/sdk.js
NavAPI.getRoute({ originLat, originLng, destLat, destLng })
// GET /nav/route?originLat=...&originLng=...&destLat=...&destLng=...
```
- Backend proxy implementation: `backend/src/routes/nav.js`
  - Requires server env `GOOGLE_MAPS_API_KEY`
  - Calls: `https://maps.googleapis.com/maps/api/directions/json?origin=...&destination=...&mode=walking&key=<KEY>`
  - Returns: `{ etaMinutes, distanceMeters, polyline }`
- Polyline decoding: Client-side in `mobile/src/screens/Map/MapGuideScreen.js`
```js
const r = await NavAPI.getRoute(...);
const points = decodePolyline(r.polyline || '');
setCoords(points.map(([lat, lng]) => ({ latitude: lat, longitude: lng })));
```
- Who triggers directions:
  - `useScheduleStore.refreshNext()` computes ETA for the next class using `NavAPI.getRoute`
  - “Guide Me” button in `LivingScreen` navigates to `MapGuideScreen` which fetches & draws route

---

### Map Provider and Tiles
- Map rendering via `react-native-maps`.
- Android: explicitly uses Google Maps provider via `PROVIDER_GOOGLE`.
- iOS: uses default provider (Apple Maps) since provider is `undefined` for iOS in `LivingScreen`.
- No Mapbox usage in the codebase.

---

### State Management (Zustand + local state)
- Local UI state in `LivingScreen`:
  - `region`, `showList`, `search`, `category`, `layers` (`roommates`, `sublets`), `sheet`, `ratings` (avg ratings map), `roommatePins` (userId → position), `controlsH`
- Stores used:
  - `useListingStore`
    - State: `items`, `filters`, `loading`
    - Methods: `setFilters`, `fetch()` → `GET /listings`
  - `useMemberStore`
    - State: `membersById`, `loading`
    - Methods: `fetchCurrentGroupMembers()` → `GET /groups/current`
  - `useAuthStore`
    - State: `user`, `token`
    - Side effect: sets Authorization header in `api` client
  - `useGroupStore`
    - State: `currentGroup`
    - Methods: `getCurrent()`, etc. → used to determine `groupId` for presence
  - `useMessageStore`
    - Methods: `openOrCreateListing(listingId, sellerId)`, `openOrCreateDM(userId)` → opens conversations used by sheet actions
  - `useScheduleStore`
    - State: `nextClass`, `etaMinutes`, `ui.showNextCard`, `warningLate`
    - Methods: `hydrate()`, `refreshNext()` (requests GPS permission, gets current location, calls `NavAPI.getRoute`), `savePrefs()`

---

### File / Function Map

| Data type | Client code (files/functions) | Backend endpoint(s) | Backend code | State destination |
|---|---|---|---|---|
| Places (static) | `LivingScreen` imports `src/assets/ut_places.json`; filtered via `filteredPlaces` | N/A | N/A | Local component state only |
| Ratings (avg) | `LivingScreen` `api.get(/ratings/avg?placeId=...)` | `GET /ratings/avg` | `backend/src/routes/ratings.js` | `ratings` state in `LivingScreen` |
| Ratings (details) | `RatingsDetailScreen` `GET /ratings/by-place`, `POST /ratings`, `DELETE /ratings/:id` | `GET /ratings/by-place`, `POST /ratings`, `DELETE /ratings/:id` | `backend/src/routes/ratings.js` | Local screen state |
| Roommate presence (initial) | `LivingScreen` `GET /locations/presence?groupId=...` | `GET /locations/presence` | `backend/src/routes/locations.js` → `presence.getGroupPresence` | `roommatePins` state |
| Roommate presence (live) | `LivingScreen` socket: `joinGroupRoom`, `onLocationUpdate` | Socket event `location:update` | `backend/src/socket.js` & emit from `POST /locations/beacon` | `roommatePins` state |
| Presence beacon (device→server) | `mobile/src/lib/locationTask.js` `POST /locations/beacon` | `POST /locations/beacon` | `backend/src/routes/locations.js` → `presence.updatePresence` + socket emit | Server in-memory presence |
| Member names | `useMemberStore.fetchCurrentGroupMembers()` | `GET /groups/current` | `backend/src/routes/groups.js` | `membersById` store |
| Sublets | `useListingStore.fetch()` via `sdk.listings.list()` | `GET /listings` | `backend/src/routes/listings.js` | `useListingStore.items` |
| Directions (ETA) | `useScheduleStore.refreshNext()` → `NavAPI.getRoute()` | `GET /nav/route` | `backend/src/routes/nav.js` → Google Directions API | `useScheduleStore.etaMinutes`, `warningLate` |
| Directions (polyline) | `MapGuideScreen` → `NavAPI.getRoute()` → `decodePolyline()` | `GET /nav/route` | `backend/src/routes/nav.js` | Local screen state `coords` |

---

### API Keys and Config Exposure
- Google Directions API key: `GOOGLE_MAPS_API_KEY` is loaded and used on the server only (`backend/src/config/env.js`, `backend/src/routes/nav.js`). It is not present in the mobile client.
- Client exposes non-secret runtime configuration via Expo public envs:
  - `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL` used to resolve REST base URL and websocket URL.
- No Mapbox keys or Apple MapKit keys in the client.

---

### End-to-End Data Flow Summary
- Open Living tab → `LivingScreen` renders `MapView` and overlay controls.
- Places: pulled from local `ut_places.json`, filtered by viewport/category/search → displayed as markers and optional list.
- Ratings: `LivingScreen` preloads average rating per visible place via `GET /ratings/avg`; callouts and list items show `RatingStars`. Drill-in to `RatingsDetailScreen` uses `GET /ratings/by-place`, with `POST /ratings` and `DELETE /ratings/:id` for mutations.
- Roommate pins: on mount, `GET /locations/presence?groupId=...` seeds `roommatePins`. Client connects socket, emits `join:group`, and listens for `location:update` to update pins. Devices send location via background task (`POST /locations/beacon`), backend updates in-memory presence and emits to the group room.
- Sublets: when toggled, `useListingStore` fetches `GET /listings?type=sublet&q=...` and displays markers/list. Bottom sheet actions can favorite and message sellers.
- Directions/ETA: `useScheduleStore.refreshNext()` requests GPS permission, reads current location, and calls `GET /nav/route` (backend proxy to Google) to compute `etaMinutes` and `warningLate`. “Guide Me” navigates to `MapGuideScreen`, which calls `GET /nav/route`, decodes `polyline` on-device, and renders a `Polyline` between origin and destination.
- Map providers: Android uses Google Maps; iOS uses Apple Maps via default provider.

---

### Notable Findings
- Directions are proxied through the backend; the Google Maps API key is not exposed in the client.
- Presence and roommate pins rely on both REST (`/locations/presence`) and Socket.IO (`location:update`) with group room scoping via `join:group`.
- Places are local JSON, not fetched; ratings enrich those places via lightweight per-place `GET /ratings/avg` calls.
- State is a mix of local component state and multiple small Zustand slices (`listing`, `member`, `group`, `auth`, `message`, `schedule`). 