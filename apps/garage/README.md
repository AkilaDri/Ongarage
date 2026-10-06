# OnGarage Garage: garage-owner app

The app garage owners use to answer SOS calls, bid on repair jobs and run their bookings. It's part of the [OnGarage monorepo](../../README.md); setup, `.env` and run commands are there.

```bash
# from the repository root
npm run garage        # dev server
npm run garage:web    # in the browser
```

## Screens

| Tab | File | Purpose |
|---|---|---|
| SOS | `src/screens/SOSInboxScreen.tsx` | Online/offline, coverage map, incoming SOS requests, daily attendance prompt, a card per job in progress |
| (modal) | `src/screens/SOSDispatchScreen.tsx` | 11-step dispatch, the garage-side mirror of the owner's SOS flow. When the assigned technician has the technician app, the field steps become a live view (approve a repair charge above the quote, or take over manually) |
| Jobs | `src/screens/JobFeedScreen.tsx` | Three sections: jobs open for bidding, direct bookings, and your bids. Swipe a card sideways to open its full details (`src/components/JobDetailView.tsx`: photos, voice notes, description, map) |
| Schedule | `src/screens/ScheduleScreen.tsx` | Earnings, upcoming and completed bookings. Each booking is a workshop job with a step bar; `BookingActions` runs the next step (receive → diagnosis → handover → close with the owner's code, or rework a reported problem); the details view adds `WorkshopPanel` (assign a team member, diagnosis with the owner's decision per line, bill, handover, warranty) |
| Parts | `src/screens/PartsScreen.tsx` | Spare parts for booked jobs: quotes to choose (deliver, or collect from the counter by the garage or a team member), orders on the way or waiting at the counter with a pickup code, received parts (`PartsRequestSheet` — locked to the owner-approved lines for workshop jobs —, `PartsDetailSheet`) |
| Garage | `src/screens/GarageProfileScreen.tsx` | Ordered by daily use: who is free right now (ready / on break), SOS radius, reviews summary, level and trust card (`LevelSheet`: trust score breakdown and the level ladder with locked features), fair share and plan card (`FairShareSheet`: flags, room per day, plans by earnings band with the value guarantee, the OnGarage Guarantee terms); settings (services, staff register and vans, public card, theme) open as sheets |

## How it fits together

- All state and actions live in `src/context/GarageContext.tsx`. It also simulates the owner side until there is a backend: new SOS requests arrive every 30 s while online (only inside the coverage radius) and expire after 4 min; customers accept quotes and confirm repairs after a few seconds; a bid is decided 20 s after it is placed, and wins when it is at or under 1.05 × the category's market price.
- **SOS capacity.** The owner confirms who came to work each day (`src/components/AttendanceSheet.tsx`); until then no SOS can be taken. The garage can run several SOS jobs at once, but never more than the mechanics present today, so it doesn't take work from another garage it can't serve. A mechanic on a job can't be marked on leave or removed, and a second job can go out on the mechanic's own vehicle when the vans are busy. A present mechanic can be marked on a break (lunch, an errand): they can't be dispatched and stop counting towards SOS capacity until marked ready again.
- **Reviews** open from the Garage tab (`src/components/ReviewsSheet.tsx`): filter unanswered or low-rated, and post, edit or delete a public reply.
- **Services** are changed in a sheet as a draft and only applied on save (`src/components/ServicesSheet.tsx`), so a stray tap can't stop jobs for a category.
- **Spare parts.** A request starts from a booking (its "🔩" line on the Schedule card, or "＋" in the Parts tab) and carries the vehicle and the owner's part type. Shops within the chosen radius quote parts + delivery; the garage compares totals, delivery time against the job and ratings. Genuine requests with no genuine stock can switch to Recon only after the owner approves. After choosing, the shop confirms stock (a shop that can't loses rating and the garage picks again), delivers (courier such as PickMe Flash, or its own), and the garage checks the part and marks it received, or sends it back. The cost goes on the owner's separate parts bill. Starting a job before ordered parts arrive needs a second tap. Shops, the owner's approval and deliveries are simulated (`src/context/PartsContext.tsx`, `src/constants/parts.ts`).
- **Direct bookings.** An owner who books this garage from a service category skips bidding, so only this garage sees the request. It must answer within 2 hours (`DIRECT_RESPONSE_MIN`): confirm the owner's slot (booked at once), propose another time (the owner accepts if it is within a day of the slot they asked for), or decline with a reason. Unanswered requests lapse so the owner can go elsewhere. The Jobs tab icon shows how many are waiting. Reply sheet: `src/components/DirectReplySheet.tsx`, which also warns about clashes with existing bookings.
- **Contact details** stay masked until a job is booked, so deals stay on the platform. Once booked, the Schedule tab shows the full number (tap or swipe a booking for its full details: what the owner sent, the call button). Voice-note playback is simulated until the owner app records real audio.
- **Who travels.** Every upcoming booking has the same controls (`src/components/BookingActions.tsx`): Call, then Directions when the owner asked for doorstep service, or Send location when they bring the vehicle in, then Start / Finish. A walk-in owner automatically gets the garage's address, map link and phone with the confirmation (`locationSharedAt`), so they can call on the way; the garage can resend it by SMS.
- Garage-side record types are in `src/types.ts`; mock data is in `src/constants/mockData.ts`.
- Theme, UI kit, `GarageCard`, `GoogleMap`, `BottomNav`, categories, breakdown and vehicle types come from `@ongarage/shared`, so the two apps stay visually and logically consistent.
