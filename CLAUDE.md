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
                prices), SOS breakdown types, vehicle types, formatting (money, ago, countdown…),
                CloseCode / StepProgress / PhotoStrip, marketplace rules (src/marketplace: trust
                score, levels, fair-share intake, subscription plans, guarantee, closing codes) and
                the AI decisions layer (src/ai)
```

The garage app is the counterpart of every user-app flow: SOS request → accept/quote → assign mechanic + live location → arrived → repairing → complete → scan the owner's QR; posted job → bid (price, warranty, est. time) → booking; direct booking from a service category → garage confirms the owner's slot, proposes another time or declines within 2 h → booking (doorstep: garage goes to the owner; otherwise the owner is sent the garage's location and phone); garage profile = the `GarageCard` owners see. Today each app simulates the other side: the user app's `BidsContext` invents garage bids and `SOSFlowScreen` animates acceptance/tracking; the garage app's `GarageContext` invents owner SOS requests and posted jobs, accepts quotes, confirms repairs and decides bids (a bid wins when it is ≤ 1.05 × `marketPrice`). Keep the two simulations consistent when changing either flow. Real cross-app behaviour needs a backend; the types in `packages/shared/src/types.ts` are meant to be that contract.

**Spare parts rule:** a garage orders parts for a booked job from nearby parts shops (Parts tab, `PartsContext`; contract types `PartsRequest` / `PartQuote` / `PartsOrder` in `packages/shared/src/types.ts`). Shops may only quote the part type the owner chose; when the owner chose Genuine and none is available, Recon needs the owner's approval first. Parts are billed to the owner separately from the garage's labour (`Booking.partsCost`). **When:** for a workshop job, parts are ordered only for lines the owner approved (diagnosis or extra work), or before the diagnosis only for parts the owner named in their post (AI `classifyJob` → `partsMentioned`); `PartsContext.toOrderFor` gives exactly those lines, the request records them in `forLineIds`, and handover is blocked while approved parts are unordered or undelivered. **Pickup:** every quote may carry `pickup` (counter collection, parts price only); the garage chooses delivery or pickup and who collects (the garage, or a team member — one with the technician app gets a `PartsCollectTask`). A pickup order goes confirming → ready (held at the counter with a 6-digit `pickupCode`, QR payload `pickupCodePayload`) → collected; the shop checks the code with the shared `CloseJobSheet` before handing over. In the garage app `PartsContext` simulates the shops (`constants/parts.ts`); `apps/parts` (the shop side, `ShopContext`) uses the same types. Keep the two simulations consistent: shop "Galle Auto Parts" (ps1) and garage "TOPCODE" appear in both; TOPCODE's brake-pad order is collected from the counter by its technician "කසුන් ජයසිංහ" in the parts app and the technician app.

**Technician rule:** garages assign SOS and workshop jobs to technicians (shared `TechAssignment` contract). A `TeamMember` with `hasApp` runs the SOS field steps in `apps/tech` and the garage's dispatch screen becomes a live view (`Dispatch.techMode`); a repair charge above the quote needs the manager (`priceApproval`); "take over manually" covers technicians without the app. A technician is checked in to one garage at a time and a break removes them from that garage's SOS capacity, so a freelancer is never counted twice. The owner's bill belongs to the garage; the technician earns the garage's per-job rate and nets cash collected against it. Keep the garage app's technician simulation (`runTechSim` in `GarageContext`) and `TechContext` consistent; "කසුන් ජයසිංහ" (TEAM m2) is the technician app's user.

**Workshop job rule:** every booked repair (won bid or confirmed direct booking) follows the shared `WorkshopProgress` (`packages/shared/src/marketplace/workshop.ts`): booked → vehicle received with condition photos → diagnosis report (findings, photos, part and labour lines) → the owner approves all, some or none of the lines → repairing → ready for handover (checklist, before/after photos, old parts kept, bill) → closed only with the owner's QR or 6-digit code (`CloseCode` / `CloseJobSheet`) → warranty. Parts are ordered only for approved lines; the garage's Parts line appears once approved lines need ordering. Work found mid-repair goes to the owner as an `ExtraWorkRequest` (`DiagnosisSheet` with `extra`); the owner approves it line by line (`decideExtra` in the owner app) and handover waits until they answer (`pendingExtra`). Technician diagnoses go straight to the owner — no manager review (most Sri Lankan workshops have no separate manager). Labour (agreed price + approved labour lines) and parts are billed separately (`workshopBill`). Stopping at the diagnosis costs only `INSPECTION_FEE`. A problem at handover goes to the garage for rework first, then can be escalated to OnGarage; a warranty claim is answered by the garage. The four sheets (`CheckInSheet`, `DiagnosisSheet`, `HandoverSheet`, `CloseJobSheet`) are shared by the garage app (`BookingActions`, `WorkshopPanel`) and the technician app (`WorkshopJobSheet`); the owner side is `WorkshopContext` + `components/workshop` in `apps/user`. Each app simulates the others (owner approves every line after a few seconds in the garage and technician apps; the battery booking comes back once with a problem in the garage app; the owner app simulates the garage receiving, diagnosing, asking for extra work once on the seeded brake job, reworking and scanning). Part prices come from the shared `partMarketPrice` table that the garage, technician and parts shop apps all use.

**AI decisions layer:** every "smart" suggestion (job → category/urgency/parts, SOS note → breakdown, off-app payment or contact detection, complaint triage, diagnosis note → parts, review/ad moderation) goes through `getAi()` from `@ongarage/shared` and returns `{ value, confidence, source, evidence }`. Today it is the keyword `rulesProvider` (Sinhala, Singlish and English words in `src/ai/vocabulary.ts`; English words match whole words only); later the back end installs a Claude- or Laya-backed provider with `setAiProvider()`. Never call a model from an app directly, never show a suggestion below `SUGGEST_MIN_CONFIDENCE`, and treat answers as suggestions a person confirms.

**Ratings and levels (owner side):** only jobs closed with the owner's code can be rated; owners rate the garage on the four `RATING_DIMENSIONS` (they feed the trust score) and the technician separately, and the garage can reply publicly (`GarageReview`). Garages carry a `level` (`LevelBadge`) on cards and bids. Recon for a Genuine request is the owner's decision (`ReconRequest` on `WorkshopProgress`); handover waits while one is pending (`pendingRecon`).

**Marketplace rules** live in `packages/shared/src/marketplace` so every app computes trust scores, levels, intake limits, plans and guarantee splits the same way; change them there, not in an app.

**SOS money rule:** the SOS fee is the technician's *call-out fee* (OnGarage-approved travel compensation, LKR 500 + 250 per radius expansion). It is paid to the technician even when no repair is needed. It is never a platform fee. Final bill = call-out fee + repair charge settled after inspection (may be 0). Keep wording and maths consistent in both apps (`calloutFee` in the garage app, `BASE_FEE`/`SURCHARGE_STEP` in the owner app's `SOSFlowScreen`).

**SOS capacity rule:** a garage may hold at most as many committed SOS jobs (stage past `quote`) as mechanics marked present today and not on a break, so it never takes a job another garage could serve. Attendance must be confirmed each day before any SOS can be opened. The check runs in `openDispatch` and again in `sendQuote` (`computeCrew` / `sosBlockReason` in `GarageContext`). A mechanic on a job can't be marked absent or removed, and present count can't drop below committed jobs. Jobs run in parallel; a mechanic can go on their own vehicle (`vanId: 'own'`) when the vans are out.

## Commands (run from the repo root)

```bash
npm install            # installs every workspace
npm run user           # owner app dev server,      port 8091 (npm run user:web for web)
npm run garage         # garage app dev server,     port 8092 (npm run garage:web)
npm run parts          # parts shop app dev server, port 8093 (npm run parts:web)
npm run tech           # technician app dev server, port 8094 (npm run tech:web)
npm run typecheck      # tsc --noEmit in every workspace
```

Each app's port is fixed in its `package.json` scripts (owner 8091, garage 8092, parts 8093, technician 8094), so all four run at once with no extra flags; keep those ports unique when adding an app. Add a dependency to one app with `npm install <pkg> -w @ongarage/user` (keep versions identical across apps so React/React Native are hoisted once). Clear Metro's cache with `-- --clear` after moving files between packages.

## Rules that span the repo

- **Put code in `packages/shared` only if more than one app needs it.** Screens, mock data and app-specific stores stay in their app. Import shared code as `@ongarage/shared` (one barrel, `src/index.ts`); the package ships TypeScript source, Metro compiles it.
- **Theming**: never hardcode surface/text colours. Use `Colors.*` and wrap every `StyleSheet.create` in `themedStyles(() => …)` so it is rebuilt per theme. `Colors` is a proxy over the active palette; `ThemeProvider` switches it and re-renders the tree. Values that must read the palette outside a style factory (e.g. `glassStyle()`) are functions, not constants. Light/dark palettes live in `packages/shared/src/theme/colors.ts`. White text on fixed-colour gradients/pins is the intended exception.
- **UI language** is Sinhala (Noto Sans Sinhala via `FONTS`); English only for proper nouns and category names.
- **Google Maps**: each app reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from its own `.env` (git-ignored; see `.env.example`). Maps render as Static Maps images with overlays projected by `projectToMap`; the Google Cloud project currently has billing disabled, so maps fall back to a dot grid.
