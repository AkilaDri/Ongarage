# Feature status

A working checklist of every feature in the four apps: whether its **design is optimized** (refined to the Bids tab benchmark and the shared flow look: `BookingShell`, `FlowButton`, 26px cards, 16px bold headings) and whether it has a **real process** behind it. Written 2026-11-23, last updated 2026-11-26, from the code, the refinement log (`.claude/skills/ui-ux-principles/usage-log.md`) and the work done in conversations. It is an assessment, not a test run: correct any line that is wrong.

**Design:** ✅ optimized · 🟡 partly refined · ⬜ not yet reviewed
**Process:** 🟢 real logic (rules and state work; only the other side is simulated) · 🟠 simulated (the other app or the backend is faked) · 🔴 shown but nothing behind it · ➖ nothing to back

## Owner app (`apps/user`)

### Tabs
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Bids tab (job cards, bid cards, timers, accept, rows view, map, empty states) | ✅ | 🟠 | The benchmark. 2026-11-26: map header with sort chips, empty states with next step, rows view resets, booked jobs move to Activity. Bids are simulated. |
| Activity tab (list, header, opens on ongoing, one place per job) | 🟡 | 🟠 | Opens on ongoing; only confirmed quote jobs. The list cards, history, calendar and spending panel are not reviewed against the benchmark. |
| Posted-job details (bids, progress, what was sent) | ✅ | 🟠 | Rebuilt 2026-11-26 (job card, countdown, bid cards, one "sent" card). |
| Completed job and SOS record details | ✅ | 🟢 | Rebuilt 2026-11-26 (summary and total first, bill, warranty, history last). The workshop record inside keeps the old look. |
| Direct-booking details | ⬜ | 🟠 | Still the old design. |
| Home (header, vehicle chip, greeting) | ✅ | 🟢 | Header refined 2026-11-15. |
| Home (services grid, job chips, banners, offer tiles, garage rows, saved garages row) | 🟡 | 🔴 | EV and fuel tiles hidden from Quick Booking. Offers, banners and sponsored rows are fixed lists. Job chips ignore the vehicle type. |
| OnMart tab (shops, my requests, open wall, orders) | ⬜ | 🟠 | Rules have unit tests; shops are simulated; banners and deals are fixtures. |
| Account tab (vehicles card, rows, theme, language, help, about) | 🟡 | 🟢 | Vehicles card, remove, handover and OnChat position done; rows and sheets not reviewed. |

### Booking and request flows
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Book a time after accepting a bid (3 steps: day and time, staying, summary) | ✅ | 🟠 | Same date step, soonest-slot confirmation, staying step, summary card and back button as the garage booking. |
| Book a garage directly from a garage card (6 steps: service and vehicle, details, day and time, part type and place, staying, summary) | ✅ | 🟠 | Summary lines edit and return. Categories not filtered by vehicle type; ✕ closes without asking. |
| Quote request: step 1 (vehicle card, OnBuddy, service card) and step 2 (problem, photos, voice) | ✅ | 🟠 | Its header has not had the new back button and close placement. |
| Quote request: step 3 (spare part type, place, home pickup) and step 4 (bidding time, summary) | 🟡 | 🟠 | Cards and footer done; contents (choice chips, slider, map card, switch) not reviewed. |
| OnBuddy (AI describes the problem, suggests the service) | 🟡 | 🟠 | Card restyled; the open chat/results area keeps its old look. Not in the garage booking. |
| SOS flow (11 steps) | ⬜ | 🟠 | The pattern source for towing; not reviewed here. Operators are simulated. |
| Staying or leaving (both bookings, two job paths, switch during the job, bill check for in-person items) | ✅ | 🟠 | Built 2026-11-26; replaces the tracking choice. Garage side (see the answer, record in-person items) waits for "match up with the user app". Not checked on a phone. |
| Towing flow (6 steps) | ✅ | 🟠 | Refined 2026-11-10. Tow operators simulated; no vehicle-type rule. |
| EV charging booking, fuel station finder, place reports | ⬜ | 🟠 | `PLACES` is a fixed list; reports have rules. |
| Search (Home search, category browse, "did you mean") | ⬜ | 🟢 | Learns from real queries (see memory). |

### Garage profile and trust
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Garage profile sheet (rating, reviews, history tag) | 🟡 | 🟠 | Content is generated from a hash of the garage id. |
| Offers (detail sheet, apply discount or warranty at confirmation) | 🟡 | 🔴 | Owner side built; garages cannot publish offers yet. |
| Packages ("gigs") | ⬜ | 🔴 | Planned; garage side waits for "match up with the user app". |
| Gallery, reels, hours, staff, facilities, certifications, wall | ⬜ | 🔴 | No publishing in the garage app. Reels cannot play. |
| Saved garages (heart, Home row, list) | ⬜ | 🔴 | Saved on the phone only; no benefit to anyone. |
| Garage history tag ("first time", "last time") | ✅ | 🟢 | Built from the owner's own jobs. |

