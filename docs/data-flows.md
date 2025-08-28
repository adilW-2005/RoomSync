Data Flows (UI → API)

Chores: CreateChoreModal → POST /chores
- title: string (required)
- dueAt: ISO string (required)
- assignees: string[] (optional; comma-separated IDs in UI)
- repeat: 'none' | 'weekly' (UI sets 'weekly' when Recurring)
- customDays: number[] (0=Sun..6=Sat; derived from selected date)

Events: CreateEventModal → POST /events
- title: string (required)
- startAt: ISO string (required)
- endAt: ISO string (required)
- locationText: string (optional)

Expenses: AddExpenseModal → POST /expenses
- amount: number (required)
- split: 'equal' | 'custom' (required)
- shares: [{ userId, amount }] if split='custom' (validated to match total)
- notes: string (optional)
- receiptBase64: string (data URI) (optional)

Inventory: InventoryScreen modal → POST /inventory
- name: string (required)
- qty: number (required)
- shared: boolean (required)
- expiresAt: ISO string (optional)
- photoBase64: string (optional)

Marketplace: CreateListingModal → POST /listings
- title: string (required)
- price: number (required)
- type: 'furniture' | 'sublets' | 'textbooks' | 'other' (required)
- description: string (optional)
- locationText: string (UI only; not sent)
- photosBase64: string[] (optional)
- loc: { lat, lng } (optional; not provided currently)

Favorites: Marketplace/Living → POST /listings/{id}/favorite or /unfavorite

Presence: Settings/LocationTask → POST /locations/beacon
- groupId: string
- lat: number
- lng: number
- battery?: number
- shareMinutes?: number

RSVP: Living → POST /events/{id}/rsvp
- status: 'going' | 'maybe' | 'not' 