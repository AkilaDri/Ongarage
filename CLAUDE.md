# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## OnGarage monorepo

Four Expo (SDK 57, React Native 0.86, React 19.2, TypeScript) apps that are the sides of one marketplace, plus the code they share. npm workspaces; one `node_modules` and one `package-lock.json` at the root.

```
apps/user       vehicle-owner app (SOS, post repair jobs, receive bids, direct bookings, workshop jobs, activity, OnMart parts marketplace, profile)
apps/garage     garage-owner app (SOS inbox + 10-step dispatch, job feed + bidding, schedule/workshop jobs, OnMart (marketplace, job parts, referrals), garage profile)
apps/parts      OnMart Shop, the parts shop's back office (garage requests + customer enquiries + open wall, orders + dispatch / counter pickup, stock, referrals, shop profile)
apps/tech       technician app (duty check-in, SOS field steps, workshop job cards, parts pickups, garages + rates, earnings)
packages/shared @ongarage/shared — types (the backend contract), theme engine + palettes, fonts, glass UI kit, line icons,
                BottomNav, Sheet, NoticeToast, SwipeCard, GarageCard, LevelBadge, CloseCode, workshop sheets, GoogleMap +
                maps helpers, service categories, formatting, marketplace rules (src/marketplace) and the AI decisions
                layer (src/ai); unit tests in test/
e2e/            browser tests for all four apps (specs/), run against the dev servers
```

There is no backend yet: every app runs on seed data and **simulates the other apps** (see below). The types in `packages/shared/src/types.ts` are meant to become the backend contract. Planned next: an admin app for OnGarage staff, then the backend, a Claude-backed AI provider, and Laya.

## Commands (run from the repo root)

```bash
npm install            # installs every workspace
npm run user           # owner app dev server,      port 8091 (npm run user:web for web)
npm run garage         # garage app dev server,     port 8092 (npm run garage:web)
npm run parts          # parts shop app dev server, port 8093 (npm run parts:web)
npm run tech           # technician app dev server, port 8094 (npm run tech:web)
npm run typecheck      # tsc --noEmit in every workspace (there is no linter; this is the check)
npm test                                        # unit tests: shared rules + AI layer
npm test -- workshop                            # only test files whose name contains "workshop"
npm test -- --test-name-pattern="grace period"  # only matching tests
npm run e2e            # browser tests against the four running dev servers
npm run e2e -- owner   # only specs whose file name contains "owner"
e2e needs all four dev servers running first; `node e2e/run.cjs` refuses to start otherwise.
Run one spec by file-name filter: `node e2e/run.cjs owner-home`.
```

Each app's port is fixed in its `package.json` scripts, so all four run at once with no extra flags; keep ports unique when adding an app. Add a dependency to one app with `npm install <pkg> -w @ongarage/user` (keep versions identical across apps so React/React Native are hoisted once). Clear Metro's cache with `-- --clear` after moving files between packages. Platforms: the repo is developed on both Linux and Windows. On Windows, Node sometimes segfaults (exit 139) at start-up, in `npm`, `tsc` and `expo start`: just run the command again (a `for` loop that retries `npx expo start --port <p>` works). On either OS, start the four dev servers one after another, not at the same time (started together they hang before Metro is up). Use forward slashes or quoted paths in shell commands so they work in both bash and PowerShell, and do not commit machine-specific files (`.env`, `.test-build/`, `e2e/shots/`). Installing packages can stop a running Metro server — restart it before `npm run e2e`.

## Tests

- **Unit tests** (`packages/shared/test/*.test.cjs`): `run.cjs` compiles the pure-logic modules (`types`, `utils`, `constants`, `ai`, `marketplace` — nothing that imports React Native) to `.test-build/` and runs them with `node --test`. Changing a marketplace rule or the AI vocabulary means updating these tests; a future Claude/Laya provider must pass `ai.test.cjs`.
- **Browser tests** (`e2e/specs/*.cjs`, helpers in `e2e/lib.cjs`): each spec is a flow in one app's web build, starting from the seed data, run with `puppeteer-core` against an installed Chrome/Edge (`ONGARAGE_BROWSER` to point at one); page errors and native alerts fail it. Specs click by `accessibilityLabel` (English, e.g. `"Order approved parts"`) or by visible Sinhala text, so keep labels stable and give new pressables a label. Check what stays on screen rather than toasts (a later notice can replace a toast). Timings follow the simulations' delays; if a simulated delay changes, adjust the spec's waits. Screenshots go to `e2e/shots/` (git-ignored). OnMart is covered by the `mart`, `referral`, `programme` and `kits` unit tests and the browser specs `13-garage-onmart`, `31-parts-customers` and `32-owner-mart`.
Some owner browser specs (`23-owner-home`, `25-owner-bar-fold`, and others) test layouts that have since changed.
A failure there can be a stale spec rather than a regression, so check the spec against the current screen before changing app code.

