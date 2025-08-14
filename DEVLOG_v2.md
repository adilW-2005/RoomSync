# DEVLOG v2

- Added profile fields `bio`, `contact` to `backend/src/models/User.js`.
- Implemented Cloudinary integration:
  - New `backend/src/services/cloudinaryService.js` with base64 upload utility.
  - Extended registration to accept `avatarBase64` and upload to Cloudinary in `backend/src/services/authService.js`.
  - Updated `backend/src/routes/auth.js` validation to include optional `avatarBase64`.
- Added user profile update endpoint:
  - New `backend/src/services/userService.js` with `updateProfile` supporting `name`, `bio`, `contact`, `avatarBase64`.
  - Extended `backend/src/routes/users.js` with `PATCH /users/me`.
- Group settings:
  - Extended `backend/src/services/groupService.js` with `updateCurrentGroup`, `regenerateCurrentGroupCode`, `removeMemberFromCurrentGroup`.
  - Extended `backend/src/routes/groups.js` with:
    - `PATCH /groups/current` (rename)
    - `POST /groups/current/regenerate-code`
    - `POST /groups/current/remove-member` (body: `{ userId }`).
  - Added e2e tests in `backend/tests/e2e/groups.test.js` for new routes.
- Mobile updates:
  - `RegisterScreen` now supports optional avatar pick and sends `avatarBase64`.
  - `SettingsScreen` shows group code card, and adds profile edit UI (name, bio, contact, avatar).
  - Added `GroupSettingsScreen` with rename, regenerate code, remove member actions.
  - Updated navigation to use a Settings stack including `GroupSettings`.
  - Extended `useAuthStore` with `updateProfile` and support for `avatarBase64` in register.
  - Extended `useGroupStore` with `rename`, `regenerateCode`, `removeMember`.

Chores (v1.1 improvements):
- Mobile `ChoresScreen`:
  - Added "My Chores" filter toggle and grouping of repeating chores by title/repeat.
  - UI polish: skeleton loader and empty state.
- Mobile `CreateChoreModal`:
  - Added fields for multi-assignees (comma-separated IDs), repeat (none/daily/weekly/custom), and custom days.
- Backend `choreService`:
  - Clarified notification stub for per-assignee push notifications (to be implemented with Expo push).

Events (v1.1 improvements):
- Backend:
  - `backend/src/models/Event.js`: added `lat`, `lng`, `repeat`, `customDays` fields.
  - `backend/src/routes/events.js`: validation updated for new fields.
  - `backend/src/services/eventService.js`: create/update now handle `lat`, `lng`, `repeat`, `customDays`.
- Mobile:
  - `mobile/src/screens/Events/EventsScreen.js`: added inputs for repeat/custom days and optional lat/lng, and map preview in cards.
  - Notifications: schedule both 1 hour and 10 minutes before start via `scheduleEventReminderOneHour` and `scheduleEventReminder`.
  - UI polish: skeleton loader and empty state.

Expenses (v1.1 improvements):
- Backend:
  - `backend/src/models/Expense.js`: added `receiptUrl` field.
  - `backend/src/routes/expenses.js`: added pagination for history (`GET /expenses?page&limit`), `POST /expenses/settle` for settle-up, `GET /expenses/export.csv` for CSV export, and support `receiptBase64` on create.
  - `backend/src/services/expenseService.js`: implemented `getHistoryPaginated`, Cloudinary receipt upload in `createExpense`, `settleUp`, and `exportBalancesCsv`.
- Mobile:
  - `mobile/src/state/useExpenseStore.js`: pagination and corrected balances path.
  - `mobile/src/screens/Expenses/ExpensesScreen.js`: export CSV button, history list with infinite scroll, receipt thumbnails, skeleton and empty states.
  - `mobile/src/screens/Expenses/AddExpenseModal.js`: optional receipt picker (Cloudinary upload via backend).

Inventory (v1.1 improvements):
- Backend:
  - `backend/src/models/Inventory.js`: added `photoUrl`.
  - `backend/src/routes/inventory.js`: search by `q`, accept `photoBase64` on create/update, added `DELETE /inventory/:id`.
  - `backend/src/services/inventoryService.js`: Cloudinary upload for photo, search filter, delete operation.
- Mobile:
  - `mobile/src/state/useInventoryStore.js`: search by name and delete action.
  - `mobile/src/screens/Inventory/InventoryScreen.js`: search input, expiration date input, optional photo picker, show photo and expiration; delete button.

Marketplace (v1.1 improvements):
- Backend:
  - `backend/src/routes/listings.js`: create supports `photosBase64` for multi-upload; endpoints to favorite/unfavorite listings.
  - `backend/src/services/listingService.js`: Cloudinary uploads for listing photos; toggle favorites on `User`.
  - `backend/src/models/User.js`: added `favoriteListings`.
  - `backend/src/socket.js`: basic listing chat demo with `chat:message` and user rooms.
- Mobile:
  - `mobile/src/screens/Marketplace/MarketplaceScreen.js`: Add Listing action with multi-select image picker; favorite/unfavorite buttons.
  - `mobile/src/screens/Marketplace/ListingDetailScreen.js`: map preview if location provided; chat stub emits `chat:message` to seller via socket.

Ratings + Map (enhancements):
- Backend already supported photos in reviews and filters; mobile allows photo uploads and delete own reviews.
- Map shows color-coded UT places by average.

Live Location & Hangouts (v1.1 improvements):
- Backend:
  - `backend/src/routes/locations.js`: `POST /locations/beacon` accepts optional `battery`; broadcasts in socket payload.
  - `backend/src/presence.js`: store `battery` in presence records.
- Mobile:
  - `mobile/src/screens/Map/MapScreen.js`: markers show battery% if available, otherwise last updated time.
  - `mobile/src/screens/Settings/SettingsScreen.js`: added “Visible to Group” toggle that disables foreground beacon posts when off.
  - `mobile/src/screens/Hangouts/HangoutsScreen.js` + `mobile/src/state/useHangoutStore.js`: proposals include description and location fields; local notifications for new proposals and simple results.

Tests:
- Added e2e coverage for expenses (history/export/settle), inventory (search/delete), and listings (favorite/unfavorite). All suites green.

Env:
- Ensure `CLOUDINARY_URL` is set in backend environment for image uploads.

Notes:
- Kept JSON success/error shapes consistent via `res.success` usage.
- Preserved existing design language and UT branding. 