### Vehicles
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Add vehicle sheet | ⬜ | 🟢 | Old design. |
| Vehicle details sheet, service records, next service | ⬜ | 🟢 | Not reviewed. |
| Remove vehicle (archive, restore, open-work block) | ✅ | 🟢 | Built 2026-11-23. |
| Hand over history to a buyer (code, preview, consent for prices, warranty, free) | ✅ | 🟠 | Built 2026-11-23 as a one-device simulation; demo code 246810 / plate CAR-4567. Warranty claims and QR not built. |
| Vehicle-type rules (bike, three-wheeler, heavy menus) | 🟡 | 🟡 | Applied to Home grid, all-services and offers only. Missing: Home job chips, quote and booking categories, garage matching, towing and SOS. |
| Test vehicles, one per type | ➖ | ➖ | Added 2026-11-23. |

### After the booking (workshop)
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Job tracker, diagnosis approval, extra work, recon, handover with owner's code, receipt | ✅ | 🟠 | Refined 2026-11-26 in six steps (your turn, pop-ups, rare actions, buttons and text, finished card, payment and cancel). Receipt sheet content not redesigned. Not yet checked on a phone. |
| Rating, review reply, problem report, OnGarage Guarantee claim | 🟡 | 🟠 | Buttons and text updated; layouts not reviewed in detail. |
| Warranty claim | ⬜ | 🟠 | To be revisited with the user. |
| Payments and reminders (balance, promised day, standing) | 🟡 | 🟠 | Payment box buttons, wording and colours done 2026-11-26; late warnings hidden on the dev server; no push. |
| Chat (OnChat) with garages and shops | ⬜ | 🟠 | Replies simulated. |

### Settings and system
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Notification switches | ⬜ | 🔴 | Saved but nothing reads them; no push (`expo-notifications` missing). |
| Service reminders | ⬜ | 🔴 | Show in the app only. |
| Language (Sinhala, English) | ⬜ | 🟡 | English text only partly translated. |
| Dark theme, theme toggle | 🟡 | 🟢 | Review in light by default. |
| Photos and voice notes (`MediaAttachments`) | ✅ | 🟠 | Redesigned 2026-11-23, per-photo remove added; camera/mic need the native build. |
| Weather animation, vehicle turntable | ➖ | ➖ | Decoration; leave. |

## Garage app (`apps/garage`) — not reviewed this round; waits for "match up with the user app"
| Feature | Design | Process | Notes / next step |
|---|---|---|---|
| Jobs tab (job feed, bidding) | ⬜ | 🟠 | |
| SOS inbox and 10-step dispatch | ⬜ | 🟠 | |
| Schedule and workshop jobs, direct requests | ⬜ | 🟠 | |
| OnMart (marketplace, parts for jobs, referrals) | ⬜ | 🟠 | |
| Garage profile (services by category, public preview, level, fair share, reviews) | ⬜ | 🟢 | Categories exist; sub-services, offers, packages, gallery, hours, certifications missing. |

## OnMart Shop (`apps/parts`) and Technician (`apps/tech`) — not reviewed
| Feature | Design | Process | Notes |
|---|---|---|---|
| Parts: requests and enquiries, orders and dispatch, stock, catalogue, shop profile | ⬜ | 🟠 | |
| Tech: duty check-in, SOS field steps, job cards, parts pickups, garages and rates, earnings | ⬜ | 🟠 | |

## Not built yet
Admin app (OnGarage staff) · backend · Claude-backed AI provider · Laya · push notifications · real publishing for offers, packages, gallery, hours · payments to the platform · real garage matching by vehicle type.

## Pareto: the vital few (use this to pick what to work on next)
The 80/20 rule (Universal Principles of Design, 133 Pareto): about 80% of use comes from 20% of the features, so work on the few that most owners use most often, or that cost the most when they fail, before the long tail. Until there is real usage data (the search log, then the backend) this ranking is an estimate; replace it with data when it exists.

**The vital few (owner app), in order of use × cost of failure**
1. **Find a garage and book it:** Home (services grid, job chips, search) → garage profile → garage booking form.
2. **Post a quote request and take a bid:** quote request → Bids tab → accept → book a time.
3. **Follow the job to the end:** Activity tab and the workshop sheets (approval, extra work, handover with the code, receipt, rating).
4. **The vehicle:** the active vehicle chip, picking a vehicle, and menus that match the vehicle type (bikes and three-wheelers are common in Sri Lanka, so the vehicle-type gaps belong here).
5. **Emergencies:** SOS and towing: rarely used but the highest cost when they fail.

**The trivial many (leave until the vital few are done):** reels, gallery, staff, certifications, saved garages, language, theme, EV charging, OnMart deals and banners, vehicle removal and handover, weather animation.

**When the user asks "what should we work on?":** read this file, list the not-finished items among the vital few first (design ⬜/🟡 or process 🔴/🟠 that blocks the journey), say why each one earns its place (how many owners meet it, how bad a failure is), name the smallest next step, and only then mention the long tail. Do not suggest a long-tail feature while a vital-few feature is unfinished, unless the user asks for it.

## Suggested order
1. **Finish the owner flows** (design): quote steps 3 and 4, OnBuddy open state, Activity list cards, direct-booking details.
2. **Close the process gaps:** vehicle type (job chips, quote and booking categories, towing and SOS).
3. **Owner tabs not yet reviewed:** OnMart, Account rows and sheets, add vehicle, vehicle details.
4. **Workshop sheets** (approval, handover, rating, receipt).
5. **Replace the dead controls** (process): notification switches and reminders (one push setup), saved garages.
6. **"Match up with the user app":** garage side for offers, packages, profile content, sub-services, vehicle types served.
7. **Parts shop and technician apps.**
8. **Backend, admin app, AI provider.**
