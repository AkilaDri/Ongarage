# Owner app: the vehicle is the spine (Phase 0 spec)

Status: approved by the product owner. Step 0 done; step 1 in progress (see §7).
Audience: the product owner, the four app teams, and whoever builds the shared vehicle context.

## 1. Goal

A vehicle owner in Sri Lanka should be able to answer, in one or two taps:

1. **What does my car need next, and when?** (next service, known repairs)
2. **Who can do this job, near me, at a fair price?** (garages, sorted by what matters to them)
3. **What have I spent on this car?** (services, repairs, breakdowns, parts)

The vehicle is the unit of all three. Every tab shows the same vehicle, so the owner never has to ask "which car is this?".

SOS stays one tap away for rare emergencies. It is a function of the platform, not its main purpose.

## 2. Decisions already made

| # | Decision | Source |
|---|---|---|
| D1 | The vehicle is the spine of the owner app. | Product owner |
| D2 | Garage owners' reviews of a vehicle owner are visible to other garages. Only the **rating and the count** are shown until a dispute is settled. The note is not shown. | Product owner |
| D3 | Brand names: **OnGarage** (the platform and garages), **OnMart** (parts shops), **OnChat** (messages). | Product owner |
| D4 | Garage ratings and review counts are shown to owners in the garage list. | Existing design |

| D5 | When a dispute is settled, the note is shown only if the dispute goes against the owner. Otherwise only the rating and count are shown. | Product owner (§8.1) |
| D6 | An owner has 30 days to dispute a review before it counts publicly. | Product owner (§8.2) |
| D7 | No separate legal check is required before the review feature ships. The product owner's view is that Sri Lankan rules here are not restrictive. This spec does not verify that. | Product owner (§8.3) |
| D8 | The price band comes from closed jobs only. | Product owner (§8.4) |
| D9 | The default garage sort is Best rated. | Product owner (§8.5) |

## 3. Naming glossary

One term per thing, in every app and in the spec. Sinhala copy keeps its own words; brand names stay in English as proper nouns.

| Thing | Name in the UI | Do not call it |
|---|---|---|
| The platform | OnGarage | "the app" in copy |
| A repair business | **garage** (OnGarage garage) | shop, workshop, mechanic |
| A parts business | **shop** (OnMart shop) | garage, store |
| A person who fixes cars | **technician** | mechanic (except in the job title on a job post) |
| The owner's car | **vehicle** (shown by its nickname and plate) | car, bike, my vehicle as a label |
| A request for prices on a job | **quote** / "Quotes ඉල්ලන්න" | bid (except in the Bids tab name) |
| A job that was agreed | **booking** or **job** | order (except for OnMart orders) |
| Messages | OnChat | chat, inbox (in headings) |

Bottom-tab labels stay English: Home, Bids, OnMart, Activity, Account.

## 4. The active-vehicle rule

- The owner has one **active vehicle** at a time, stored in one shared context used by every tab.
- The active vehicle is shown as a **vehicle chip** (nickname and plate, e.g. "Premio · CAD-8821") in the header of every tab.
- Tapping the chip opens the vehicle switcher (the same one as in Account). Switching changes every tab together.
- Adding a vehicle, and the first-time empty state, live in the switcher.
- Vehicle data is never shown twice on one screen.

## 5. Screen-by-screen data map

Each fact has one home. Other screens link to it.

