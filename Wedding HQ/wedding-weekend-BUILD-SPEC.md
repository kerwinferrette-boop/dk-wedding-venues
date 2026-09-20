# Wedding Weekend Hub - Build Spec (for Claude Code)

Owner: Kerwin Ferrette
Drafted: Sept 18, 2026
Target repo: the `wos` React app (React 18 + Vite 5 + Tailwind 3 + Supabase)
Supabase project: `xrgzaovididcizstwswy`
Status: SPEC ONLY. Nothing has been built or migrated. Hand this to Code.

---

## 0. Why this exists

We need one place to plan the whole wedding weekend (Wed 3/24 - Sun 3/28, 2027), not just the Saturday wedding. Two jobs:

1. **Venue Tracker** - source and compare quotes/specs for the After Party, Rehearsal Dinner, and Welcome Party (quote, capacity, budget, pros/cons, distance from La Valencia, vibe, contact, status, deposit + due dates, photo/link).
2. **Itinerary / Schedule** - a Wed-Sun day-by-day schedule with times, locations, who's invited, dress code, and a per-event cost estimate that rolls into a weekend total.

Internal (Kerwin + Dani) only for now. A guest-facing version comes later as a separate build - design the data so a public read-only view can be layered on without a rewrite.

### Decisions locked with Kerwin (Sept 18)
- Build target: **spec for Code** (Cowork did not push to git/Netlify last time, so no code was written in Cowork this round).
- Audience: **internal now, guest-facing itinerary later.**
- Structure: **one "Wedding Weekend" hub** with two tabs (Venue Tracker + Itinerary).
- Venue card fields: contact + status, deposit + due dates, photo/link, and a capacity flag.
- Capacity: **target 150 guests, 170 is the hard max.** The after-party and side events may be a smaller subset - each venue row carries its own capacity, compared against a per-event expected headcount, not a single global number.
- Weekend shape: **Classic skeleton** (Thu welcome, Fri rehearsal + dinner, Sat wedding + The Spot after party, Sun egg hunt + brunch).
- Egg hunt: locked as a real Sunday event; taco/street-meat vendor + location sourced below.

---

## 1. Where it lives in the app

- New top-level route `/weekend` rendering a `WeekendHub` page.
- `WeekendHub` holds two tabs: `Venues` (default) and `Itinerary`. Use the existing tab/nav pattern in the app if one exists; otherwise a simple `useState('venues')` toggle.
- Add a nav link "Weekend" to the main navigation next to Budget / Vendors.
- Reuse the existing design system: Cinzel + Playfair Display + DM Sans; gold `#C9A84C`, parchment `#F7F0E3`, teal `#2A6B7C`; `.card-gatsby` and `.deco-divider` utility classes; CSS vars in `src/index.css`.
- Identity: reuse `localStorage.wos_user` ('kerwin' | 'dani') - used later for who-voted / who-edited if we want it, not required for v1.

---

## 2. Supabase data model

Follow the existing conventions: RLS ON with a permissive `allow_all_*` policy matching `vendor_pipeline` / `extras` / `extras_budget` so the anon publishable key can read/write. All money columns are `numeric`, nullable (null = TBD). All tables get `created_at`, `updated_at` defaults.

### 2.1 Table: `weekend_venues`

