// Canonical vendor-type budget categories - single source of truth.
// Every spend row (core quote_line_items, extras_budget, weekend_venues,
// weekend_itinerary) maps to exactly one of these `category` keys.
// Colors harmonize with the existing Gatsby palette (gold, teal, burgundy).

export const BUDGET_CATEGORIES = [
  { key: 'venue_food', label: 'Catering & Food', color: '#2A6B7C' },
  { key: 'bar', label: 'Bar', color: '#8B1A1A' },
  { key: 'photo', label: 'Photography', color: '#C9A84C' },
  { key: 'video', label: 'Videography', color: '#A98600' },
  { key: 'dj', label: 'DJ', color: '#6E4B8A' },
  { key: 'live_music', label: 'Live Music', color: '#4A7C59' },
  { key: 'beauty', label: 'Hair & Makeup', color: '#B06A8A' },
  { key: 'florals', label: 'Florals & Decor', color: '#7A2E3A' },
  { key: 'cake', label: 'Cake', color: '#C98A5A' },
  { key: 'stationery', label: 'Stationery & Paper', color: '#5A6B7C' },
  { key: 'rentals_decor', label: 'Rentals & Decor', color: '#8A7A5A' },
  { key: 'service_tax', label: 'Service Charge & Tax', color: '#9A9A8E' },
  { key: 'other', label: 'Other', color: '#B0B0A8' },
]

export const CATEGORY_MAP = Object.fromEntries(BUDGET_CATEGORIES.map(c => [c.key, c]))

export function categoryLabel(key) {
  return CATEGORY_MAP[key]?.label ?? 'Other'
}

export function categoryColor(key) {
  return CATEGORY_MAP[key]?.color ?? CATEGORY_MAP.other.color
}
