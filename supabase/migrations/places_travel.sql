-- Places & Travel (2026-08-12) — saved places ("pins") and trips built out of them.
--
-- WHY THIS SHAPE
--
-- 1. A pin is a PLACE YOU CARE ABOUT, not a map marker. Coordinates are the
--    least interesting column here; `note` and `kind` are the ones a person
--    actually reads back later. Hence lat/lng are NULLABLE: "that ramen place
--    near the station" is a legitimate pin before anyone has geocoded it, and
--    forcing coordinates would mean the fastest way to save a place is to not
--    save it. The map simply omits pins without coordinates and lists them
--    underneath instead.
--
-- 2. Type-specific fields live in `details` jsonb, not in columns. Courts want
--    surface and lights; restaurants want cuisine and price; hotels want
--    check-in. Modelling that as columns is ~30 nullable columns and a
--    migration per new kind, for fields that are only ever DISPLAYED. The
--    fields we actually filter and sort on — kind, status, tags, location —
--    are real columns. See lib/constants/placeKinds.ts for the per-kind spec.
--    If a details key ever needs an index, add a GIN index or promote it to a
--    column; that is a cheap later move, whereas un-sprawling 30 columns is not.
--
-- 3. `provenance` is a per-FIELD map (field -> 'user' | 'lookup' | 'ai'), not a
--    row-level source column. The product rule is that uncertain information is
--    never shown as fact, and uncertainty is per field: a pin can have a name
--    you typed, an address a geocoder confirmed, and a "good for kids" the
--    model guessed. One column cannot say that. Absent key = 'user', because
--    a row someone typed by hand has no map at all and must not render badges.
--    `verified_at` lets the UI say "as of 3 days ago" instead of implying live
--    truth.
--
-- 4. Place lookup is PROVIDER-NEUTRAL and optional. `provider` + the id it
--    handed back are two columns, not one `google_place_id`, because the
--    default provider here is free OpenStreetMap geocoding (Nominatim/Photon —
--    no key, no billing account) and Google Places is a drop-in upgrade if a
--    key is ever set. Hardcoding one vendor into the schema would make that a
--    migration instead of a config change. provider null = someone typed this
--    place in by hand, which is the common case and always works.
--
-- 5. `provider_place_id` is the duplicate key, and it is UNIQUE PER SCOPE, not
--    globally: two households may each legitimately pin the same restaurant.
--    Two partial indexes, because a personal pin has space_id null and a
--    unique index over a nullable column would not constrain it.
--
-- 6. Trips are separated from itinerary items on purpose. A trip you're only
--    dreaming about has places and no dates; the moment you add a dated,
--    ordered item it becomes a plan. Making itinerary rows a separate table
--    means "saved to trip" and "scheduled on day 2" are different states
--    instead of one table with a nullable date pretending to be both.
--
-- 7. Every money figure carries `source`. An AI-estimated flight cost and a
--    receipt you typed must never render identically, and must never be summed
--    into one number. The check constraint is the enforcement point — a route
--    that forgets to set it fails loudly rather than quietly inventing a fact.
--
-- WHAT IS DELIBERATELY ABSENT
--
--   No rating column on places. A 4.2/5 on your own life is the kind of
--   scorekeeping 19-ANTI-GOALS exists to prevent. `status` ('idea' / 'been' /
--   'favourite') carries everything a person actually acts on.
--
--   No time-of-day column on itinerary items. `time_label` is text, because
--   what people write is "morning", "after lunch", "9ish", and nothing in this
--   app renders a time-of-day anyway (see events.event_date, date-only by the
--   same reasoning).
--
-- space_id nullable throughout: null = personal, set = shared with that space,
-- same as goals.sql. There are no updated_at triggers anywhere in this schema;
-- the app sets updated_at on write, matching household_rules and
-- household_watchlist.
--
-- Requires shared_spaces_and_item_sharing.sql + fix_shared_spaces_recursion.sql.


-- ---------------------------------------------------------------- places

