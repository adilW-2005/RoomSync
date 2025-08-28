# Messages Verification Checklist

- Message Seller flow
  - Open a listing (ensure seller is another account)
  - Tap "Chat with Seller"
  - Expect to land in Conversation view
  - Type and send a message; it appears immediately (optimistic), then finalizes
  - On seller device, receives message in realtime; unread increments in inbox
  - Open thread on seller, it marks as read and read receipt is received on buyer

- Message Roommate flow
  - From Dashboard, in Roommates carousel, tap "Message" on a roommate
  - Expect to land in Conversation view
  - Send a message; ensure it appears in Messages tab inbox with last message preview

- Inbox basics
  - Messages tab shows list of conversations sorted by most recent
  - Unread badge on tab reflects sum of unread across conversations
  - Pull-to-refresh re-fetches conversations without errors

- Fallback
  - If sockets are offline, sending still works; inbox updates after navigate back or manual refresh

- Reliability
  - No console errors in Metro; no 5xx in backend logs during basic flows 