Candidate venues for each side event.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| event_type | text | 'after_party' \| 'ceremony_rehearsal' \| 'rehearsal_dinner' \| 'welcome_party' \| 'egg_hunt' |
| name | text | venue/vendor name |
| status | text | 'sourcing' \| 'quoted' \| 'toured' \| 'booked' \| 'passed' |
| contact_name | text | |
| contact_email | text | |
| contact_phone | text | |
| website_url | text | |
| photo_url | text | hero image for the compare card |
| quote_low | numeric | low end of quote (null = TBD) |
| quote_high | numeric | high end (null = TBD) |
| quote_basis | text | e.g. 'per person', 'flat buyout', 'F&B minimum', 'no room fee' |
| capacity | int | max the venue holds |
| expected_headcount | int | how many WE expect at THIS event (may be < 150) |
| distance_miles | numeric | from La Valencia (1132 Prospect St) - APPROX, confirm |
| distance_note | text | e.g. 'walkable in the Village', '~20 min drive' |
| vibe | text | short vibe descriptor |
| pros | text | freeform / newline-separated |
| cons | text | freeform / newline-separated |
| deposit_amount | numeric | |
| deposit_due | date | |
| balance_due | date | |
| in_extras_budget | bool | default false - true once booked and mirrored to extras_budget |
| notes | text | |
| display_order | int | |

**Capacity flag (UI, computed - do not store):**
- `capacity >= expected_headcount` -> green "Fits".
- `capacity` within 90-100% of `expected_headcount` -> amber "Tight".
- `capacity < expected_headcount` -> red "Too small".
- If `expected_headcount` is null, fall back to comparing against 150 (target) and show 170 as the hard max in a tooltip.

### 2.2 Table: `weekend_itinerary`

The Wed-Sun schedule.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| day | date | 2027-03-24 .. 2027-03-28 |
| start_time | time | nullable |
| end_time | time | nullable |
| title | text | e.g. 'Welcome Party' |
| venue_id | bigint FK -> weekend_venues.id | nullable; links an itinerary slot to a tracked venue |
| location_text | text | free text if not a tracked venue |
| distance_note | text | |
| audience | text | 'all_guests' \| 'wedding_party' \| 'family' \| 'couple' |
| dress_code | text | |
| cost_estimate | numeric | rolls into weekend total |
| status | text | 'idea' \| 'planned' \| 'confirmed' |
| notes | text | |
| display_order | int | order within a day |

**Weekend total (UI, computed):** sum of `cost_estimate` across all itinerary rows, plus a note that booked venue deposits/balances live in `extras_budget`. Show a per-day subtotal and a grand total.

### 2.3 RLS

```sql
alter table weekend_venues enable row level security;
create policy allow_all_weekend_venues on weekend_venues
  for all using (true) with check (true);

alter table weekend_itinerary enable row level security;
create policy allow_all_weekend_itinerary on weekend_itinerary
  for all using (true) with check (true);
```

(Matches the existing `allow_all_extras_budget` pattern. Internal tool, anon key, no auth - same risk posture as the rest of the app.)

---

## 3. Venue Tracker tab (UI)

- Grouped by `event_type` in this order: After Party, Ceremony Rehearsal (location), Rehearsal Dinner, Welcome Party, Egg Hunt (vendor/location).
- Each group is a row of comparison **cards** (`.card-gatsby`). Card shows: photo, name + status pill, capacity flag, quote range + basis, distance, vibe, pros/cons (collapsible), contact, deposit/balance dates.
- A "Compare" toggle per group flips the cards into a **spec table** (columns = the fields above) so you can line venues up side by side.
- Status pills reuse the vendor-hq color language: sourcing (grey), quoted (blue), toured (blue), booked (green/gold), passed (muted).
- Editing: inline-editable fields, write straight to Supabase (same pattern as `extras_budget`), with a realtime subscription so Kerwin + Dani see each other's edits.
- When a venue is set to `booked`: prompt "Add to extras budget?" -> on yes, insert/mirror a row into `extras_budget` (slug from name) and set `in_extras_budget = true`. If it has a `deposit_due` / `balance_due`, surface a one-click "Create payment reminders" that triggers the **wedding-payment-reminders** flow (due-date event + 7-day heads-up on kerwinferrette@gmail.com, America/Los_Angeles, all-day, hyphens not em-dashes).

---

## 4. Itinerary tab (UI)

