# App architecture

## How each app is built

- **No navigation library.** `src/app/_layout.tsx` (Expo Router) just renders `src/App.tsx`, which holds the bottom-tab state (`BottomNav` from shared, tabs in `src/constants/tabs.ts`) and opens full-screen flows as `<Modal>`s. Details views and forms are sheets (the shared `Sheet`) or cross-dissolve modals.
- **Stores are React contexts in `src/context`** (owner: `BidsContext`, `BookingsContext`, `WorkshopContext`, `NoticeContext`, …; garage: `GarageContext` + `PartsContext`; parts: `ShopContext`; tech: `TechContext`). They hold the seed data from `src/constants/mockData.ts` and simulate the other sides with timers: a `live` ref gives callbacks the latest state, `later(fn, ms)` schedules a simulated reply (cleared on unmount), and `notify()` shows a `NoticeToast`. Each app wraps the shared `Sheet` and `NoticeToast` in its own `components/Sheet.tsx` / `components/Toast.tsx` so toasts appear above open sheets and modals.
- **Seed data is shared by name across apps** so the simulations line up: the garage app is "TOPCODE Tuning & Service", the parts app is shop "Galle Auto Parts" (ps1), the technician app's user is "කසුන් ජයසිංහ" (garage `TEAM` m2). Refer to seeded entities by id, never by array position. `apps/user/CLAUDE.md` has owner-app specifics.

