# Kerwin & Dani — Wedding Planning Platform

## Goal
Build `wedding-planner.html` — a single-file, mobile-first wedding planning web app for two users (Kerwin and Dani).

## Status
**NOT STARTED** — previous build attempt was cut off by token limits. Build in small pieces.

## Build Order (do one piece per response)
1. HTML shell + full CSS + bottom nav + user selector + Supabase client init
2. Tab 1: Dashboard
3. Tab 2: Venues
4. Tab 3: Caterers
5. Tab 4: Bar
6. Tab 5: Music
7. Tab 6: Extras
8. Tab 7: Cinematography
9. Tab 8: Rehearsal Dinner
10. Tab 9: Flowers
11. Realtime subscriptions + cross-module cost wiring

## Tech Stack
- Single HTML file: `wedding-planner.html`
- Vanilla JS, no framework
- Supabase JS v2 via CDN
- No auth — localStorage identity (`localStorage.getItem('weddingUser')` → `'kerwin'` or `'dani'`)
- Deploy to Netlify via GitHub

## Supabase
- URL: `https://xrgzaovididcizstswsy.supabase.co`
- Anon key: `sb_publishable_feE5EFiIqR14CGYTElCCAg_nfP3Nv8V`

## Design
- Dark header: `#111`
- Kerwin accent: `#C9A84C` (gold)
- Dani accent: `#E88FAB` (pink)
- White cards, rounded corners
- Gradient border when both users rate same item
- Mobile-first, bottom navigation bar (9 tabs)

## 9 Tabs
1. **Dashboard** — command center; total budget input; guest count slider (50–400, default 250); module summary cards showing each module's estimated cost; running total vs budget; green/yellow/red status
2. **Venues** — list/gallery toggle; filter by region/capacity/type; sort; 1–7 star ratings (Kerwin & Dani independently); similar vibes recommendation (vibe_tags matching) when rated 6–7; add venue form; 24 seeded venues
3. **Caterers** — In-N-Out toggle (featured toggle); filter by cuisine/price; add caterer form
4. **Bar** — open bar toggle; duration slider; per-person cost calculator
5. **Music** — category chips (DJ, band, mariachi, etc.); social links (Instagram, TikTok); 1–7 ratings; hip-hop flag
6. **Extras** — photo booth, tattoo artist, etc.; toggleable; flat or per-person pricing
7. **Cinematography** — confessional toggle; drone/highlight reel flags; 1–7 ratings
8. **Rehearsal Dinner** — separate guest count; venue/restaurant options
9. **Flowers** — florist cards; style tags; includes flags (bouquets, centerpieces, arch, boutonnieres); 1–7 ratings

## Database Schema (already run in Supabase)

```sql
create table venues (
  id serial primary key,
  name text not null,
  region text,
  region_label text,
  highlight text,
  note text,
  rating text,
  max_cap integer,
  venue_fee integer,
  catering_pp integer,
  bar_pp integer,
  aqua boolean default false,
  arch boolean default false,
  planet boolean default false,
  leader boolean default false,
  url text,
  disclaimer text,
  bridal_suite boolean default false,
  groom_suite boolean default false,
  ceremony_and_reception boolean default false,
  vibe_tags text[],
  catering_status text default 'byo',
  created_at timestamp default now()
);

create table ratings (
  id serial primary key,
  module text not null,
  item_id integer not null,
  rated_by text not null,
  score integer check (score >= 1 and score <= 7),
  created_at timestamp default now(),
  unique(module, item_id, rated_by)
);

create table caterers (
  id serial primary key,
  name text not null,
  location text,
  price_pp integer,
  cuisine text,
  notes text,
  url text,
  status text default 'independent',
  associated_venue_id integer references venues(id),
  is_in_n_out boolean default false,
  active boolean default false,
  created_at timestamp default now()
);

create table bar_options (
  id serial primary key,
  provider text not null,
  price_pp integer,
  open_bar boolean default false,
  notes text,
  url text,
  active boolean default false,
  created_at timestamp default now()
);

create table musicians (
  id serial primary key,
  name text not null,
  category text,
  location text,
  region text,
  price_estimate integer,
  instagram_url text,
  tiktok_url text,
  website_url text,
  notes text,
  hip_hop boolean default false,
  active boolean default false,
  created_at timestamp default now()
);

create table extras (
  id serial primary key,
  name text not null,
  category text,
  price_estimate integer,
  pricing_type text default 'flat',
  description text,
  url text,
  notes text,
  active boolean default false,
  created_at timestamp default now()
);

create table cinematographers (
  id serial primary key,
  name text not null,
  location text,
  package_name text,
  price integer,
  hours integer,
  num_cameras integer,
  drone boolean default false,
  highlight_reel boolean default false,
  full_film boolean default false,
  confessional boolean default false,
  website_url text,
  instagram_url text,
  notes text,
  active boolean default false,
  created_at timestamp default now()
);

create table rehearsal_options (
  id serial primary key,
  name text not null,
  location text,
  price_estimate integer,
  pricing_type text default 'flat',
  private_room boolean default false,
  vibe_notes text,
  url text,
  active boolean default false,
  created_at timestamp default now()
);

create table florists (
  id serial primary key,
  name text not null,
  location text,
  style_tags text[],
  price_estimate integer,
  includes_bouquets boolean default false,
  includes_centerpieces boolean default false,
  includes_arch boolean default false,
  includes_boutonnieres boolean default false,
  website_url text,
  instagram_url text,
  notes text,
  active boolean default false,
  created_at timestamp default now()
);

create table budget (
  id serial primary key,
  total_budget integer default 80000,
  guest_count integer default 250,
  updated_at timestamp default now()
);

insert into budget (total_budget, guest_count) values (80000, 250);

alter publication supabase_realtime add table venues;
alter publication supabase_realtime add table ratings;
alter publication supabase_realtime add table caterers;
alter publication supabase_realtime add table bar_options;
alter publication supabase_realtime add table musicians;
alter publication supabase_realtime add table extras;
alter publication supabase_realtime add table cinematographers;
alter publication supabase_realtime add table rehearsal_options;
alter publication supabase_realtime add table florists;
alter publication supabase_realtime add table budget;
```

