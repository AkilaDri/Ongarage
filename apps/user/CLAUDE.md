# CLAUDE.md — apps/user (vehicle-owner app)

See the root `CLAUDE.md` for monorepo commands and repo-wide rules (shared package, theming, Sinhala UI, maps key).

## Architecture

- `src/app/_layout.tsx` renders `src/App.tsx`; there is no router navigation. `App.tsx` owns the tab state (`BottomNav`: home / bids / activity / profile) and opens full-screen flows as `<Modal>`s: SOS (`SOSMapPickerScreen` → `SOSFlowScreen`), post a job (`PostJobScreen`), category browse (`ServiceBrowseScreen`). The remaining files under `src/app`, `src/components/*-*.tsx`, `src/hooks` and `src/constants/theme.ts` are unused Expo template leftovers.
- Provider order (outer → inner): `ThemeProvider` → `VehiclesProvider` → `AppShell` → `LocationProvider` → `BidsProvider`. `AppShell` reads the theme so a switch re-renders everything without remounting.
- Stores in `src/context`: `LocationContext` (expo-location GPS + reverse geocode), `VehiclesContext` (seed vehicles + user-added ones persisted in AsyncStorage), `BidsContext` (posted jobs; simulates garages bidding 6/14/24 s after a post).
- `SOSFlowScreen` is the 11-step SOS loop (confirm → consent → searching with radius/surcharge growth → bids → accepted → tracking → arrived → repairing → completion notice → QR scan → rating). `consent` and `repairCompleteNotice` render as overlays on the previous step.
- `ServiceBrowseScreen` has a three-state bottom sheet (peek / collapsed / expanded) driven by a PanResponder; interrupted gestures must still `settle()`, and the peek height is measured from the "Top Rated" row.
- Mock data lives in `src/constants/mockData.ts`; the service categories come from `@ongarage/shared` (`SERVICE_CATEGORIES`).
