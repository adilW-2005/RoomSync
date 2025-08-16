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

Premium UI Overhaul (UT brand, v1.2):
- Theme & tokens:
  - Added `mobile/src/styles/theme.js` with colors, spacing, radii, typography, shadows.
  - Fonts: Poppins Regular/SemiBold/Medium loaded in `mobile/App.js`.
- Reusable UI:
  - `mobile/src/components/UTText.js` for typography variants.
  - `mobile/src/components/UTButton.js` (primary/secondary, animated press state).
  - `mobile/src/components/UTCard.js` (16px radius, soft shadow).
  - `mobile/src/components/UTInput.js` (labels in burnt orange, focus ring, 50px height).
  - Polished `EmptyState` and `SkeletonList` to match brand neutrals.
- Navigation polish:
  - `MainTabs` active indicator (burnt orange bar) and subtle icon pulse; enlarged tab bar touch target.
  - `AuthStack` headers with centered titles and Poppins.
  - Smooth fade transitions added across stacks and primary tab screens.
- Screens updated (visuals only, logic intact):
  - Auth: `LoginScreen`, `RegisterScreen` rebuilt with UT components, consistent spacing and buttons.
  - Dashboard: premium cards, greeting header, group summary in card; preserved sockets/group logic.
  - Chores: cards for groups, premium FAB, UT-styled modal in `CreateChoreModal`.
  - Events/Expenses/Inventory/Marketplace/Ratings/Map/Settings/Hangouts: applied UT headers, cards, inputs, and buttons; preserved all store/API logic.
- Micro-interactions:
  - Added `mobile/src/components/FadeSlideIn.js` and applied to lists (Events, Chores, Marketplace, Expenses, Inventory, Ratings) for subtle entrance animations.
  - Button press animations via `UTButton`.
  - Refined tab icon pulse + opacity fade on focus.
  - `EmptyState` now gently fades/slides in.
  - Added `mobile/src/components/PressableScale.js` and applied to FABs/primary actions for consistent press feedback.
- Map markers and callouts:
  - Added `mobile/src/components/UTPin.js` and replaced default markers with UT burnt-orange/gold pins; roommate markers use blue variant.
  - Callouts show place name with star rating using `RatingStars` when available.
- Accessibility:
  - Ensured WCAG AA contrast on text/buttons; consistent 16pt body and 22–24pt headers. 
impl
v3 (Feature Completion for 1.0) — Phase 1 delivered:
- Groups:
  - Roles & permissions scaffold: `memberRoles` on `Group` with `owner/admin/member` and enforcement in updates.
  - Group switcher: `GET /groups`, `POST /groups/switch` (moves selected to current); mobile UI in `GroupSettingsScreen`.
  - Invites: `POST /groups/current/invites` returns `{ code, link, universal }`, `GET /groups/current/invites`, `POST /groups/current/invites/revoke`, `POST /groups/join/invite`.
  - Deep links: invite links use `APP_SCHEME://invite?code=...` and universal `https://DEEP_LINK_HOST/invite/:code`.
  - Tests: extended `backend/tests/e2e/groups.test.js` for listing, switching, invite create/list/revoke/join.
- Auth/Profile:
  - Unique username: added `username` on `User` with server validation; registration accepts optional username.
  - Privacy: added `showContact` boolean; exposed via `PATCH /users/me`.
  - Account deletion: `DELETE /users/me` removes user and group membership (GDPR-style minimal implementation).
- Env:
  - Added `APP_SCHEME` and `DEEP_LINK_HOST` to `backend/src/config/env.js`.
- Mobile:
  - `useGroupStore`: list/switch groups; invite create/list/revoke; join by invite.
  - `GroupSettingsScreen`: switcher UI and invites section with shareable link.
  - `useAuthStore`: registration supports username; added `deleteAccount`. 