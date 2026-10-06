# CLAUDE.md — apps/user (vehicle-owner app)

See the root `CLAUDE.md` for monorepo commands and repo-wide rules (shared package, theming, Sinhala UI, maps key).

## Architecture

- `src/app/_layout.tsx` renders `src/App.tsx`; there is no router navigation (`src/app/index.tsx` returns null). `App.tsx` owns the tab state (`BottomNav`: home / bids / activity / profile), renders one `Header` above every tab (like the garage, parts and technician apps), and opens full-screen flows as `<Modal>`s: SOS (`SOSMapPickerScreen` → `SOSFlowScreen`), post a job (`PostJobScreen`), category browse (`ServiceBrowseScreen`). The direct-booking form (`DirectBookingSheet`) is opened from Home, a category's garage list, or "book again" in Activity.
- Provider order (outer → inner): `ThemeProvider` → `NoticeProvider` → `VehiclesProvider` → `BookingsProvider` → `AppShell` → `LocationProvider` → `BidsProvider`. `AppShell` reads the theme so a switch re-renders everything without remounting.
- Stores in `src/context`: `NoticeContext` (toasts; `Toast` and the `Sheet` wrapper show them, also inside each modal), `LocationContext` (expo-location GPS + reverse geocode), `VehiclesContext` (seed vehicles + user-added ones persisted in AsyncStorage), `BidsContext` (posted jobs; simulates garages bidding 6/14/24 s after a post), `BookingsContext` (direct bookings; simulates the garage answering in 5 s: confirms slots between 8:00 and 17:00, otherwise proposes the next 9:00, which the owner accepts or declines — the same rules as the garage app's direct requests).
- Owner-side types are in `src/types.ts` (`DirectBooking`); formatting comes from `src/utils/format.ts` (re-exported from `@ongarage/shared`). Never use `Alert.alert` — tell the owner with `notify()` or a real flow.
- Job cards (Bids) and booking cards (Activity) open `OwnerDetailView` by swiping sideways (shared `SwipeCard`) or tapping the header — the same cross-dissolve detail pattern as the garage app's `JobDetailView`. It follows the live record, so status changes show while it is open; Stage 2 extends it into the live workshop job page.
- Photos and voice notes on job posts and bookings use `MediaAttachments` (sample photos and a timed, silent recording until native camera / microphone access).
- `SOSFlowScreen` is the 11-step SOS loop (confirm → consent → searching with radius and call-out-fee growth → bids → accepted → tracking → arrived → repairing → completion notice → QR scan → rating). `consent` and `repairCompleteNotice` render as overlays on the previous step.
- `ServiceBrowseScreen` has a three-state bottom sheet (peek / collapsed / expanded) driven by a PanResponder; interrupted gestures must still `settle()`, and the peek height is measured from the "Top Rated" row.
- Mock data lives in `src/constants/mockData.ts`; the service categories come from `@ongarage/shared` (`SERVICE_CATEGORIES`).
