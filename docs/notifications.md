# Notifications Architecture (RoomSync UT)

This document describes the end-to-end notifications system.

## Event → Notification Pipeline

- Domain logic emits events (e.g., `chat.message.new`, `chore.assigned`, `event.reminder.60m`).
- `Notification Orchestrator` applies routing, user preferences, quiet hours, batching, idempotency, and writes `Notification` rows with `status=queued`.
- `Delivery Worker` sends via channel adapters (Push now; Email/SMS later) and updates rows (`sent/failed`).
- In-app inbox renders from `Notification` table; real-time updates via socket `notification:new`.

## Data Models

- `Notification`: { userId, type, category, title, body, data, deeplink, channels[], status, priority, scheduledFor, sentAt, readAt, createdAt }
- `UserNotificationPrefs`: { userId, categories{}, channels{}, quietHours{start,end,tz}, digest('daily'|'weekly'|'off') }
- `DeviceToken`: { userId, platform, token, enabled, lastSeenAt }
- `NotificationBatch` (reserved for digests): { userId, category, windowStart, windowEnd, count, mergedIds[] }

## Channels

- Push: Expo push via `sendExpoPush`; `pushAdapter` maps user → tokens from `DeviceToken`.
- In-app: Socket.io event `notification:new` to user room; inbox fetch via REST.
- Email/SMS: Not implemented yet; orchestrator design allows new channels.

## Preferences & Quiet Hours

- `GET/PUT /notification_prefs` returns/updates per-user categories, channels, quiet hours, and digest.
- Orchestrator defers non-high priority notifications during quiet hours by 1 hour (configurable).

## Scheduling & Delivery

- Scheduler runs every minute (`startScheduler`) to deliver due notifications.
- Immediate for high-priority (chat) and system-critical notifications.

## API

- `GET /notifications?status=unread|all&page=&limit=`: list notifications
- `GET /notifications/unread_count`: unread count
- `POST /notifications/:id/read`: mark read
- `POST /notifications/read_all`: mark all read
- `POST /devices`: register device token
- `GET /notification_prefs`, `PUT /notification_prefs`: preferences

## Mobile

- Device registration via `registerForPushToken()` on login.
- Inbox screen (`ActivityInboxScreen`) shows canonical notifications; swipe/tap to mark read; mark all read.
- Dashboard header shows ring with unread dot from `useNotificationStore().unreadCount`.
- Deep links: `roomsync://chat/conversation/:id`, `roomsync://chores/:id`, `roomsync://events/:id`, `roomsync://expenses/:id`, `roomsync://marketplace/listing/:id`.

## Events & Templates

- chat.message.new → "New message from {name}" (generic push body), deeplink to conversation
- chore.assigned/completed/reassigned → deeplink to chore list
- Future: events.reminder, expenses.you_owe, marketplace.offer.accepted, system.group.invite

## Env Vars

- `PUSH_ENABLED=true|false` (reuses existing)

## QA Checklist

- Register device; verify token stored via `POST /devices`.
- Toggle preferences; quiet hours defer non-urgent notifications.
- Trigger chat → push + inbox row + unread increments.
- Create chore due soon → reminder (future job) and inbox row.
- Mark read → unread decrements; mark all read clears dot.

## Trade-offs

- Email/SMS not implemented yet.
- Digest/batching reserved (model exists) but not scheduled; add cron windows later.
- Per-conversation mute can be layered via `UserNotificationPrefs` category sub-keys. 