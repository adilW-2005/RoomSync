# RoomSync UT – Manual Test Guide (v1)

Use this guide to thoroughly validate the app end-to-end as a user. It covers setup, all feature flows, expected outcomes, and quick troubleshooting.

## 0) Prerequisites
- Node 18+
- MongoDB running locally (or Atlas URI)
- iOS Simulator or Android Emulator, or physical device with Expo Go

## 1) Start Backend
```bash
cd backend
export MONGO_URI=mongodb://localhost:27017/roomsync
export JWT_SECRET=devsecret
export PORT=4000
npm i
npm run dev
```
Expected:
- Log: `API listening on http://localhost:4000`
- MongoDB connected

Optional seed:
```bash
npm run seed
```
Expected:
- Seeded user `alex@utexas.edu` and group `West Campus Unit (AB12CD)` with sample data

## 2) Start Mobile (Expo)
Choose target and start with appropriate envs.

- iOS/Android Simulator (uses localhost):
```bash
cd mobile
npm i
EXPO_PUBLIC_API_URL=http://localhost:4000 EXPO_PUBLIC_WS_URL=http://localhost:4000 npm start
```
Press:
- `i` for iOS Simulator, or `a` for Android Emulator, or `w` for Web

- Physical device (Expo Go; same Wi‑Fi as Mac):
```bash
cd mobile
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:4000 EXPO_PUBLIC_WS_URL=http://<YOUR_LAN_IP>:4000 npm start
```
Scan QR in Expo Dev Tools / terminal.

## 3) Core UX Tests (Happy Path)
Perform these in order on a fresh DB (or after seed where noted).

### A. Auth
1. Open app → Login screen shows UT theme (burnt orange, Poppins)
2. Tap “Create account”
   - Enter: Name: `Alex Longhorn`, Email: `alex+manual@utexas.edu`, Password: `test1234`
   - Expected: Redirected to Main tabs, you’re signed in
3. Kill app → relaunch
   - Expected: Auto-login (token persisted)

### B. Groups
1. Dashboard shows “Join or create a group to get started.”
2. Create Group: enter `Test Group One` → Create
   - Expected: Group info shows (Group: Test Group One; Code: 6-char)
3. Logout and create another account (or use a second simulator/device)
   - Join Group: enter code from step 2 → Join
   - Expected: Group shows same name and members count increases

### C. Chores
1. Go to Chores
2. Add chore (FAB +): Title: `Take out trash`, Due in hours: `1` → Create
   - Expected: Appears in list with due time
3. Complete: Tap “Complete” → Item removed; if repeat was set (weekly), next occurrence appears
4. Notification: For a new chore due in >1 hour, receive local notification ~1 hour before (requires notification perms)

### D. Events
1. Go to Events → Add (FAB)
   - Title: `Move-in Meeting`, Start: `YYYY-MM-DD HH:mm` (10+ min ahead), End: +1h, Location: `Lobby`
   - Expected: Listed with time range
2. Notification: Receive event reminder ~10 minutes before start

### E. Expenses + Balances
1. Go to Expenses → Balances list loads
2. Add Expense (equal): Amount `50`, Notes `Groceries`, Split `Equal` → Create
   - Expected: Balances update (payer positive, others negative)
3. Add Expense (custom): Toggle `Custom`
   - Fill per-member amounts; ensure sum equals total → Create
   - Expected: Balances reflect custom split; member names are friendly

### F. Inventory
1. Go to Inventory → Add (FAB)
   - Name `Paper Towels`, Qty `6`, Shared `true` → Create
2. Tap `+1` then `-1` → Qty updates

### G. Marketplace
1. Go to Marketplace
   - Filters: Try `type=furniture`, `q=desk`, `min=10`, `max=200`
   - Expected: List filters accordingly
2. Tap a listing → Detail shows price, status, and “Contact Seller” (stub)

### H. Ratings + Map
1. Go to Ratings → List of UT places with averages (N/A if no reviews)
2. Tap a place → Add Review (Stars 4–5; Tips optional) → Submit
   - Expected: Review appears; averages update
3. Go to Map → Pins colored by avg rating
   - Green ≥4.5, Gold ≥3.5, Red otherwise; Grey if N/A

### I. Live Location + Presence
1. Settings → Toggle “Share Location” ON (allow location perms)
   - Expected: Background task starts; foreground fallback pings approx every 3 minutes
2. Map → See your blue roommate pin appear with last updated time (within few minutes)
3. Open a second device/simulator logged into same group and enable sharing
   - Expected: Both see each other’s pins live (Socket.io updates)

### J. Hangouts (Realtime)
1. Go to Hangouts → Propose: `Coffee at Jester?` / `Tonight 7pm`
   - Expected: Proposal appears
2. On second client: vote Yes/No
   - Expected: Votes counts update on both clients via socket events

## 4) API Envelope & Access Control (Spot Checks)
Use curl or Postman.

- Register/Login match shape:
```bash
curl -s http://localhost:4000/auth/login -H 'Content-Type: application/json' -d '{"email":"alex@utexas.edu","password":"test1234"}' | jq
# -> { data: { access_token, user: {...} } }
```
- Protected route with token:
```bash
curl -s http://localhost:4000/users/me -H "Authorization: Bearer <token>" | jq
```
- Error shape:
```bash
curl -s http://localhost:4000/groups/join -H 'Content-Type: application/json' -d '{"code":"BAD"}' | jq
# -> { message, code, details? }
```
- Ensure no cross-group access: create a second group and verify you cannot access resources from the other group

## 5) Notifications & Background Location
- iOS Simulator: notifications may require enabling in Settings; background location requires some simulator fiddling
- Physical device recommended:
  - Allow notifications on first launch
  - Keep app running then background; confirm due event/chore notifications
  - Toggle share location and confirm pins update every few minutes

## 6) Theming & UX
- Verify Poppins font loads (headers bold; body regular)
- UT palette on buttons, headers; cards rounded with subtle shadows
- Smooth transitions on modals and lists

## 7) Web (optional)
```bash
cd mobile
EXPO_PUBLIC_API_URL=http://localhost:4000 EXPO_PUBLIC_WS_URL=http://localhost:4000 npm run web
```
- Validate main flows (map may need refresh in web dev)

## 8) Troubleshooting
- Clear Expo cache: `npm start -- --clear`
- If device cannot connect: use LAN IP and ensure same Wi‑Fi
- If sockets fail: confirm `EXPO_PUBLIC_WS_URL` matches API host/port, backend logs show socket connections
- If ratings or map fail: ensure backend running; check console for failed fetches
- If notifications don’t fire: check device OS notification settings; ensure time is in future
- If location pins don’t appear: grant location perms; wait up to 3 minutes or move device position; verify `/locations/presence` returns your beacon

## 9) PASS Criteria Checklist
- [ ] Register/Login works; session persists
- [ ] Create/Join group works across clients
- [ ] Chores: create/complete (repeat spawns next); notification received
- [ ] Events: create/list; notification received
- [ ] Expenses: equal/custom; balances correct; names displayed
- [ ] Inventory: add and qty updates
- [ ] Marketplace: filters, detail screen
- [ ] Ratings: list/detail/add; Map pins color by avg
- [ ] Live location: pins appear/update across clients
- [ ] Hangouts: proposals and votes update live
- [ ] All screens reflect UT theme and fonts

## 10) Optional Next Tests (v1.1)
- Image uploads for marketplace via Cloudinary
- Push notifications (server-driven)
- Role-based actions (admin)

Happy testing 🤘 