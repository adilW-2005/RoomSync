# Messaging Flows

## Get-or-Create

- From Listing
  - Stable key: buyerId + sellerId + listingId
  - Client calls `POST /messages/listing/get-or-create { listingId, sellerId }`
  - Server finds or creates a `Conversation { type: 'listing', listingId, participants: [buyer, seller] }`
  - Returns `conversation.id`

- From Roommate
  - Stable key: two user ids
  - Client calls `POST /messages/dm/get-or-create { otherUserId }`
  - Server finds or creates `Conversation { type: 'dm', participants: [you, other] }`

## Inbox

- Client calls `GET /messages/conversations`
- Renders list sorted by `updatedAt` with `lastMessage` preview, timestamp, and unread badge (from your participant entry)

## Conversation View

- On open: `GET /messages/conversations/:id/messages?page=1&limit=30` (newest first in response), inverted list
- Pagination: on scroll to top, increment page and append older messages
- Composer: optimistic insert; then `POST /messages/conversations/:id/messages { text }`; reconcile on response
- On mount: call `POST /messages/conversations/:id/read`

## Unread & Read

- Server increments unread for the other participant upon send; updates `lastMessage` and `updatedAt`
- On `read`, server sets current user's unread to 0 and broadcasts `dm:read`
- Tab badge shows sum of unread across conversations

## Realtime & Fallback

- Realtime: client emits `join:user { userId }` once socket is connected; server pushes `dm:message` and `dm:read`
- Fallback: polling by refreshing inbox on navigation or pull-to-refresh (store `fetchConversations`) 