| Fact | Home (owns it) | Also linked from |
|---|---|---|
| Next service (due by km or date) | Vehicle card on Home | Account → vehicle section |
| Spend this year (one total) | Vehicle card on Home | Activity (full split) |
| Spend split (garage jobs, SOS, parts) | Activity, filtered to the active vehicle | Vehicle card ("විස්තර") |
| Service records | Account → vehicle → service records | Vehicle card (last service) |
| Garage search for a job | Home search | Bids (from a posted quote) |
| Posted quotes and bids | Bids | Home (when a quote is open) |
| Parts search | OnMart | Activity (job parts) |
| Garage reviews of the owner | Account (owner's own view) | Garage list (rating and count only, D2) |
| Payment record | Account | Home (only when a payment is overdue or the owner is limited) |
| SOS | Header on every tab | — |
| Settings, language, help | Account | — |

## 6. Home, the proposed design

Each block is justified by a principle from the `ui-ux-principles` skill.

### 6.1 Order, top to bottom

1. **Header band.** Greeting (smaller), location, the **vehicle chip**, then **SOS** and **ONCHAT** at the right.
2. **Vehicle card.** The first content block. Three facts only:
   - **Next service:** "Full service in 1,200 km · by 15 Dec", with a status colour and a word (ok / due soon / due).
   - **Spent this year:** one total in tabular figures, with "විස්තර ›" to Activity.
   - **Last service:** one line, with "සේවා වාර්තා ›" to Account.
   - Empty state (no vehicle yet): "ඔබේ වාහනය එකතු කරන්න" and one button.
3. **Job search row.** "ඔබේ වාහනයට මොකද්ද ඕනේ?" with the search field and a labelled **"Quotes ඉල්ලන්න"** button at its end.
   - Under the field, **three job chips** chosen for this vehicle: the next service if it is due ("Oil change"), then the jobs this vehicle has had before, then the common ones.
4. **Active job card.** Only while a job is running: its name, the step it is at, and "විස්තර ›". Nothing otherwise.
5. **Garages for your job.** Shown after a job is chosen (from a chip or the search). Before that, shows "ඔබ පෙර භාවිතා කළ ගරාජ" (garages this vehicle has used), then the nearest garages.
   - Segmented sort, one row of three: **Best rated · Cheapest · Nearest**. Default: Best rated.
   - Each garage card: name, rating and count, distance, and a **typical price band for this job** ("සාමාන්‍යයෙන් රු. 8,000–12,000").
   - Card taps open the garage.
6. **Offers and promotions.** A slim strip, labelled "දැන්වීම" where it is paid. Below the garages.
7. **Featured and popular garages.** Lowest on the page, as a fallback for owners with no history.

### 6.1a Revision (approved after the steps above)

- **SOS at rest:** a large SOS card at the top of the page, the only red block on Home. It scrolls away with the page; there is no pinned SOS pill in the header or in a collapsed bar.
- **Corner SOS:** a round SOS button above the tab bar, bottom right. It shows on Home once the SOS card has scrolled off, and on every other tab. Hidden while a running SOS job is minimised (its return bar shows instead).
- **Order:** SOS card, vehicle card (with the overdue balance inside it, when there is one), search with Quotes, job chips, garages (past first), "සියලු සේවා ›", then the ads and offers, with the labelled featured row last.
- **Categories:** the grid of categories is replaced by the "සියලු සේවා ›" link (AllServicesSheet).
- **Fold removed:** Home no longer folds its banners into a pinned row. The OnChat button still condenses as the page scrolls.

### 6.2 Principles behind it

| Block | Principle | Why |
|---|---|---|
| Vehicle chip in every header | UX 155 (recognition over recall), UX 028 (match the real world) | The owner thinks in cars, not in tabs. |
| Vehicle card first | UX 015 (lead with one purpose), UX 090 (reliability before delight) | The owner's car status is what they came for. |
| Three facts on the card | UX 011 (less is more), Miller (117: about 3–4 items per chunk) | One glance; detail is one tap away. |
| One total for spend | UX 135 (reduce load), UPD 092 (white space around the total) | One number is read; the split is for when they want it. |
| Labelled quote button | UX 082 (pair icons with labels), UPD 094 | An unlabelled "+" has to be learned. |
| Chips for this vehicle | UX 024 (Hick's law: few choices), UX 089 (defaults the owner would pick) | Three likely choices are faster than a blank field. |
| Active job card only when running | UX 087 (habituation), UX 050 (hidden until needed) | Nothing that isn't needed takes space. |
| Three sorts, default Best rated | UX 024, UX 155 | Three visible options; trust first, price one tap away. |
| Price band, not one price | UX 005 (don't hide costs), UX 089 | It says what the job usually costs without promising a price. |
| "Past garages" first when there is history | UX 155, UX 134 (end on a success) | The owner returns to a garage they trust. |
| SOS in the header, red | UPD 069 (corners are easy to reach), UPD 029 (red = urgent), UX 087 | Reachable in one tap, not a permanent alarm. |
| Ads below the garages | UX 005 (don't disguise adverts), UX 090 | The owner's task comes first. |

### 6.3 Typography and visual rules for Home

- Vehicle name in the title style; the spend total is the largest number on the card (UX 052, hierarchy).
- Money in tabular figures, so columns line up (Typography 71).
- Plates in a fixed-width box with letter spacing (Typography 22, tracking relative to size).
- Two-line rule for garage names, with the rating line in the same place on every card (Typography 019).
- Never leave one word on its own line (Typography 060).
- Colour: one brand blue for the primary action; neutral surfaces for data; amber for "due soon"; green for "ok"; red only for SOS (UPD 030: no more than about five accents).
- Colour is never the only signal: each status has a word (UPD 030, colour blindness).
- Touch targets at least 44 px; text contrast at least 4.5:1 (UX 018).

## 7. Implementation plan (after approval)

| Step | What | Done when |
|---|---|---|
| 0. Approve this spec | Product owner confirms §§2–6 and answers §8 | Done: approved, §8 resolved |
| 1. Shared vehicle context | Active vehicle moved into `VehiclesContext`, saved between launches, falls back to the first vehicle if the saved one is gone | Done: type-checks; needs a device check that switching in Account changes every tab and survives a restart |
| 2. Vehicle chip | In every tab header (Home, Bids, Activity, OnMart); Bids and Activity filtered to the active vehicle, with an "all vehicles" choice in the picker | Done: type-checks; SOS records filtered by vehicle plate. Needs a device check. Account has no header and keeps its own switcher |
| 3. Home vehicle card | Next service, one spend total, last service, empty state; header compressed to one greeting line; search placeholder is still Sinhala when in-card | Done: type-checks; needs a device check |
| 4. Job search row | Labelled quote button ("＋ Quotes" pill), three vehicle-specific job chips (next service if due → past jobs → popular) | Done: type-checks; needs a device check |
| 5. Garages for your job | Past garages first (with price hint from last job), rows reordered: past → best rated → nearest → ads → new; price band on cards for past garages | Done: type-checks; needs a device check |
| 6. Remove duplicates | Activity filters (one row + vehicle filter), Account shortcuts | Done: type-checks; Activity has one row of top-level filters (no sub-chips), all items shown mixed per category; Account has shortcuts to Home (vehicle status) and Activity (spend); next service on Account simplified to a compact link to Home. Needs a device check |
| 7. Review visibility (D2) | Garage view of owner: rating and count only until dispute settled | Done: 30-day dispute window (D6) added to `ratingCounts`; tags hidden while ratings are unsettled; `noteVisibleToGarages` exposes the note only when the dispute went against the owner (D5); `CustomerBadge` detail sheet respects `showTags`; 4 new unit tests. Needs a device check |
| 8. Test | Three tasks with real owners (see §9) | Each task completes without help |

Each step is a separate change that can be checked on its own. Steps 1–2 are shared work and need the four app teams to agree the names in §3.

## 8. Resolved questions

1. **D2 after a dispute is settled:** the note shows only if the dispute goes against the owner (D5).
2. **Dispute window:** 30 days (D6).
3. **Legal check:** not required, per the product owner (D7).
4. **Price band source:** closed jobs only (D8).
5. **Default sort:** Best rated (D9).

## 9. How we'll know it works

Three tasks with real owners, each timed and counted in taps:

1. **"Find the cheapest brake job near me."** Target: a quote requested in under 60 seconds and under 6 taps.
2. **"How much have I spent on this car this year?"** Target: answered from Home in one tap.
3. **"When is my next service?"** Target: answered from Home with no scrolling.

Also watched: where owners tap first (desire lines, UPD 048), and whether anyone uses SOS by mistake (it should be rare and deliberate).
