export enum ChoreRepeat {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly',
  Custom = 'custom',
}

export enum ExpenseSplitType {
  Equal = 'equal',
  Custom = 'custom',
  Unequal = 'unequal',
  Percent = 'percent',
  Shares = 'shares',
}

export enum ListingCategory {
  Furniture = 'furniture',
  Sublet = 'sublet',
  Sublets = 'sublets', // tolerated by UI for now
  Textbooks = 'textbooks',
  Parking = 'parking',
  Other = 'other',
}

export enum InventoryStatus {
  Available = 'available',
  Pending = 'pending',
  Sold = 'sold',
} 