## Rules that span the repo

- The owner app's Home and vehicle design is in `docs/owner-vehicle-spine.md`. Read it before changing Home.
- **Owner Home fold** (`apps/user/src/App.tsx`): the banner row (repair card, SOS, towing) folds on scroll via `bannerFold` / `homeFold`; the folded bar shows the Quotes pill full width. The chat icon sits top-right on the unfolded Home and moves to the bottom-right corner once folded (where the SOS disc used to be). SOS shows only in the top banner on Home, not in the folded bar.

- **Put code in `packages/shared` only if more than one app needs it.** Screens, mock data and app-specific stores stay in their app. Import shared code as `@ongarage/shared` (one barrel, `src/index.ts`); the package ships TypeScript source, Metro compiles it.
- **Theming**: never hardcode surface/text colours. Use `Colors.*` and wrap every `StyleSheet.create` in `themedStyles(() => …)` so it is rebuilt per theme. `Colors` is a proxy over the active palette; `ThemeProvider` switches it and re-renders the tree. Values that must read the palette outside a style factory (e.g. `glassStyle()`) are functions, not constants. Light/dark palettes live in `packages/shared/src/theme/colors.ts`; the default theme is light (`let current` there), so review and screenshot designs in light, not dark. White text on fixed-colour gradients/pins is the intended exception.
- **Garage app home:** the Jobs tab is the first tab and the screen the app opens on (with the greeting `GarageHeader`); SOS is the second tab with a title band.
- **Shared UI behaviours:** the shared `Sheet` closes by swiping down (a `PanResponder` that only takes a downward drag while the body is scrolled to the top; on the web the handle / header and the photo carousel use `touchAction` so a phone browser does not steal the gesture; full-screen sheets are exempt). `BottomNav` items take `alert`: a flashing red emergency-light effect while the item has a badge (the garage SOS tab). `ChatIconButton` (`packages/shared/src/ui/chat/ChatSheet.tsx` area) takes `size`; the owner app's chat icon is `ChatHeaderButton` in `apps/user/src/components/ChatHeaderButton.tsx`. Every OnMart tab (owner, garage) opens on its Shops section: leaving it through the middle garage button resets the segment.
- **Look and feel** (all four apps, PickMe-inspired): soft surfaces, not outlines. Cards use `softCard()` (or `softEdge()` + `softShadow()`: a shadow on light, a faint outline only on dark), chips and secondary buttons `softFill()`, buttons are pills (`ActionButton` defaults to `pill`), icons sit on round discs (`GlassIcon`), active tab pills are `NAVY`. Each app's header is the sky-blue `headerBand()` with the tab's screen overlapping it on rounded corners; SOS flows put the map full-bleed on top with floating controls and the step in a rounded bottom sheet. These helpers live in `packages/shared/src/ui/Glass.tsx`.
- **UI language** is Sinhala (Noto Sans Sinhala via `FONTS`); English only for proper nouns and category names. Never use `Alert.alert` — tell the user with a toast (`notify()`) or a real flow.
- **Google Maps**: each app reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from its own `.env` (git-ignored; see `.env.example`). Maps render as Static Maps images with overlays projected by `projectToMap`; the Google Cloud project currently has billing disabled, so maps fall back to a dot grid.

- Marketplace flows and rules: `docs/marketplace.md`. Read it before changing a flow or a rule.
- App architecture (how each app is built): `docs/app-architecture.md`.
- Photos (camera and gallery): `docs/photos.md`. Use `pickPhotos(max)` for any photo.
