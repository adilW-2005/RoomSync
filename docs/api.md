RoomSync UT API

Auth
- POST /auth/register → { access_token, user }
- POST /auth/login → { access_token, user }

Chores
- GET /chores?status=open|done&groupId=ID → Chore[]
- POST /chores { title, assignees?, dueAt, repeat?, customDays?, pointsPerCompletion? } → Chore
- PATCH /chores/{id} { ...partial } → Chore
- POST /chores/{id}/complete → Chore (completed)

Events
- GET /events?groupId=ID → Event[]
- POST /events { title, startAt, endAt, locationText?, attendees?, lat?, lng?, repeat?, customDays? } → Event
- PATCH /events/{id} { ...partial } → Event
- POST /events/{id}/rsvp { status: going|maybe|not } → Event

Expenses
- GET /expenses?page&limit&groupId=ID → { items, page, limit, total }
- POST /expenses { amount, split, shares?, notes?, receiptBase64?, recurring? } → Expense
- GET /expenses/balances?groupId=ID → { userId, amount }[]
- POST /expenses/settle { fromUserId, toUserId, amount, groupId? } → Expense

Inventory
- GET /inventory?q&category&tag&groupId=ID → InventoryItem[]
- POST /inventory { name, qty, shared?, expiresAt?, photoBase64?, lowStockThreshold?, categories?, tags? } → InventoryItem
- PATCH /inventory/{id} { ...partial, photoBase64? } → InventoryItem
- DELETE /inventory/{id} → { id }

Marketplace Listings
- GET /listings?type&q&min&max&category&sort → Listing[]
- POST /listings { type, title, price, description?, photos?, photosBase64?, loc?, categories?, availableFrom?, availableTo?, status? } → Listing
- PATCH /listings/{id} { ...partial } → Listing
- POST /listings/{id}/favorite → User
- POST /listings/{id}/unfavorite → User
- POST /listings/{id}/messages { toUserId, text?, photosBase64? } → Message
- GET /listings/{id}/messages?withUserId=ID → Message[]

Locations
- POST /locations/beacon { groupId, lat, lng, battery?, shareMinutes? } → { ok: true }
- GET /locations/presence?groupId=ID → { userId, lat, lng, battery?, updatedAt, shareUntil? }[]

Ratings
- GET /ratings/avg?placeId → { avg, count? }
- GET /ratings/by-place?placeId → Rating[]
- POST /ratings { kind, placeId, placeName, stars, pros?, cons?, tips?, photos?, photosBase64? } → Rating
- DELETE /ratings/{id} → { id } 

# Messaging API

## REST Endpoints

- GET `/messages/conversations` (auth)
  - Query: `page?`, `limit?`
  - Returns: Array of conversations `{ id, type, listingId?, participants: [{ userId, unreadCount, lastReadAt }], lastMessage?, updatedAt }`

- POST `/messages/dm/get-or-create` (auth)
  - Body: `{ otherUserId }`
  - Returns: Conversation

- POST `/messages/listing/get-or-create` (auth)
  - Body: `{ listingId, sellerId }`
  - Returns: Conversation

- GET `/messages/conversations/:id/messages` (auth)
  - Query: `page?`, `limit?` (default 30)
  - Returns: Array of messages, newest first in this API: `{ id, conversationId, fromUserId, toUserId, text, photos, createdAt }`

- POST `/messages/conversations/:id/messages` (auth)
  - Body: `{ text?, photosBase64?[] }`
  - Returns: `{ conversation, message }`

- POST `/messages/conversations/:id/read` (auth)
  - Marks the conversation as read for the current user, returns updated conversation.

## Socket Events

- Client → Server: `join:user` `{ userId }`
  - Joins a personal room for targeted events.

- Server → Client: `dm:message` `{ conversationId, message }`
  - Delivered to both participants when a new message is sent.

- Server → Client: `dm:read` `{ conversationId, userId, readAt }`
  - Read receipt broadcast to both participants. 