create table if not exists places (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  space_id        uuid references shared_spaces(id) on delete cascade,

  name            text not null,
  -- Free text, validated in the app against lib/constants/placeKinds.ts rather
  -- than by a check constraint: this taxonomy will churn (padel, sauna, dog
  -- park...) and a migration per new kind is friction with no safety payoff.
  -- An unrecognised kind falls back to the generic 'place' renderer, so an
  -- older client writing a kind we don't know degrades to plain, not to loss.
  kind            text not null default 'place',
  note            text,

  address         text,
  city            text,
  country         text,
  lat             double precision,
  lng             double precision,

  -- Which lookup service, if any, produced the geo fields. null = typed by
  -- hand. 'osm' is the free default; 'google' only if a key is configured.
  provider          text check (provider in ('osm', 'google')),
  provider_place_id text,
  verified_at       timestamptz,
  maps_url          text,

  status          text not null default 'idea'
                  check (status in ('idea', 'been', 'favourite', 'archived')),
  tags            text[] not null default '{}',

  details         jsonb not null default '{}',
  provenance      jsonb not null default '{}',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table places enable row level security;

drop policy if exists "places_own_or_space" on places;
create policy "places_own_or_space" on places
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists places_space_idx   on places(space_id);
create index if not exists places_user_idx    on places(user_id);
create index if not exists places_kind_idx    on places(kind);
create index if not exists places_status_idx  on places(status);
create index if not exists places_created_idx on places(created_at);

-- Duplicate detection, scoped rather than global. Partial on two counts: most
-- pins have no provider id at all, and a personal pin (space_id null) needs the
-- user-scoped index because null never collides in a unique index.
create unique index if not exists places_provider_space_uniq
  on places(space_id, provider, provider_place_id)
  where provider_place_id is not null and space_id is not null;

create unique index if not exists places_provider_user_uniq
  on places(user_id, provider, provider_place_id)
  where provider_place_id is not null and space_id is null;


-- ---------------------------------------------------------------- trips

create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete cascade,

  title         text not null,
  destination   text,
  -- Date-only and NULLABLE, matching events.event_date and every other dated
  -- thing in the app. A trip with no dates is the normal early state, not an
  -- incomplete record.
  start_date    date,
  end_date      date,
  status        text not null default 'dreaming'
                check (status in ('dreaming', 'planning', 'booked', 'travelling', 'done', 'cancelled')),
  notes         text,
  -- Total intended spend, typed by a person. Never written by the assistant —
  -- an AI-guessed budget target is a number that would silently become a
  -- commitment. Estimates live in trip_budget_items with source='ai-estimate'.
  budget_total  numeric(12,2),
  currency      text not null default 'USD',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table trips enable row level security;

drop policy if exists "trips_own_or_space" on trips;
create policy "trips_own_or_space" on trips
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists trips_space_idx  on trips(space_id);
create index if not exists trips_status_idx on trips(status);
create index if not exists trips_start_idx  on trips(start_date);


-- ------------------------------------------------------ trip_places (shortlist)

-- "Places we might want on this trip", before anything is scheduled. The
-- unique constraint is what makes "add that restaurant to our trip" idempotent
-- when it arrives twice from Discord and the web at once.
create table if not exists trip_places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  trip_id     uuid not null references trips(id) on delete cascade,
  place_id    uuid not null references places(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now(),
  unique (trip_id, place_id)
);

alter table trip_places enable row level security;

drop policy if exists "trip_places_own_or_space" on trip_places;
create policy "trip_places_own_or_space" on trip_places
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists trip_places_trip_idx  on trip_places(trip_id);
create index if not exists trip_places_place_idx on trip_places(place_id);


-- ------------------------------------------------------ itinerary_items

create table if not exists itinerary_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  trip_id     uuid not null references trips(id) on delete cascade,
  -- Optional: "walk around the old town" is a legitimate itinerary item with
  -- no pin behind it. Requiring a place here would push people to create junk
  -- pins just to schedule an afternoon. on delete set null, not cascade —
  -- deleting a pin must not silently delete a day of someone's plan.
  place_id    uuid references places(id) on delete set null,

  title       text not null,
  item_date   date,
  time_label  text,
  -- Manual ordering within a day. Sparse (10, 20, 30) so inserting between two
  -- items is one UPDATE rather than a renumber of the whole day.
  sort_order  integer not null default 0,

  kind        text not null default 'activity'
              check (kind in ('activity', 'travel', 'stay', 'food', 'note')),
  notes       text,
  done        boolean not null default false,
  provenance  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table itinerary_items enable row level security;

drop policy if exists "itinerary_items_own_or_space" on itinerary_items;
create policy "itinerary_items_own_or_space" on itinerary_items
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists itinerary_trip_idx on itinerary_items(trip_id);
create index if not exists itinerary_date_idx on itinerary_items(trip_id, item_date, sort_order);


-- ------------------------------------------------------ trip_budget_items

create table if not exists trip_budget_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  trip_id     uuid not null references trips(id) on delete cascade,

  label       text not null,
  category    text not null default 'other'
              check (category in ('flights', 'stay', 'food', 'transport', 'activities', 'other')),
  amount      numeric(12,2) not null,
  currency    text not null default 'USD',
  -- THE column that makes an AI safe near money. 'ai-estimate' rows render
  -- muted with an "est." prefix and are excluded from any spent total; only
  -- 'user' rows with paid=true count as real money. Not nullable and not
  -- defaulted, so a route that forgets to set it cannot insert.
  source      text not null check (source in ('user', 'ai-estimate')),
  -- Only meaningful on ai-estimate rows. Required by the assistant's tool
  -- schema, so a guessed figure always arrives with a stated basis rather than
  -- as a bare number that looks like a quote.
  confidence     text check (confidence in ('high', 'medium', 'low')),
  estimate_basis text,
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table trip_budget_items enable row level security;

drop policy if exists "trip_budget_own_or_space" on trip_budget_items;
create policy "trip_budget_own_or_space" on trip_budget_items
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists trip_budget_trip_idx on trip_budget_items(trip_id);


-- ------------------------------------------------------ travel_prefs

-- One row per (user, space-or-null). Not a blob inside user_prefs.layout,
-- because a couple's shared travel taste ("we hate early flights") is a
-- different thing from one person's, and space_id already expresses that
-- distinction everywhere else in this schema.
create table if not exists travel_prefs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete cascade,
  home_city     text,
  home_lat      double precision,
  home_lng      double precision,
  currency      text not null default 'USD',
  -- Free text, not a checkbox matrix of travel styles. The assistant reads it
  -- as context. A taxonomy here would be a rigid life methodology, and the
  -- thing people actually want to say is a sentence.
  style_note    text,
  dietary       text,
  avoid         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- coalesce, because a unique index over a nullable space_id would let someone
-- accumulate unlimited personal preference rows.
create unique index if not exists travel_prefs_scope_uniq
  on travel_prefs(user_id, coalesce(space_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table travel_prefs enable row level security;

drop policy if exists "travel_prefs_own_or_space" on travel_prefs;
create policy "travel_prefs_own_or_space" on travel_prefs
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));


-- ------------------------------------------------------ travel_proposals

-- The travel assistant's confirm step, in a table rather than in memory.
--
-- The assistant never writes to places/trips/itinerary directly. A write tool
-- validates its input against the caller's scope, parks it here, and the model
-- gets back "pending_confirmation". Only an explicit confirm runs it. That
-- makes "nothing changes without you seeing exactly what changes" a property of
-- the system rather than a line in a prompt — which matters because place
-- lookups pipe third-party business names and descriptions into the model's
-- context, and injected text must not be able to cause a silent write.
--
-- Rows are short-lived; scope is re-checked at commit time because space
-- membership can change inside the expiry window.
create table if not exists travel_proposals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  tool        text not null,
  input       jsonb not null,
  status      text not null default 'pending'
              check (status in ('pending', 'committed', 'discarded')),
  expires_at  timestamptz not null default now() + interval '15 minutes',
  created_at  timestamptz not null default now()
);

