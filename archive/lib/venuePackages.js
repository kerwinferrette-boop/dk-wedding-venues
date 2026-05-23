// Rich per-venue package data with selectable options per category.
// Keys match venue IDs from the `venues` Supabase table.
// Each category can have 1–4 options; the first is the default selection.

export const VENUE_PACKAGES = {
  // ── Grand Tradition Arbor Terrace ───────────────────────────────────────────
  25: {
    defaultGuests: 150,
    inclusions: [
      'Day-of coordination included',
      'All linens & uplighting',
      'Buffet & hors d\'oeuvres',
      'Cake cutting & champagne toast',
      'Onsite staff & setup/breakdown',
      'Complimentary parking',
    ],
    categories: [
      {
        key: 'venue',
        label: 'Venue',
        budgetField: 'venue',
        options: [
          {
            id: 'included',
            label: 'All-Inclusive Package',
            desc: 'Venue rental included in C&R rate',
            type: 'fixed',
            amount: 0,
          },
        ],
      },
      {
        key: 'catering',
        label: 'Catering & Cuisine',
        budgetField: 'catering',
        options: [
          {
            id: 'offseason',
            label: 'Off-Season Saturday',
            desc: '$165/pp · March discount applied',
            type: 'per_person',
            rate: 165,
          },
          {
            id: 'peak',
            label: 'Peak Saturday',
            desc: '$185/pp · Full-price weekend rate',
            type: 'per_person',
            rate: 185,
          },
        ],
      },
      {
        key: 'bar',
        label: 'Bar Package',
        budgetField: 'bar',
        options: [
          {
            id: 'cash',
            label: 'Cash Bar',
            desc: 'Included · Guests pay for drinks',
            type: 'fixed',
            amount: 0,
          },
          {
            id: 'open',
            label: 'Open Bar Upgrade',
            desc: '$55/pp · Full open bar service',
            type: 'per_person',
            rate: 55,
          },
        ],
      },
    ],
  },

  // ── Safari Park — Mkutano House ─────────────────────────────────────────────
  26: {
    defaultGuests: 150,
    inclusions: [
      'Mkutano House exclusive rental',
      'Ceremony space included',
      'Animal ambassador experiences',
      'Dedicated event staff',
      'Private guest parking',
      'Sunset giraffe photo moments',
    ],
    categories: [
      {
        key: 'venue',
        label: 'Venue',
        budgetField: 'venue',
        options: [
          {
            id: 'standard',
            label: 'Main + Upper Level',
            desc: '$12,700 · Ceremony ($2.7k) + reception ($10k)',
            type: 'fixed',
            amount: 12700,
          },
          {
            id: 'wildlife',
            label: '+ Wildlife Encounter',
            desc: '$15,700 · Add $3k animal ambassador experience',
            type: 'fixed',
            amount: 15700,
          },
        ],
      },
      {
        key: 'catering',
        label: 'Catering & Cuisine',
        budgetField: 'catering',
        options: [
          {
            id: 'standard',
            label: 'Full Catering',
            desc: '$187/pp · Exceeds $25k F&B minimum at 150 guests',
            type: 'per_person',
            rate: 187,
          },
        ],
      },
      {
        key: 'bar',
        label: 'Bar Package',
        budgetField: 'bar',
        options: [
          {
            id: 'premium',
            label: 'Premium Open Bar',
            desc: '$54/pp · 4-hour service · No service charge',
            type: 'per_person',
            rate: 54,
          },
        ],
      },
    ],
  },

  // ── La Valencia Hotel ────────────────────────────────────────────────────────
  49: {
    defaultGuests: 150,
    maxCap: 300,
    note: 'All prices before 26% banquet fee + sales tax. F&B min: $22k Sat / $15k Fri / $10k Sun–Thu.',
    inclusions: [
      'White folding chairs for ceremony',
      'Sound system for minister',
      'House banquet chairs, round tables & high boys',
      'White floor-length linens, napkins, glassware & silverware',
      'Accessory tables — cake, gifts, place cards',
      'One night stay in Ocean View Suite (honeymoon)',
      'Bride Dressing Room & Groom Finishing Room',
      'Spa water station',
      '26% banquet fee + sales tax applied to all items',
    ],
    categories: [
      {
        key: 'venue',
        label: 'Venue Fee',
        budgetField: 'venue',
        options: [
          {
            id: 'saturday',
            label: 'Saturday Night',
            desc: '$3,500 flat venue fee',
            type: 'fixed',
            amount: 3500,
          },
          {
            id: 'fri_sun',
            label: 'Friday or Sunday Night',
            desc: '$3,000 flat venue fee',
            type: 'fixed',
            amount: 3000,
          },
          {
            id: 'weekday',
            label: 'Monday – Thursday',
            desc: '$2,500 flat venue fee',
            type: 'fixed',
            amount: 2500,
          },
        ],
      },
      {
        key: 'catering',
        label: 'Catering Package',
        budgetField: 'catering',
        options: [
          {
            id: 'select_sat',
            label: 'SELECT — Saturday',
            desc: '$195/pp · Full dinner service, open bar included',
            type: 'per_person',
            rate: 195,
          },
          {
            id: 'premier_sat',
            label: 'PREMIER — Saturday',
            desc: '$225/pp · Premium menu upgrades included',
            type: 'per_person',
            rate: 225,
          },
          {
            id: 'icon_sat',
            label: 'ICON — Saturday',
            desc: '$325/pp · Top-tier, full premium experience',
            type: 'per_person',
            rate: 325,
          },
          {
            id: 'select_fri_sun',
            label: 'SELECT — Fri / Sun',
            desc: '$180/pp · Friday or Sunday rate',
            type: 'per_person',
            rate: 180,
          },
        ],
      },
      {
        key: 'bar',
        label: 'Cocktail Bar',
        budgetField: 'bar',
        options: [
          {
            id: 'ranch_water',
            label: 'Ranch Water Bar',
            desc: '$39/pp · Texas-style Ranch Water station',
            type: 'per_person',
            rate: 39,
          },
          {
            id: 'old_fashioned',
            label: 'Old Fashioned Bar',
            desc: '$42/pp · Classic cocktail station',
            type: 'per_person',
            rate: 42,
          },
          {
            id: 'select_bar_3hr',
            label: 'Select Bar — 3 hrs',
            desc: '$87/pp · Full hosted bar, 3-hour service',
            type: 'per_person',
            rate: 87,
          },
          {
            id: 'no_bar',
            label: 'No Add-On Bar',
            desc: 'Bar included in package or handled separately',
            type: 'fixed',
            amount: 0,
          },
        ],
      },
      {
        key: 'late_night',
        label: 'Late Night / Dessert',
        budgetField: 'other',
        options: [
          {
            id: 'none',
            label: 'None',
            desc: 'No late-night additions',
            type: 'fixed',
            amount: 0,
          },
          {
            id: 'sliders',
            label: 'Buffalo Chicken Sliders (2)',
            desc: '$28/pp · Choice of 2 late-night options',
            type: 'per_person',
            rate: 28,
          },
          {
            id: 'stations',
            label: 'Late Night Stations (3)',
            desc: '$38/pp · Choice of 3 displayed stations',
            type: 'per_person',
            rate: 38,
          },
          {
            id: 'dessert',
            label: 'Dessert Stations (3)',
            desc: '$22/pp · Choice of 3 dessert stations',
            type: 'per_person',
            rate: 22,
          },
        ],
      },
    ],
  },

  // ── Venue 808 ───────────────────────────────────────────────────────────────
  29: {
    defaultGuests: 150,
    inclusions: [
      'Full venue buyout (14-hr window)',
      'Ceremony + reception + cocktail lounge',
      'Speakeasy bar area',
      'In-house AV & sound',
      'Tables, chairs & basic linen',
      'Setup & breakdown crew',
    ],
    categories: [
      {
        key: 'venue',
        label: 'Venue',
        budgetField: 'venue',
        options: [
          {
            id: 'buyout',
            label: 'Full Venue Buyout',
            desc: '$8,000 · Ceremony + reception + cocktail lounge + speakeasy',
            type: 'fixed',
            amount: 8000,
          },
        ],
      },
      {
        key: 'catering',
        label: 'Catering & Cuisine',
        budgetField: 'catering',
        options: [
          {
            id: 'americana',
            label: 'Americana Buffet',
            desc: '$79/pp · Coastal Cuisine & Cocktail Co.',
            type: 'per_person',
            rate: 79,
          },
          {
            id: 'korean',
            label: 'Korean BBQ Buffet',
            desc: '$69/pp · Coastal Cuisine & Cocktail Co.',
            type: 'per_person',
            rate: 69,
          },
        ],
      },
      {
        key: 'bar',
        label: 'Bar Package',
        budgetField: 'bar',
        options: [
          {
            id: 'elevated',
            label: 'Elevated Bar 5-hr',
            desc: '$65/pp · ~20% service charge applies',
            type: 'per_person',
            rate: 65,
          },
        ],
      },
    ],
  },
}

/** Compute the cost of one option given a guest count */
export function calcOptionCost(option, guests) {
  if (option.type === 'fixed') return option.amount
  return option.rate * guests
}

/** Build default selections (first option in each category) */
export function defaultSelections(pkg) {
  const out = {}
  for (const cat of pkg.categories) {
    out[cat.key] = cat.options[0].id
  }
  return out
}
