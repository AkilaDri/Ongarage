# OnGarage

OnGarage is a vehicle-service marketplace for Sri Lanka, built as two mobile apps that are the two sides of the same workflow:

- **OnGarage** (`apps/user`): for **vehicle owners**. Call roadside help (SOS), post a repair job and compare garage bids, browse garages by service, and track bookings and service history.
- **OnGarage Garage** (`apps/garage`): for **garage owners**. Receive SOS requests, bid on posted jobs, manage bookings and the garage profile. *Early stage: currently a navigable shell.*

Both apps use Expo and React Native, have a Sinhala interface, and share one design system with light and dark themes.

## Repository layout

```
apps/
  user/            Vehicle-owner app
  garage/          Garage-owner app
packages/
  shared/          @ongarage/shared: types, theme engine, glass UI kit,
                   line icons, Google Maps helpers, service categories
```

This is an npm workspaces monorepo: one `node_modules` and one `package-lock.json` at the root. Code goes into `packages/shared` only when both apps need it.

## Features (vehicle-owner app)

| Area | What it does |
|---|---|
| **SOS roadside help** | Pick the breakdown location on a map, choose the vehicle and breakdown type. An 11-step flow follows: search with a growing radius and surcharge, garage bids, live mechanic tracking, repair progress, QR code to close the job, rating and reward. |
| **Repair bidding** | Post a job with *OnGarage Buddy* (guided fault diagnosis), category, description, spare-part preference, doorstep pickup and a 1–24 h bid window. Bids come in under Received / Pending / Expired, with countdowns, lowest-bid highlighting and republishing. |
| **Garage browsing** | 12 service categories. A map with garage pins and a three-position bottom sheet of garage cards (call, directions, book). |
| **Activity & profile** | Current bookings and completed services. Profile with an animated vehicle showcase, an add-vehicle form with Sri Lankan plate validation, and a light/dark theme switch. |

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
# then set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in both files
```

The key needs **Maps Static API**, **Geocoding API** and **Places API (New)** enabled, and billing turned on for its Google Cloud project. Without a working key the apps still run: maps fall back to a dotted grid. Restrict the key to your app IDs (`com.ongarage.app`, `com.ongarage.garage`) and web domain, because `EXPO_PUBLIC_` values are bundled into the app.

## Running

Run these from the repository root:

| Command | Starts |
|---|---|
| `npm run user` | Owner app dev server (press `a` Android, `i` iOS, `w` web, or scan the QR code with Expo Go) |
| `npm run user:web` | Owner app in the browser |
| `npm run garage` | Garage app dev server |
| `npm run garage:web` | Garage app in the browser |
| `npm run typecheck` | TypeScript checks for all workspaces |

To run both apps at once, give them different ports:

```bash
npm run start -w @ongarage/user   -- --port 8083
npm run start -w @ongarage/garage -- --port 8084
```

Add a dependency to one app with `npm install <package> -w @ongarage/user`. Keep shared dependency versions identical across the apps so React and React Native are installed once.

## Project status

- **No backend yet.** All data is mock data. In the owner app, garage responses are simulated: bids arrive on a timer, and SOS acceptance and tracking are animated. The types in `packages/shared/src/types.ts` are meant to become the contract with a real backend.
- **Garage app** has its navigation and shared theme in place. Its features come next.

## Roadmap

1. Backend with live updates (e.g. Supabase or Firebase): accounts, jobs, bids, SOS dispatch, live mechanic location.
2. Garage app: SOS inbox and dispatch, job feed and bidding, bookings and schedule, garage profile and services, QR job closing.
3. Notifications, payments, ratings and reviews.
