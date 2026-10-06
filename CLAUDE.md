# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## OnGarage monorepo

Four Expo (SDK 57, React Native 0.86, React 19.2, TypeScript) apps that are the sides of one marketplace, plus the code they share. npm workspaces; one `node_modules` and one `package-lock.json` at the root.

```
apps/user       vehicle-owner app (SOS, post repair jobs, receive bids, activity, profile)
apps/garage     garage-owner app (SOS inbox + 10-step dispatch, job feed + bidding, schedule, spare parts, garage profile)
apps/parts      parts-shop app (garages' parts requests + quoting, orders + dispatch, stock, shop profile)
apps/tech       technician app (duty check-in, SOS field steps, workshop job cards, garages + rates, earnings)
packages/shared @ongarage/shared — types, theme engine + palettes, fonts, glass UI kit, line icons,
                BottomNav, Sheet, NoticeToast, SwipeCard, VoiceNotePlayer, GarageCard, GoogleMap + maps helpers, service categories (+ market
                prices), SOS breakdown types, vehicle types, formatting (money, ago, countdown…)
```

The garage app is the counterpart of every user-app flow: SOS request → accept/quote → assign mechanic + live location → arrived → repairing → complete → scan the owner's QR; posted job → bid (price, warranty, est. time) → booking; direct booking from a service category → garage confirms the owner's slot, proposes another time or declines within 2 h → booking (doorstep: garage goes to the owner; otherwise the owner is sent the garage's location and phone); garage profile = the `GarageCard` owners see. Today each app simulates the other side: the user app's `BidsContext` invents garage bids and `SOSFlowScreen` animates acceptance/tracking; the garage app's `GarageContext` invents owner SOS requests and posted jobs, accepts quotes, confirms repairs and decides bids (a bid wins when it is ≤ 1.05 × `marketPrice`). Keep the two simulations consistent when changing either flow. Real cross-app behaviour needs a backend; the types in `packages/shared/src/types.ts` are meant to be that contract.

**Spare parts rule:** a garage orders parts for a booked job from nearby parts shops (Parts tab, `PartsContext`; contract types `PartsRequest` / `PartQuote` / `PartsOrder` in `packages/shared/src/types.ts`). Shops may only quote the part type the owner chose; when the owner chose Genuine and none is available, Recon needs the owner's approval first. Parts are billed to the owner separately from the garage's labour (`Booking.partsCost`). In the garage app `PartsContext` simulates the shops (`constants/parts.ts`); `apps/parts` (the shop side, `ShopContext`) uses the same types. Keep the two simulations consistent: shop "Galle Auto Parts" (ps1) and garage "TOPCODE" appear in both.

**Technician rule:** garages assign SOS and workshop jobs to technicians (shared `TechAssignment` contract). A `TeamMember` with `hasApp` runs the SOS field steps in `apps/tech` and the garage's dispatch screen becomes a live view (`Dispatch.techMode`); a repair charge above the quote needs the manager (`priceApproval`); "take over manually" covers technicians without the app. A technician is checked in to one garage at a time and a break removes them from that garage's SOS capacity, so a freelancer is never counted twice. The owner's bill belongs to the garage; the technician earns the garage's per-job rate and nets cash collected against it. Keep the garage app's technician simulation (`runTechSim` in `GarageContext`) and `TechContext` consistent; "කසුන් ජයසිංහ" (TEAM m2) is the technician app's user.

**SOS money rule:** the SOS fee is the technician's *call-out fee* (OnGarage-approved travel compensation, LKR 500 + 250 per radius expansion). It is paid to the technician even when no repair is needed. It is never a platform fee. Final bill = call-out fee + repair charge settled after inspection (may be 0). Keep wording and maths consistent in both apps (`calloutFee` in the garage app, `BASE_FEE`/`SURCHARGE_STEP` in the owner app's `SOSFlowScreen`).

**SOS capacity rule:** a garage may hold at most as many committed SOS jobs (stage past `quote`) as mechanics marked present today and not on a break, so it never takes a job another garage could serve. Attendance must be confirmed each day before any SOS can be opened. The check runs in `openDispatch` and again in `sendQuote` (`computeCrew` / `sosBlockReason` in `GarageContext`). A mechanic on a job can't be marked absent or removed, and present count can't drop below committed jobs. Jobs run in parallel; a mechanic can go on their own vehicle (`vanId: 'own'`) when the vans are out.

## Commands (run from the repo root)

```bash
npm install            # installs every workspace
npm run user           # Expo dev server for the owner app   (npm run user:web for web)
npm run garage         # Expo dev server for the garage app  (npm run garage:web)
npm run parts          # Expo dev server for the parts app   (npm run parts:web)
npm run tech           # Expo dev server for the technician app (npm run tech:web)
npm run typecheck      # tsc --noEmit in every workspace
```

Run the apps at once on different ports, e.g. `npm run start -w @ongarage/user -- --port 8083`, `npm run start -w @ongarage/garage -- --port 8084`, `npm run start -w @ongarage/parts -- --port 8085` and `npm run start -w @ongarage/tech -- --port 8086`. Add a dependency to one app with `npm install <pkg> -w @ongarage/user` (keep versions identical across apps so React/React Native are hoisted once). Clear Metro's cache with `-- --clear` after moving files between packages.

## Rules that span the repo

- **Put code in `packages/shared` only if more than one app needs it.** Screens, mock data and app-specific stores stay in their app. Import shared code as `@ongarage/shared` (one barrel, `src/index.ts`); the package ships TypeScript source, Metro compiles it.
- **Theming**: never hardcode surface/text colours. Use `Colors.*` and wrap every `StyleSheet.create` in `themedStyles(() => …)` so it is rebuilt per theme. `Colors` is a proxy over the active palette; `ThemeProvider` switches it and re-renders the tree. Values that must read the palette outside a style factory (e.g. `glassStyle()`) are functions, not constants. Light/dark palettes live in `packages/shared/src/theme/colors.ts`. White text on fixed-colour gradients/pins is the intended exception.
- **UI language** is Sinhala (Noto Sans Sinhala via `FONTS`); English only for proper nouns and category names.
- **Google Maps**: each app reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from its own `.env` (git-ignored; see `.env.example`). Maps render as Static Maps images with overlays projected by `projectToMap`; the Google Cloud project currently has billing disabled, so maps fall back to a dot grid.
