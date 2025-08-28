export type ID = string;

export type Chore = {
  id: ID;
  groupId: ID;
  title: string;
  assignees: ID[];
  repeat: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  dueAt: string; // ISO
  status: 'open' | 'done';
  createdAt?: string;
  updatedAt?: string;
};

export type CreateChoreRequest = {
  groupId?: ID;
  title: string;
  assignees?: ID[];
  repeat?: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  dueAt: string; // ISO
  pointsPerCompletion?: number;
};

export type Event = {
  id: ID;
  groupId: ID;
  title: string;
  startAt: string;
  endAt: string;
  locationText?: string;
  attendees?: ID[];
  lat?: number;
  lng?: number;
  repeat?: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: number[];
};

export type CreateEventRequest = {
  groupId?: ID;
  title: string;
  startAt: string;
  endAt: string;
  locationText?: string;
  attendees?: ID[];
  lat?: number;
  lng?: number;
  repeat?: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: number[];
};

export type Expense = {
  id: ID;
  groupId: ID;
  payerId: ID;
  amount: number;
  split: 'equal' | 'custom' | 'unequal' | 'percent' | 'shares';
  shares: Array<{ userId: ID; amount: number }>;
  notes?: string;
  receiptUrl?: string;
  createdAt?: string;
};

export type CreateExpenseRequest = {
  groupId?: ID;
  payerId?: ID;
  amount: number;
  split: 'equal' | 'custom' | 'unequal' | 'percent' | 'shares';
  shares?: Array<{ userId: ID; amount?: number; percent?: number; shares?: number }>;
  notes?: string;
  receiptBase64?: string;
  recurring?: { enabled: boolean; frequency: 'weekly' | 'monthly' | 'custom'; dayOfMonth?: number; intervalWeeks?: number };
};

export type InventoryItem = {
  id: ID;
  groupId: ID;
  ownerId: ID;
  name: string;
  qty: number;
  shared: boolean;
  expiresAt?: string;
  photoUrl?: string;
  lowStockThreshold?: number;
  categories?: string[];
  tags?: string[];
};

export type CreateInventoryRequest = {
  groupId?: ID;
  ownerId?: ID;
  name: string;
  qty: number;
  shared?: boolean;
  expiresAt?: string;
  photoBase64?: string;
  lowStockThreshold?: number;
  categories?: string[];
  tags?: string[];
};

export type Listing = {
  id: ID;
  sellerId: ID;
  type: 'sublet' | 'sublets' | 'furniture' | 'textbooks' | 'other';
  categories?: string[];
  title: string;
  description?: string;
  price: number;
  photos?: string[];
  loc?: { lat: number; lng: number };
  availableFrom?: string;
  availableTo?: string;
  status: 'available' | 'pending' | 'sold';
  createdAt?: string;
  isFavorited?: boolean;
};

export type CreateListingRequest = {
  type: Listing['type'];
  title: string;
  description?: string;
  price: number;
  photos?: string[];
  photosBase64?: string[];
  loc?: { lat: number; lng: number };
  categories?: string[];
  availableFrom?: string;
  availableTo?: string;
  status?: 'available' | 'pending' | 'sold';
}; 