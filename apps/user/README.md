# OnGarage: vehicle-owner app

The app vehicle owners use to get roadside help, collect repair bids and find garages. It's part of the [OnGarage monorepo](../../README.md); setup, the `.env` and the run commands are described there.

```bash
# from the repository root
npm run user        # dev server (a / i / w, or scan with Expo Go)
npm run user:web    # in the browser
```

## Screens

| Screen | File | Purpose |
|---|---|---|
| Home | `src/screens/HomeScreen.tsx` | SOS banner, posting a repair job, service categories as round photos in two sideways rows, ad banners, offer tiles, and garage rows (featured ads, newly joined, popular, nearest) of photo tiles that open the garage with Call / Book (`components/home`, content in `constants/home.ts`) |
| SOS location | `src/screens/SOSMapPickerScreen.tsx` | Pick the breakdown spot: GPS, tap on map, place search |
| SOS flow | `src/screens/SOSFlowScreen.tsx` | The 11-step SOS loop, from confirmation to rating |
| Post a job | `src/screens/PostJobScreen.tsx` | Job form with OnGarage Buddy diagnosis and the bid timer |
| My Bids | `src/screens/BidsScreen.tsx` | Received / Pending / Expired bids, accepting and republishing |
| Category browse | `src/screens/ServiceBrowseScreen.tsx` | Map plus a three-position sheet of garage cards |
| Activity | `src/screens/ActivityScreen.tsx` | Direct bookings and accepted bids as workshop jobs (`components/workshop/WorkshopTracker`: approve the diagnosis and extra work, allow Recon, collect with your code, report a problem, rate, receipt, warranty and OnGarage Guarantee claims); completed services from closed job records |
| Profile | `src/screens/ProfileScreen.tsx` | Account, vehicles, adding a vehicle, light/dark switch |

## How it fits together

- `src/App.tsx` holds the bottom-tab state and opens the SOS, post-job and category flows as full-screen modals. There is no stack navigation.
- Data stores live in `src/context`: `NoticeContext` (toasts), `LocationContext` (GPS and address), `VehiclesContext` (your vehicles; added ones are saved on the device), `BidsContext` (posted jobs and the simulated garage bids), `BookingsContext` (direct bookings) and `WorkshopContext` (every booked repair's workshop steps, ratings, receipts, warranty and Guarantee claims).
- Mock data lives in `src/constants/mockData.ts`. The theme, UI kit, types, maps helpers and service categories come from `@ongarage/shared`.

Garage behaviour is simulated until there's a backend: bids arrive a few seconds after a job is posted, garages answer direct bookings, run the workshop steps (receive, diagnose, ask for extra work or Recon, repair, hand over, rework, scan your code), reply to reviews and answer claims; SOS acceptance and tracking are animated. Browser tests for these flows are in `e2e/specs/2*-owner-*.cjs`.