alter table travel_proposals enable row level security;

drop policy if exists "travel_proposals_own_or_space" on travel_proposals;
create policy "travel_proposals_own_or_space" on travel_proposals
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists travel_proposals_expiry_idx on travel_proposals(expires_at);


-- ------------------------------------------------------ lookup caches

-- Infrastructure, not user data. RLS is ENABLED WITH NO POLICIES on both
-- tables, which means the anon and authenticated roles can read nothing at all;
-- only the service-role routes under app/api/places/* can touch them. That is
-- the intent, not an oversight — do not add a policy here.
--
-- These exist to be a good citizen as much as a cost control. The free OSM
-- geocoders (Nominatim, Photon) are run on donated infrastructure with a fair
-- use policy measured in requests per second; caching aggressively is the
-- difference between using them politely and getting blocked. If a Google key
-- is ever configured, the same tables become the billing shield.
--
-- field_mask is part of the key because a cached cheap response must not
-- satisfy a request that asked for more fields.

create table if not exists place_lookup_cache (
  provider    text not null,
  place_id    text not null,
  field_mask  text not null default '',
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (provider, place_id, field_mask)
);
alter table place_lookup_cache enable row level security;
create index if not exists place_lookup_cache_fetched_idx on place_lookup_cache(fetched_at);

-- Search is billed and rate-limited per REQUEST, so the query string is the
-- key. Normalized by the app (lowercased, whitespace collapsed, bias location
-- rounded to ~1km) so "Ramen  Tokyo" and "ramen tokyo" are one lookup, not two.
create table if not exists place_search_cache (
  query_key   text primary key,
  provider    text not null,
  field_mask  text not null default '',
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);
alter table place_search_cache enable row level security;
create index if not exists place_search_cache_fetched_idx on place_search_cache(fetched_at);