## Venue Seed Data (24 venues — insert into venues table)

```sql
insert into venues (name, region, region_label, highlight, note, rating, max_cap, venue_fee, catering_pp, bar_pp, aqua, arch, planet, leader, url, disclaimer, bridal_suite, groom_suite, ceremony_and_reception, vibe_tags, catering_status) values
('Monterey Bay Aquarium', 'monterey', 'Monterey', 'Iconic oceanfront aquarium', 'Exclusive buyout required', 'top', 900, 15000, 120, 45, true, false, false, true, 'https://www.montereybayaquarium.org', 'Buyout only', true, false, true, array['coastal','upscale','unique'], 'byo'),
('Holman Ranch', 'monterey', 'Carmel Valley', 'Rustic vineyard estate', 'Available Fri–Sun', null, 200, 8000, 95, 40, false, false, false, false, 'https://holmanranch.com', null, true, true, true, array['rustic','vineyard','romantic'], 'in_house'),
('Carmel Valley Ranch', 'monterey', 'Carmel Valley', 'Resort vineyard with mountain views', null, null, 300, 12000, 110, 50, false, false, false, false, 'https://www.carmelvalleyranch.com', null, true, true, true, array['resort','vineyard','mountain'], 'in_house'),
('The Barnyard Wedding Garden', 'monterey', 'Carmel', 'Charming garden venue in Carmel', null, null, 150, 5000, null, null, false, false, false, false, 'https://thebarnyardweddinggarden.com', null, false, false, true, array['garden','charming','intimate'], 'byo'),
('Folktale Winery', 'monterey', 'Carmel Valley', 'Award-winning winery with event space', null, null, 200, 7500, 100, 38, false, false, false, false, 'https://folktalewinery.com', null, true, false, true, array['winery','romantic','vineyard'], 'in_house'),
('Hidden Valley Music Seminars', 'monterey', 'Carmel Valley', 'Unique arts campus', null, null, 250, 6000, null, null, false, false, false, false, 'https://hiddenvalleymusic.org', null, false, false, true, array['unique','artistic','nature'], 'byo'),
('Bernardus Lodge', 'monterey', 'Carmel Valley', 'Luxury boutique resort', null, null, 150, 14000, 130, 55, false, false, false, false, 'https://bernarduslodge.com', null, true, true, true, array['luxury','boutique','vineyard'], 'in_house'),
('Garland Ranch Regional Park', 'monterey', 'Carmel Valley', 'Scenic outdoor park ceremony', 'Permit required', null, 500, 1500, null, null, false, false, false, false, 'https://mprpd.org', 'Permit required', false, false, false, array['outdoor','nature','budget-friendly'], 'byo'),
('Wedgewood Carmel', 'monterey', 'Carmel', 'Full-service wedding venue', null, null, 200, 4500, 85, 35, false, false, false, false, 'https://wedgewoodweddings.com', null, true, false, true, array['classic','affordable','full-service'], 'in_house'),
('Casa Palmero at Pebble Beach', 'monterey', 'Pebble Beach', 'Intimate luxury estate on 17 Mile Drive', null, null, 50, 20000, 150, 65, false, false, false, false, 'https://www.pebblebeach.com', null, true, true, true, array['luxury','intimate','coastal'], 'in_house'),
('The Lodge at Pebble Beach', 'monterey', 'Pebble Beach', 'Iconic golf resort with ocean views', null, null, 400, 18000, 140, 60, false, false, false, true, 'https://www.pebblebeach.com', null, true, true, true, array['iconic','resort','coastal'], 'in_house'),
('Cordevalle', 'bay_area', 'San Martin', 'Exclusive golf resort in the hills', null, null, 300, 16000, 135, 55, false, false, false, false, 'https://www.cordevalle.com', null, true, true, true, array['resort','golf','upscale'], 'in_house'),
('The Palace Hotel San Francisco', 'bay_area', 'San Francisco', 'Historic grand ballroom', null, null, 600, 20000, 145, 60, false, true, false, false, 'https://www.sfpalace.com', null, true, false, true, array['historic','grand','ballroom'], 'in_house'),
('The Battery San Francisco', 'bay_area', 'San Francisco', 'Private members club with rooftop', null, null, 200, 12000, 120, 50, false, true, false, false, 'https://thebatterysf.com', null, false, false, true, array['modern','rooftop','urban'], 'in_house'),
('City View at Metreon', 'bay_area', 'San Francisco', 'Panoramic city views downtown', null, null, 700, 10000, 110, 45, false, false, false, false, 'https://cityviewsf.com', null, false, false, true, array['urban','panoramic','modern'], 'byo'),
('Bently Reserve', 'bay_area', 'San Francisco', 'Stunning Federal Reserve bank conversion', null, null, 500, 11000, null, null, false, true, false, false, 'https://bentlyreserve.com', null, false, false, true, array['historic','grand','unique'], 'byo'),
('San Francisco Botanical Garden', 'bay_area', 'San Francisco', 'Beautiful garden in Golden Gate Park', null, null, 250, 7000, null, null, false, false, false, false, 'https://sfbotanicalgarden.org', null, false, false, false, array['garden','nature','romantic'], 'byo'),
('Cavallo Point Lodge', 'bay_area', 'Sausalito', 'Historic fort with Golden Gate views', null, null, 300, 15000, 130, 55, false, true, false, true, 'https://cavallopoint.com', null, true, true, true, array['historic','scenic','coastal'], 'in_house'),
('Hacienda de las Flores', 'bay_area', 'Moraga', 'Spanish-style estate in the hills', null, null, 350, 6500, null, null, false, false, false, false, 'https://moraga.ca.us', null, false, false, true, array['spanish','garden','affordable'], 'byo'),
('The Bridges Golf Club', 'bay_area', 'San Ramon', 'Elegant golf club ballroom', null, null, 300, 8000, 100, 40, false, false, false, false, 'https://thebridgesgolf.com', null, true, false, true, array['classic','golf','elegant'], 'in_house'),
('Chabot Space & Science Center', 'bay_area', 'Oakland', 'Unique planetarium and science venue', null, null, 400, 9000, null, null, false, false, true, false, 'https://chabotspace.org', null, false, false, true, array['unique','science','urban'], 'byo'),
('Piedmont Community Hall', 'bay_area', 'Piedmont', 'Classic hall with garden', null, null, 200, 4000, null, null, false, false, false, false, 'https://piedmont.ca.gov', null, false, false, true, array['classic','affordable','garden'], 'byo'),
('Nestldown', 'bay_area', 'Los Gatos', 'Magical redwood forest estate', null, null, 250, 11000, null, null, false, false, false, true, 'https://nestldown.com', null, true, true, true, array['forest','magical','romantic'], 'byo'),
('Regency Center', 'bay_area', 'San Francisco', 'Grand historic ballroom', null, null, 800, 9500, null, null, false, true, false, false, 'https://regencycenter.com', null, false, false, true, array['grand','historic','ballroom'], 'byo');
```

## Key Behaviors
- Guest count slider on Dashboard drives all per-person cost math across all tabs
- Ratings: 1–7 scale; Kerwin and Dani rate independently; stored in `ratings` table with `unique(module, item_id, rated_by)`
- Gradient border on cards when both users have rated the same item
- "Similar vibes": when venue rated 6–7, show 2–3 venues with overlapping `vibe_tags`
- Cost status: green = under budget, yellow = within 10%, red = over
- Realtime sync: all tables subscribed; changes reflect live for both users

## Deployment
- GitHub repo: `kd-wedding-planner`
- Netlify: auto-deploy from GitHub, share URL with Dani
