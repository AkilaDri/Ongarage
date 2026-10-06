# OnGarage Technician: field technician app

The app mechanics and electricians carry on the job. It covers garage employees and freelancers who work for several garages. The garage's manager assigns the work in the garage app; the technician runs the field steps on their own phone, and the garage follows them live. It's part of the [OnGarage monorepo](../../README.md); setup, `.env` and run commands are there.

```bash
# from the repository root
npm run tech        # dev server
npm run tech:web    # in the browser
```

## Screens

| Tab | File | Purpose |
|---|---|---|
| Jobs | `src/screens/JobsScreen.tsx` | Duty state; SOS offers with an accept countdown; the SOS job in progress; workshop job cards from every linked garage (swipe or tap for `WorkshopJobSheet`: photos, voice notes, parts status, then the shared workshop steps — receive with photos, diagnosis, handover once ordered parts arrive, close with the owner's code, extra work for the owner to approve — and notes); parts pickups (`CollectTaskSheet`: the shop, directions, the pickup code, collected → handed to the garage); today's finished jobs |
| (modal) | `src/screens/SOSJobScreen.tsx` | The SOS field steps: on the way (map, live location, directions) → arrived → inspection → manager approval when the repair charge exceeds the quote → checklist → owner confirms → QR or 6-digit code → collect payment → done |
| Garages | `src/screens/GaragesScreen.tsx` | Invitations; joining with a garage's code; each garage's terms (employee / freelance, per-job rates, jobs done) and check-in; your own code for garages to invite you |
| Earnings | `src/screens/EarningsScreen.tsx` | Pay for today, 7 and 30 days; the account with each garage (pay owed vs. cash collected for it) and settling it; job history with owners' ratings |
| Me | `src/screens/ProfileScreen.tsx` | Profile, verification, your level on the shared ladder (what garages see, and what's missing for the next), skills, owners' ratings, theme |

The header pill shows duty state (on duty / on break / off) and opens `DutySheet`: check in, take a break, check out.

## Rules

- **One garage at a time.** A technician is checked in to one garage. Only that garage sends SOS jobs and counts them towards its SOS capacity, so a freelancer is never counted twice. You can't switch garages or check out with an SOS job or a workshop job in progress.
- **Breaks.** On a break, no SOS jobs come in, and the garage's capacity drops by one. A break can't start during an SOS job.
- **Offers.** SOS offers must be accepted within 90 seconds or they go to someone else. Freelance workshop jobs can be accepted or declined with a reason. Workshop jobs start only while checked in at that garage.
- **Price changes.** A final repair charge above the garage's quote goes to the manager first. The owner sees only the approved amount; if the manager keeps the estimate, that's the charge.
- **Closing.** Scan the owner's QR, or type the 6-digit code they read out if the QR can't be scanned.
- **Money.**
  - The owner's bill (call-out fee + repair) belongs to the garage.
  - The technician earns the garage's per-job rate.
  - Cash collected on site is held for the garage, and the Earnings tab nets it against the pay owed. Settling happens outside the app.
- **Freelancers** work through garages, not directly for vehicle owners. Owners rate the technician as well as the garage.

## Contract and simulation

- **Contract.** The shared `TechAssignment` (plus `GarageRef`, `TechRates`, `TechSOSStage`…) in `packages/shared/src/types.ts` is what a garage sends a technician. `src/types.ts` holds the technician-side views.
- **Simulation.** `src/context/TechContext.tsx` simulates the garages until there is a backend:
  - an SOS offer arrives about 8 seconds after checking in somewhere (one per garage per session);
  - the manager approves up to 1.6× the quote;
  - the owner confirms the repair and rates the technician.
- **Same people as the other apps.** The technician is "කසුන් ජයසිංහ", the garage app's `TEAM` member `m2` with `hasApp`. TOPCODE is his employer, Southern Auto Care uses him as a freelancer, and Matara Road Motors has invited him. His workshop cards are the garage app's bookings `b1` and `b2`.
- **The garage's side.** In the garage app, assigning a technician who has the app turns the dispatch screen into a live view that the garage app simulates. The manager approves or rejects a higher price, and can "take over manually" for technicians without the app.

## Layout

```
src/
  app/          Expo Router entry (the layout renders App.tsx)
  App.tsx       Fonts, theme fade, header, tab bar, full-screen SOS job
  components/   Header + duty sheet, toast/sheet wrappers, workshop job card sheet
  constants/    Mock technician, garages, links, invites, jobs, earnings, reviews; timings; tab icons
  context/      TechContext: duty, jobs, earnings and the simulated garages
  screens/      One file per tab + the SOS job screen
  types.ts      Technician-side views of the shared TechAssignment contract
  utils/        Formatting (re-exported from @ongarage/shared)
```
