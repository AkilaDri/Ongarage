# Handover: continuing OnGarage on another laptop

Written 2026-10-08 at commit `5b86fc8` on branch `feature/marketplace-apps`. It supersedes `docs/HANDOFF.md`, which only covers the earlier owner-app redesign. Read `CLAUDE.md` (repo rules) and `apps/user/CLAUDE.md` after this.

## 1. Moving the folder

Easiest: on the new laptop run `git clone https://github.com/AkilaDri/Ongarage.git`, then `git checkout feature/marketplace-apps`. Everything below that is "git-ignored" still has to be copied by hand.

If you copy the folder from the portable drive instead:

1. Delete `node_modules` (root and any inside `apps/*`), then run `npm install` at the repo root. One `node_modules` and one `package-lock.json` live at the root.
2. Copy these git-ignored files by hand (they are not in the repo):
   - `apps/user/.env`, `apps/garage/.env`, `apps/parts/.env`, `apps/tech/.env` (each holds `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; see the `.env.example` files)
   - `apps/user/Google Map Full API Key.txt`
   Never commit these. (The Google Cloud project has billing off, so maps fall back to a dot grid anyway.)
3. Check `git status`: nothing should be modified except what you changed after the last push.
4. For browser tests, install Chrome or Edge (or set `ONGARAGE_BROWSER` to its path).

Use the same Node version as the old laptop (`node -v` there). Expo SDK 57, React Native 0.86, React 19.2.

## 2. Commands (from the repo root)

```bash
npm install
npm run user      # owner app,      port 8091   (also: user:web)
npm run garage    # garage app,     port 8092
npm run parts     # OnMart Shop,    port 8093
npm run tech      # technician app, port 8094
npm run typecheck # tsc in every workspace (there is no linter)
npm test          # unit tests in packages/shared/test
npm run e2e       # browser tests; needs all four dev servers running
npm run e2e -- 32-owner   # only specs whose file name contains this
```

Clear Metro's cache with `-- --clear` after moving files between packages. Installing packages can stop a running Metro server; restart it before running e2e.

## 3. Where the project stands

**Pushed:** everything up to `5b86fc8` (the OnMart marketplace and the owner OnMart landing page). Nothing is uncommitted except this file and `docs/CLAUDE_MEMORY_EXPORT.md` (check `git status`).

**Verification at `5b86fc8`:**
- `npm run typecheck`: clean in every workspace.
- `npm test`: 71 of 71 pass.
- Browser specs passing: `32-owner-mart` (16 checks), `31-parts-customers` (11), `33-parts-promotions` (7).
- **Failing: `13-garage-onmart`, 3 of 7 checks.** The booking card does not show the "customer-bought parts" line in time ("the card tracks the customer-bought part", "the garage is told the customer bought it"), and the spec cannot find the button labelled `Customer-bought parts`. Start by checking that `PartsStatusLine` renders `ownerLine` for that booking after the simulated owner approval (garage `PartsContext`, about 6 s) and the simulated purchase (`OWNER_BUY_MS`, 14 s), and that the spec's waits match.
- **Not run yet:** the older specs (`01-smoke`, `10`–`12` garage, `20`–`24` owner, `30-parts-pickup`, `40-tech`). They may need small fixes after the tab renames, the owner Account layout change (vehicle panel), and the parts app header and tab changes.
- Dark mode of everything built in this session has not been looked at in a browser.

## 4. What was built (a map)

**Garage / parts / owner UI refinements:** English two-tone tab bars in all four apps; garage Profile tab (hero + dashboard tiles, sticky); title bands (`TitleBand` in shared); sticky bars with a soft edge (`PinnedEdge` / `usePinnedEdge` in shared); owner header with location and animated weather icon; owner Account tab shows the active vehicle's details (registration, chassis, engine, make, model, colour, insurance) and a compact vehicle picker; the parts app's Requests tab opens with the greeting header.

**OnMart, the spare-parts marketplace** (rules in `CLAUDE.md` under "OnMart rule"):

| Area | Where |
|---|---|
| Types (backend contract) | `packages/shared/src/types.ts` (OnMart section at the end) |
| Ranking, search ladder, fitment, price tags, part names | `packages/shared/src/marketplace/partsMart.ts` |
| Referral ledger and monthly statements | `packages/shared/src/marketplace/referral.ts` |
| Deals, shop rows, free delivery | `packages/shared/src/marketplace/deals.ts` |
| Shop directory, published stock, trade agreements | `packages/shared/src/constants/martShops.ts` |
| Service kits | `packages/shared/src/constants/serviceKits.ts` |
| Banners, offers, deals, part strip fixtures | `packages/shared/src/constants/martPromos.ts` |
| Owner app: OnMart tab | `apps/user/src/screens/MartScreen.tsx`, `context/MartContext.tsx`, `components/mart/*` |
| Garage app: OnMart tab (Mart / Job parts / Referrals) | `apps/garage/src/screens/OnMartScreen.tsx`, `GarageMartView`, `GarageReferralsView`, `context/PartsContext.tsx` |
| Parts app: back office | `apps/parts/src/context/ShopContext.tsx`, `screens/RequestsScreen`, `OrdersScreen`, `StockScreen`, `ShopProfileScreen`, `components/OfferSheet`, `VerifyPurchaseSheet`, `ReferralsSheet`, `DealSheet`, `PromoSheet` |
| "Customer buys it" diagnosis line | shared `DiagnosisSheet` + `ShopRecommender`; handover gate in garage `BookingActions`; owner `WorkshopContext.markPartBought` |

Simulations to keep consistent: the owner app plays the shops, the parts app plays customers / the open wall / buyers, the garage app plays the owner buying a recommended part after approval.

**Demo scenario:** TOPCODE's seeded brake job asks the owner to buy two brake discs; recommended shops Galle Auto Parts (ps1) and Karapitiya Recon Centre (ps3).

## 5. Not built / open decisions

- Not built: the garage's technician collecting an owner-bought part; shops following part keywords; saved searches for owners; real shop photos (covers are colour gradients with initials); a backend (deals, banners and free delivery set in the parts app stay local to it).
- Money: nothing is paid in the apps. Commission settlement and ad fees happen outside the app until the legal check. The admin app is planned for disputes.
- Shop covers and category art: Home's art is bundled in `apps/user/assets/home`.

## 6. How the user likes to work

- Plan and decisions first, then numbered steps; after each step a short report; the user says "start step N".
- Commit and push only when asked. Never commit `.env` files or keys.
- During the OnMart build the user asked for changes only, with no type check, tests or browser checks until they ask. They have now asked for verification, so run it in this order: typecheck, `npm test`, then `npm run e2e`, fixing what breaks.
- UI language is Sinhala, English only for proper nouns and tab names. Never use `Alert.alert`; use `notify()` or a real flow. Keep the user's own spellings of copy.
- Technician diagnoses go straight to the owner (no manager review). The SOS fee is the technician's call-out fee, not a platform fee.

## 7. Gotchas

- When writing files from a shell, apostrophes and backticks inside long heredocs broke the command several times. Use the editor tools or a script file instead.
- The floating tab bar needs a higher `zIndex` than the Home sheet; draggable surfaces need `userSelect: 'none'` on web.
- `packages/shared/test/run.cjs` only compiles pure-logic folders (`types`, `utils`, `constants`, `ai`, `marketplace`), so code there must not import React Native (that is why `distanceKm` lives in `utils/geo.ts`).
- Claude Code's own memory is stored per project folder path under `~/.claude/projects/<folder-slug>/memory`. A different path on the new laptop means a different slug and an empty memory; see `docs/CLAUDE_MEMORY_EXPORT.md`.
