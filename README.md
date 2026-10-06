# OnGarage

OnGarage is a vehicle-service marketplace for Sri Lanka, built as four mobile apps that are the sides of the same workflow:

- **OnGarage** (`apps/user`): for **vehicle owners**. Call roadside help (SOS), post a repair job and compare garage bids, browse garages by service, and track bookings and service history.
- **OnGarage Garage** (`apps/garage`): for **garage owners**. Receive SOS requests and dispatch a mechanic, bid on posted repair jobs, manage bookings and earnings, and maintain the garage profile owners see. Order spare parts for booked jobs from nearby shops.
- **OnGarage Parts** (`apps/parts`): for **spare-parts shops**. Quote for garages' parts requests, confirm stock, dispatch by courier or own rider, get paid on delivery, and keep stock and prices current.
- **OnGarage Technician** (`apps/tech`): for **mechanics and electricians**, garage employees or freelancers working for several garages. Check in to a garage, take assigned SOS jobs in the field (navigate, inspect, checklist, close with the owner's QR or code, collect payment) and workshop job cards, and track pay per garage.

All apps use Expo and React Native, have a Sinhala interface, and share one design system with light and dark themes.

## Repository layout

```
apps/
  user/            Vehicle-owner app
  garage/          Garage-owner app
  parts/           Spare-parts shop app
  tech/            Field technician app
packages/
  shared/          @ongarage/shared: types, theme engine, glass UI kit,
                   line icons, sheets, toasts, Google Maps helpers,
                   service categories, formatting
```

This is an npm workspaces monorepo: one `node_modules` and one `package-lock.json` at the root. Code goes into `packages/shared` only when more than one app needs it.

## Features (vehicle-owner app)

| Area | What it does |
|---|---|
| **SOS roadside help** | Pick the breakdown location on a map, choose the vehicle and breakdown type. An 11-step flow follows: search with a growing radius (and a growing technician call-out fee), garage bids, live mechanic tracking, repair progress, QR code to close the job, rating and reward. |
| **Repair bidding** | Post a job with *OnGarage Buddy* (guided fault diagnosis), category, description, spare-part preference, doorstep pickup and a 1–24 h bid window. Bids come in under Received / Pending / Expired, with countdowns, lowest-bid highlighting and republishing. |
| **Garage browsing** | 12 service categories. A map with garage pins and a three-position bottom sheet of garage cards (call, directions, book). |
| **Workshop jobs** | Follow every booked repair step by step: the garage's check-in photos, its diagnosis (tick the lines you agree to, or stop and pay only the inspection fee), the handover report and bill, then show your QR / 6-digit code to close. Approve extra work found mid-repair, and allow Recon when Genuine isn't available (see the saving) or wait for Genuine. Report a problem (the garage reworks it, or escalate to OnGarage) and claim the warranty. |
| **OnGarage Guarantee** | Jobs with a Premier garage are protected: if the fault comes back and the garage can't put it right, claim (eligibility shown, the garage replies first, OnGarage decides; capped, the garage pays a deductible). |
| **Receipts & ratings** | Every job closed with your code has a receipt (labour and parts line by line, the warranty). Rate the garage on quality, fair price, on time and communication, and the technician; the garage can reply publicly. Garage cards and bids show each garage's level badge and latest review with its reply. |
| **Activity & profile** | Current bookings and completed services with receipts, warranty status (claim while it lasts) and your ratings. Profile with an animated vehicle showcase, an add-vehicle form with Sri Lankan plate validation, and a light/dark theme switch. |

## Features (garage app)

| Area | What it does |
|---|---|
| **SOS inbox** | Go online or offline. Live SOS requests from inside the coverage radius are shown on a map and as cards with the breakdown type, vehicle, distance, ETA and the call-out fee you will receive. Requests expire if nobody answers. |
| **SOS dispatch** | A 10-step flow that mirrors the owner's SOS: review, quote (suggested price and ETA), customer choice, assign mechanic and van, live trip, arrival, repair checklist, customer confirmation, QR scan with the bill, rating. |
| **Job feed & bidding** | Jobs posted by owners, filtered by the services you offer. Each shows Buddy's diagnosis, spare-part preference, doorstep pickup and a deadline countdown. A bid sheet has a market-price hint, warranty and time estimate; bids can be edited or withdrawn while pending. |
| **Schedule** | Today's and the last 7 days' earnings. Won bids and direct bookings become workshop jobs: receive the vehicle with photos, send a diagnosis the owner approves line by line, repair, hand over with a checklist and bill, close with the owner's QR or code, then warranty. Assign the job to a team member; rework when the owner reports a problem. |
| **Spare parts** | Order exactly the parts the owner approved (or named in their post) from shops nearby (the owner's part type is locked; Recon only with their approval). Compare price and time, then have them delivered or collect from the counter yourself or send a technician with a pickup code. Track, check in, rate the shop. Parts are billed to the owner separately. |
| **Garage profile** | Ordered by daily use: who is free right now (ready / on break), SOS radius, reviews with replies, the trust score (four rating dimensions, completion, on-time and dispute rates, a tip for the weakest) and the level ladder (requirements met, features unlocked and still locked, a 30-day grace period when falling below), fair share (why the garage is limited, new-work room per day, next-free-day for direct bookings) and the subscription (priced by earnings band, with a value guarantee); settings for services, staff, vans, the public card and theme. |

## Features (technician app)

| Area | What it does |
|---|---|
| **Duty** | Check in to one garage at a time (so a freelancer counts towards one garage's SOS capacity), take breaks, check out. |
| **SOS in the field** | Accept an assigned SOS within 90 s, navigate with live location, arrive, inspect, get manager approval for a repair charge above the quote, work the checklist, close with the owner's QR or 6-digit code, collect payment. The garage follows each step live. |
| **Workshop job cards** | Bookings assigned by a garage: photos, voice notes, parts status, walk-in or doorstep. Receive the vehicle with photos, write the diagnosis (suggested parts and market prices), repair once the owner approves, hand over with a checklist and photos, close with the owner's code. Ask the owner about extra work found mid-repair. Freelancers accept or decline. |
| **Parts pickups** | A garage sends you to a parts shop's counter: directions, the pickup code (QR / 6 digits) to show, then hand the parts to the garage. |
| **Garages & earnings** | Invitations and invite codes, per-garage rates, the account with each garage (pay owed vs. cash collected), job history and owners' ratings. |

## Features (parts shop app)

| Area | What it does |
|---|---|
| **Requests** | Garages' parts requests within the delivery radius, with what you have in stock for each line. Quote (prices from stock, delivery by PickMe Flash or own rider, arrival time, warranty) or pass. |
| **Orders** | Confirm stock within 10 minutes, pack, then dispatch (paid on delivery) or keep it at the counter for the garage to collect (check their pickup code, paid the parts price); handle returns. Earnings for today and the week. |
| **Stock** | Prices, brands and quantities per part type; low and out-of-stock filter. |
| **Shop** | Open/closed, delivery radius and methods, reviews from garages with replies, what you sell. |

## How SOS charges work

- **Call-out fee.** A fee OnGarage suggests and approves for the technician, to cover travelling to the breakdown. It goes to the technician, not to OnGarage. It is paid even when the technician finds nothing serious to repair. It starts at LKR 500 and grows by LKR 250 each time the owner widens the search radius, because the technician has farther to travel.
- **Repair charge.** The technician quotes an estimate (or "after inspection") and settles the final amount on site. If no repair is needed, it is zero.
- **Bill.** Call-out fee + final repair charge. Both go to the technician.

## Tech stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router · react-native-svg · expo-location · AsyncStorage · Google Maps Platform (Static Maps, Geocoding, Places API (New)) · Noto Sans Sinhala

## Getting started

**Requirements:** Node.js 20+ and npm. To run on a phone, install Expo Go, or use an Android emulator or iOS simulator.

```bash
git clone https://github.com/AkilaDri/Ongarage.git
cd Ongarage
npm install
```

Each app reads its own `.env`, which is not committed. Copy the examples and add a Google Maps API key:

```bash
cp apps/user/.env.example   apps/user/.env
cp apps/garage/.env.example apps/garage/.env
cp apps/parts/.env.example  apps/parts/.env
cp apps/tech/.env.example   apps/tech/.env
# then set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in each file
```

The key needs **Maps Static API**, **Geocoding API** and **Places API (New)** enabled, and billing turned on for its Google Cloud project. Without a working key the apps still run: maps fall back to a dotted grid. Restrict the key to your app IDs (`com.ongarage.app`, `com.ongarage.garage`, `com.ongarage.parts`, `com.ongarage.tech`) and web domain, because `EXPO_PUBLIC_` values are bundled into the app.

## Running

Run these from the repository root:

| Command | Starts | Port |
|---|---|---|
| `npm run user` | Owner app dev server (press `a` Android, `i` iOS, `w` web, or scan the QR code with Expo Go) | 8091 |
| `npm run user:web` | Owner app in the browser | 8091 |
| `npm run garage` | Garage app dev server | 8092 |
| `npm run garage:web` | Garage app in the browser | 8092 |
| `npm run parts` | Parts shop app dev server | 8093 |
| `npm run parts:web` | Parts shop app in the browser | 8093 |
| `npm run tech` | Technician app dev server | 8094 |
| `npm run tech:web` | Technician app in the browser | 8094 |
| `npm run typecheck` | TypeScript checks for all workspaces | — |

Each app has its own fixed port (set in its `package.json` scripts), so all four can run at once — start each in its own terminal and open http://localhost:8091 (owner), 8092 (garage), 8093 (parts shop) and 8094 (technician) in the browser. Add `-- --clear` to clear Metro's cache, e.g. `npm run garage -- --clear`.

Add a dependency to one app with `npm install <package> -w @ongarage/user`. Keep shared dependency versions identical across the apps so React and React Native are installed once.

## Project status

- **No backend yet.** All data is mock data. In the owner app, garage responses are simulated: bids arrive on a timer, and SOS acceptance and tracking are animated. The types in `packages/shared/src/types.ts` are meant to become the contract with a real backend.
- **Garage app** works end to end on mock data. It simulates the owner side: SOS requests and posted jobs arrive over time, customers accept quotes and confirm repairs, and bids are decided by price. Parts shops are simulated too.
- **Parts shop app** works end to end on mock data. It simulates the garages: requests arrive, quotes are decided by total price and delivery time, deliveries are checked in and paid, and one garage reports a wrong part.
- **Technician app** works end to end on mock data. It simulates the garages (SOS offers, manager approvals) and owners (confirmation, ratings). In the garage app, a technician with the app makes the SOS dispatch a live view, simulated there too.

## Roadmap

1. Backend with live updates (e.g. Supabase or Firebase): accounts, jobs, bids, SOS dispatch, live mechanic location.
2. Connect the apps to the backend so an owner's SOS or job reaches real garages, a garage's quote or bid reaches the owner, and a garage's parts request reaches real shops.
3. Notifications, payments, ratings and reviews.