- Five day columns (or stacked sections on mobile): Wed 3/24, Thu 3/25, Fri 3/26, Sat 3/27, Sun 3/28.
- Each event is a card sorted by `start_time` then `display_order`: time range, title, location (venue link or free text) + distance, audience tag, dress code, cost estimate, status.
- Add / edit / reorder events inline -> Supabase. Realtime sub.
- Per-day subtotal + weekend grand total (sum of `cost_estimate`), with a line noting booked-venue deposits live in the budget.
- Sat 3/27 pre-links the wedding (La Valencia) and the after party (The Spot) so the anchor day is never empty.

---

## 5. Seed data

> VERIFICATION NOTE (per Kerwin's standing rule): The Spot is verified from the vendor's own emailed menus. All OTHER venues/vendors below are RESEARCH CANDIDATES from web search on Sept 18, 2026 - names and rough capacities are real, but quotes, exact capacities, and distances are UNCONFIRMED and must be verified with each venue before anyone relies on a number. Distances are approximate from La Valencia at 1132 Prospect St. Seed them as `status='sourcing'` with quotes null unless noted.

### 5.1 After Party (event_type = 'after_party')

| name | status | capacity | quote | distance | vibe | notes |
|---|---|---|---|---|---|---|
| The Spot (La Jolla) | booked-leaning / In Progress | confirm | No room fee, no F&B min; $200 no-show fee only. Add-ons VERIFIED: Martini Tower (24 mini-tinis) $280, Beer Pong $100, Popcorn $60, Sliders $7 ea, Tacos $5 ea; snacks by quantity; 14" pizzas price not listed. +3% card surcharge, 20% gratuity on large parties. | ~0.5 mi (confirm) | Bar / late-night, casual | Contact Kat Varga, 801-557-2093, thespotlajollaevents@gmail.com. Needs intake form + signed CC auth to lock. Menus saved in `Wedding HQ/the-spot-afterparty/`. Separate charge outside $58k. |

Set The Spot's `status` to whatever reflects reality when Code seeds it (currently paperwork-pending, so 'quoted' or a custom 'in_progress' is fair - it is the chosen pick but not signed).

### 5.1b Ceremony Rehearsal location (event_type = 'ceremony_rehearsal')

NEW group, added Sept 18 - the Friday ceremony rehearsal is NOT at La Valencia (Kerwin's correction), so it needs the same sourcing/comparison treatment as the other venue groups. No candidates researched yet - seed with zero rows (empty group) and let Kerwin add candidates as he finds them, or do a follow-up research pass on request.

### 5.2 Rehearsal Dinner (event_type = 'rehearsal_dinner')

| name | capacity (approx) | distance (approx) | vibe | notes |
|---|---|---|---|---|
| NINE-TEN (inside the Grande Colonial) | up to ~65 private | ~0.2 mi, walkable | Upscale, chef-driven (Jason Knibb); La Jolla Room faces Prospect | STRONG pick: guests are staying at the Grande Colonial (the GAUFER room block), so zero transport. Private dining page exists. Get a quote. |
| Brockton Villa | confirm | ~0.3 mi (Coast Blvd, by the Cove) | Historic converted home, ocean view, charming | Hosts rehearsal dinners / special occasions. |
| The Whaling Bar | confirm | confirm (La Jolla Village) | Classic/cozy, retro-supper-club | Returned after ~10 yrs; Chef Brian Redzikowski. Confirm current location + private options. |
| Alfonso's of La Jolla | confirm | on Prospect St, walkable | Casual Mexican, lively patio | Offers private parties; cheaper/casual counter-option. |

### 5.3 Welcome Party (event_type = 'welcome_party')

| name | capacity (approx) | distance (approx) | vibe | notes |
|---|---|---|---|---|
| La Jolla Cove Rooftop (Wedgewood) | up to ~225 rooftop | ~0.3 mi (Coast Blvd) | 6th-floor ocean-view rooftop terrace | Biggest capacity; does welcome parties; onsite hotel rooms. Get a quote. |
| Grande Colonial - The Loft | confirm | ~0.2 mi, walkable | Ocean-view rooftop deck over Children's Pool | Same hotel as the room block - convenient. |
| Birdseye Rooftop | up to ~60 buyout | CONFIRM - believed downtown SD (~20 min drive), NOT La Jolla | Rooftop, trendy | Flag the location: likely not walkable. Verify before pursuing. |

### 5.4 Egg Hunt vendor + location (event_type = 'egg_hunt')

Taco / street-meat vendor candidates (San Diego taco-cart caterers; none confirmed in La Jolla specifically, all quote per event - request quotes):
- Salud Catering (formerly San Diego Taco Company) - stainless taco cart, 1-2 chefs, mesquite grill; service starts ~20% + 15% gratuity.
- Chacho's Tacos SD.
- Jose's Taquizas (travel fee outside local area).
- Tacos and Gorditas (25+ yrs).

Location candidate:
- **Ellen Browning Scripps Park** (by La Jolla Cove, walkable from La Valencia). City of San Diego permit required. **CAP: max 80 people Sept-May**, permits are 4 hours incl. setup/teardown, one permit per day. -> Good fit only if the egg hunt is a smaller subset, not all 150 guests. If you want everyone, consider a hotel lawn or private space instead.
- Alt: a lawn/space at the Grande Colonial or La Valencia (guests already there Sunday AM; no city permit) - check with the hotel.

### 5.5 Itinerary skeleton (Classic)

Seed as `status='idea'`, times as placeholders (null) - all confirmed with Kerwin Sept 18, see Section 8:

| day | title | audience | notes |
|---|---|---|---|
| Wed 3/24 | Arrivals / casual meetup | all_guests | Optional; welcome bags at the room block |
| Thu 3/25 | Welcome Party | all_guests | All ~150 guests. Venue TBD (see 5.3) |
| Fri 3/26 | Ceremony Rehearsal | wedding_party | NOT at La Valencia - location TBD, see new 5.1b group |
| Fri 3/26 | Rehearsal Dinner | wedding_party + family | Venue TBD (see 5.2) |
| Sat 3/27 | WEDDING @ La Valencia | all_guests | Anchor - link venue = La Valencia |
| Sat 3/27 | After Party @ The Spot | all_guests | Link venue = The Spot |
| Sun 3/28 | Egg Hunt (doubles as recovery brunch) | all_guests | Single blank/TBD row for now - Kerwin fills in details later. Small/subset headcount, not all 150 (see 5.4) |

---

## 6. Integration points

- **Extras budget:** booked side-event venues mirror into `extras_budget` (they are outside the $58k parent budget, same as DJ/violinist/MUA/florist). Do not double-count.
- **Payment reminders:** deposits/balances on booked venues feed the `wedding-payment-reminders` flow (due-date + 7-day heads-up on kerwinferrette@gmail.com).
- **Vendor HQ:** The Spot already has a row in `Wedding HQ/vendor-hq.html`. Keep the static dashboard as-is; the app's Weekend tab becomes the live source of truth going forward. Decide later whether to retire the static row.
- **Guest-facing later:** a public read-only `/weekend/guest` view can render the same `weekend_itinerary` filtered to `status IN ('planned','confirmed')` and audience = all_guests, hiding costs/pros/cons. Design v1 so this is additive.

---

## 7. Build + deploy checklist for Code (the part Cowork missed)

> **STEP 0 - Ask before you build (Kerwin's explicit instruction).** Before any migration or code, use the **AskUserQuestion** tool to walk Kerwin through the open items in Section 8 and the design choices in Section 9 (category list + colors, DJ vs. Live Music, Photo vs. Video, whether any weekend event is parent-funded, per-person estimates now vs. later, event times/headcounts). Lock his answers and record them back into this spec. Do NOT proceed on assumptions - that's the whole point of handing this to Code with questions attached.

1. `git checkout -b feat/wedding-weekend`
2. Run the two Supabase migrations (tables + RLS) against project `xrgzaovididcizstwswy`.
3. Seed `weekend_venues` and `weekend_itinerary` from section 5.
4. Build the route, hub, and two tabs; reuse `.card-gatsby` / design tokens.
5. Local verify: `npx vite build --outDir /tmp/dist-test --emptyOutDir` (the mounted dist dir fails on permissions; build to /tmp). If Rollup complains about arch, `npm install @rollup/rollup-linux-arm64-gnu --no-save`.
6. **`git add -A && git commit && git push`** - the step that did not happen last time. Confirm the commit is on the remote.
7. Confirm **Netlify** picked up the deploy (check the deploy log / live URL), or trigger a deploy manually. Do not consider this done until the live site shows the Weekend tab.

---

## 8. Open questions - LOCKED (Sept 18, confirmed via AskUserQuestion)

> Confirmed with Kerwin before any migration or code was written, per Section 7 Step 0.

1. **Wednesday** - Casual meetup/arrivals only, as drafted. Welcome bags at the room block. No dedicated venue-sourcing needed.
2. **Friday ceremony rehearsal** - NOT at La Valencia. Location is unconfirmed and needs its own sourcing/comparison, just like the other venue groups. Added a new `ceremony_rehearsal` `event_type` to `weekend_venues` for this (see 2.1 and 5.1b) - do not confuse with the rehearsal *dinner* venue group.
3. **Welcome party** - ALL guests (~150). This favors the bigger-capacity venues in 5.3 (Cove Rooftop); Birdseye's ~60 cap is likely too small unless the guest list changes.
4. **Egg hunt headcount** - Small/subset group, not all 150 ("just trying to provide a day-after event"). Scripps Park's 80-person cap is viable.
5. **Sunday brunch** - Merged with the egg hunt: the egg hunt itself doubles as the recovery brunch, one event not two. Seed Sunday as a single blank/TBD itinerary row; Kerwin will fill in details later.
6. **Cost estimates** - Do NOT guess placeholder numbers. Research real vendor pricing for each weekend candidate with the same diligence as the Section 5 venue research. Build a quote-upload/scrape mechanism: when Kerwin uploads a vendor quote (PDF/email), parse it and apply the real numbers to the row - same intake pattern as venue quotes.
7. **Photography vs. Videography** - Split into two separate categories/colors. Confirms the 9.1 default, no change needed.
8. **Weekend payer mechanism** - Per-row checkbox + amount, exactly like `extras_budget`'s `parents_covering` / `parents_amount` pattern (NOT a `funded_by` enum or single default - see 9.3 update). Some weekend rows are parent-funded, some are not; decided row by row, same UI Kerwin already uses on Extras.
9. **No mirror to extras_budget** - Confirmed. Weekend spend lives only in `weekend_venues` / `weekend_itinerary`; the Dashboard roll-up adds it exactly once.
10. **Itinerary times** - Seed all `start_time`/`end_time` as placeholder/TBD (null) for now.

---

## 9. Budget segmentation (color-coded by type + out-of-pocket lens)

### 9.0 Why
The $58k is tight and more of the spend is landing on Kerwin + Dani directly instead of on the parents. Two asks:

1. **Front page (Dashboard):** break the projected total into color-coded segments by vendor TYPE - bar is one color, food another, photography another, DJ another, and so on.
2. **Weekend page:** the same tracker model, but the weekend budget is stored SEPARATELY. It rolls up into the projected total on the home page, yet while you are in the Weekend tab you only see the weekend's own budget (a scoped view).

Kerwin's real motivation, in his words: "start segmenting out stuff that's coming out of our pockets, instead of Dani or I's parents." So the design must show both the type breakdown AND who is paying.

> Note: this section partly SUPERSEDES the "mirror booked venues into extras_budget" line in Sections 3 and 6. To avoid double-counting, weekend spend lives ONLY in the weekend tables (see 9.6). Update 3 and 6 to match when you build.

### Decisions locked with Kerwin (Sept 18, round 2)
- The WHOLE budget is broken down by vendor TYPE - not just the weekend. Core quote, extras, AND weekend spend all map to the type categories in 9.1 and share the same colors. There is no separate "Weekend" spend color; weekend dollars are distributed into their real types (rehearsal dinner -> Catering & Food, after-party drinks -> Bar, and so on).
- "Core vs. Weekend" and "Who's paying" are SEPARATE lenses/filters layered on top of the single type breakdown - not their own colors.
- Before writing any code, Code MUST run the AskUserQuestion flow to confirm the open items in Section 8 (and the design choices here) with Kerwin. Do not build on assumptions. See the directive at the top of Section 7.

### 9.1 Canonical categories + colors (single source of truth)
Define ONE category list in code (`src/lib/budgetCategories.js`), imported everywhere. Every spend row maps to exactly one `category` key. Colors are fixed and harmonize with the existing Gatsby palette (gold `#C9A84C`, teal `#2A6B7C`, burgundy from the florist deck). These are a proposed default - confirm with Kerwin (see 9.8).

| key | label | color |
|---|---|---|
| venue_food | Catering & Food | `#2A6B7C` |
| bar | Bar | `#8B1A1A` |
| photo | Photography | `#C9A84C` |
| video | Videography | `#A98600` |
| dj | DJ | `#6E4B8A` |
| live_music | Live Music | `#4A7C59` |
| beauty | Hair & Makeup | `#B06A8A` |
| florals | Florals & Decor | `#7A2E3A` |
| cake | Cake | `#C98A5A` |
| stationery | Stationery & Paper | `#5A6B7C` |
| rentals_decor | Rentals & Decor | `#8A7A5A` |
| service_tax | Service Charge & Tax | `#9A9A8E` |
| other | Other | `#B0B0A8` |

**No separate weekend color.** Weekend spend is distributed into the types above (rehearsal dinner -> `venue_food`, after-party drinks -> `bar`, taco stand -> `venue_food`, etc.). Whether a dollar is core or weekend is a separate SCOPE dimension (derived from its source table), used for filtering - not a color. `weekend` is intentionally NOT a category.

### 9.2 Where each dollar comes from (three sources)
The projected total = **core quote + extras + weekend.** Each source needs a category.

- **Core La Valencia quote** - `quote_line_items` (the ~$58k). Add a nullable `category` text column and map each line. Code MUST read the LIVE rows and map them; do not assume the row set. Keyword hints: catering/per-person food -> `venue_food`; bar/beverage -> `bar`; service charge / gratuity / tax -> `service_tax`; rentals/chairs/linens -> `rentals_decor`.
- **Extras** - `extras_budget`. Add a nullable `category` (finer than the existing `budget_group`). Proposed map of the 7 seeded rows, to reconcile against live data: dj -> `dj`, violin -> `live_music`, mua -> `beauty`, florist -> `florals`, reellove -> `photo` (or split photo/video if the invoice separates them), painter -> `rentals_decor`, photo2 -> `photo`.
- **Weekend** - `weekend_venues` (deposit_amount / balance, or quote midpoint if unbooked) + `weekend_itinerary` (`cost_estimate`). Each weekend row gets a real `category` (type) just like the others, so it lands in the right color on the home page. It also keeps its `event_type` (after party / rehearsal / etc.) so the Weekend tab can offer an alternate by-event view. Scope = 'weekend' is derived from the source table - no extra column needed.

### 9.3 Payer dimension (parents vs. out-of-pocket)
Each source must know who pays so the out-of-pocket number is real:
- **Core quote:** parent-funded (the $58k from Dani's parents). Represent with a config constant `CORE_FUNDED_BY = 'parents'`.
- **Extras:** already modeled - `couple_portion = total_cost - (parents_covering ? parents_amount : 0)`.
- **Weekend:** LOCKED Sept 18 - same mechanism as `extras_budget`, not a `funded_by` enum. Add `parents_covering` bool (default false) + `parents_amount` numeric to both weekend tables. `couple_portion = total - (parents_covering ? parents_amount : 0)`, decided per row (some weekend events may be parent-funded, most default to couple).

### 9.4 Front-page visualization (Dashboard)
- One horizontal **stacked bar** = the projected grand total, segmented by category color, with a legend showing each category's $ and %.
- Three stat tiles above it: **Projected total**, **Parents covering**, **Out-of-pocket (couple)**. Out-of-pocket is the hero figure.
- A **lens toggle**: "By type" (default - the stacked bar above) vs. "Who's paying" (splits the total into Parents vs. Out-of-pocket, then breaks out-of-pocket down by category color).
- Weekend spend is DISTRIBUTED into the type colors on the front page (locked Sept 18 - the whole budget breaks by type, weekend included; there is no single "weekend" segment). Add a secondary **Scope** filter (All / Core only / Weekend only) so you can still isolate how much of the total is the weekend, and the **Who's paying** filter (All / Parents / Out-of-pocket). Neither filter changes the colors - they just subset which dollars the type bar is summing. A "Weekend" chip can deep-link to `/weekend` for the scoped tab.
- Data comes from a new `computeBudgetByCategory({ coreLines, extras, weekend })` in `budget.js` returning `[{ category, label, color, total, parents, couple }]` plus grand totals.

### 9.5 Weekend-page visualization (scoped)
- The SAME stacked-bar component, fed ONLY the weekend sources (scope = 'weekend'). Primary breakdown is by TYPE, using the same colors as the home page, so the weekend budget looks consistent with the rest of the budget. Offer a toggle to regroup by `event_type` (After Party / Rehearsal Dinner / Welcome Party / Egg Hunt) since that's the weekend's own structure - but TYPE is the default.
- Its own three tiles: **Weekend total**, **Parents covering** (usually $0), **Out-of-pocket**.
- A plain label under it: "Weekend budget only - this rolls into the projected total on the home page." So the scope is never ambiguous.

### 9.6 Roll-up + no double-counting
- A single roll-up function computes the grand projected total = core + extras + weekend, so both pages always agree.
- Dashboard consumes the full aggregate; Weekend consumes the weekend-filtered slice - same functions, different scope argument. Realtime subscriptions on `quote_line_items`, `extras_budget`, `weekend_venues`, and `weekend_itinerary` so both views stay live.
- **Double-count guard:** weekend venues are NOT mirrored into `extras_budget`. The weekend tables are the sole home for weekend spend; the roll-up adds them exactly once. (This is the change to Sections 3 and 6 noted at the top.)

### 9.7 Migrations
```sql
alter table quote_line_items add column category text;
alter table extras_budget    add column category text;
alter table weekend_venues     add column category text;
alter table weekend_venues     add column parents_covering boolean default false;
alter table weekend_venues     add column parents_amount numeric;
alter table weekend_itinerary  add column category text;
alter table weekend_itinerary  add column parents_covering boolean default false;
alter table weekend_itinerary  add column parents_amount numeric;
```
Then backfill `category` on existing `quote_line_items`, `extras_budget`, and any seeded weekend rows - Code reads the live rows and maps them per 9.2; do not assume the row set.

### 9.8 Open questions for this section - ALL RESOLVED (see Section 8)
- Category list + colors in 9.1: Photography and Videography split into two categories (confirmed, no change from the default table).
- Whole-budget-by-type with weekend distributed into type colors: RESOLVED Sept 18, round 1 (Core/Weekend is a filter, not a color).
- Weekend payer: NOT a single out-of-pocket default - per-row `parents_covering` checkbox + `parents_amount`, same as `extras_budget` (see 9.3 update).
- No mirror to `extras_budget`: confirmed.
