# UX/UI principle usage log

This is the working memory of [ui-ux-principles](SKILL.md). Add one entry per refinement (see SKILL.md section 0, step 3). Newest entries first. Keep each entry to a few lines.

Entry format:

```
## YYYY-MM-DD · screen · short description
- Principles used: C-numbers first, then fallback numbers (UX/UPD/Typography).
- Core missing: none, or the case the core set did not cover and what was used instead.
- Outcome: what changed, and whether the user accepted it.
```

## Entries

## 2026-11-10 · Towing step 2 (route) · placing feedback
- Principles used: C2 (removed the "දැන් සකසන්නේ" chip: the pin label and the highlighted row already say which place is set), C8 and UPD 087 (spinner only after 1 s, not on every move), C4 (the pin label names the place being set), C7 (names wrap onto two lines), coordinates never shown as text.
- Core missing: none.
- Outcome: user agreed with the proposed changes.

## 2026-11-10 · Towing step 5 · arrival as SOS, owner waits for operator
- Principles used: C4 (the arrival card says the truck is here and that the owner is waiting for its confirmation), C11 (the ETA and distance drop away at arrival, as on SOS), C12 (the flow ends on a clear confirmation).
- Core missing: none.
- Outcome: user asked for the SOS arrival pattern, with the operator confirming arrival and the owner waiting.

## 2026-11-10 · Towing step 4→5 · send hands over to a tracking screen with notices
- Principles used: C11 (send moves to the next window at once, so the step is clear), C4 (each truck event arrives as a notice, newest first: accepted, arrived, moving), C8 (notices are a quiet list, not modals), C9 (no cancel once accepted, as before).
- Core missing: none.
- Outcome: user asked for the transition on send and the acceptance and arrival notices in the tracking window.

## 2026-11-10 · Towing step 5 · tracking matched to SOS tracking
- Principles used: C11 (step pill "5/6" and six progress segments, as on SOS), C4 (the pill names the stage; the banner says the truck accepted; the stage blocks say what to confirm), C1 (call button on the truck card), C12 (ends on the drop, not on an open question), C2 (the SOS verified-operator chip is left out: the app does not hold that fact for towing operators).
- Core missing: none.
- Outcome: user asked for the SOS accepted and arrival confirmation pattern and the step count.

## 2026-11-10 · Towing step 4 · search screen matched to SOS search
- Principles used: C5 (same three stat tiles, the nearby list always visible under a section label, as on SOS search), C2 (the SOS emergency-number pill is left out because a tow is not an emergency), C3 (the non-quoted trucks are listed once; quoted ones stay in the cards above).
- Core missing: none.
- Outcome: user asked for the towing search screen to match the SOS search screen.

## 2026-11-10 · Towing step 4 · confirm waits for the truck to accept (SOS pattern)
- Principles used: C4 (after confirm the bar says the request is with the truck, then names the truck that accepted), C9 (no cancel fee before acceptance; the screen does not warn), C11 (the owner stays on the same screen through the steps, as in SOS), C1 (other quotes are locked while the request is out).
- Core missing: none.
- Outcome: user asked for the SOS-style acceptance step. Tow tracking screen not yet restyled to the SOS card.

## 2026-11-10 · Towing step 2 + 4 · site condition named before quotes
- Principles used: UX 35 and C3 (site tags as tap chips, not free text), C10 (labour for mud and rock sites is priced into the quote and shown as its own line), C2 (chips sit in the route card; no new step), C1 (trucks that cannot do the site show "මෙම වැඩට නොහැක" rather than vanishing silently).
- Core missing: approval of extra work found on site (C8/C9 cover it, but the workshop approval pattern is not yet built here).
- Outcome: user asked for the recommendation to be built. Garage-app tow interface not yet built.

## 2026-11-10 · Towing step 4 (bids) · profile access without a text link
- Principles used: C1 (the truck disc and a chevron after the name show the card opens something, with no words needed; UPD 005 affordance, UX 82 icons), C3 (the same profile is reachable from the disc, the name, the map pin and the nearby row), C6 (the price button still chooses the truck, so the two actions stay apart).
- Core missing: none.
- Outcome: user asked to drop the written link and still let owners open a profile from the card.

## 2026-11-10 · Towing step 4 (bids) · review of the quote screen
- Principles used: C7 (the cheapest tag moved above the name, so names wrap in full), C3 (quoted trucks show their price on the map pin), C2 (the bottom bar keeps only the price; the name is on the card), C10 (the commitment rule under the list, in the empty space), C3 (the nearby toggle says how many trucks have quoted), C4 (card distance is the same straight-line measure the search circle uses).
- Core missing: none.
- Outcome: user asked for all the suggested changes.

## 2026-11-10 · Towing step 4 (bids) · profile from quoted trucks
- Principles used: C1 (the name and a visible "ප්‍රොෆයිල් බලන්න" link show the profile is tappable), C3 (the quoted trucks reach the same profile as the nearby list and map pins), C6 (the rest of the card still chooses the truck).
- Core missing: none.
- Outcome: user asked that quoted trucks open their profile too, not only the expanded nearby list.

## 2026-11-10 · Towing step 4 (bids) · truck profile as a garage profile
- Principles used: C5 (the profile reuses the garage profile's layout: hero with status and close, name, rating, round action buttons, tabs, shared review cards), C11 (sheet over the search, flow kept), C10 (fees on the info tab before choosing), C6 (choose button only when the truck has quoted).
- Core missing: none.
- Outcome: user asked for the garage-profile window for tow operators. The garage's own sheet is tied to garage data, so a tow-specific sheet with the same parts was built.

## 2026-11-10 · Towing step 4 (bids) · empty slot state, nearby trucks, truck profile
- Principles used: C4 (one meaning per status: area, truck state, quoted; the empty card says the next step), C1 (rows show a chevron and are 56px tall), C11 (profile opens as a sheet over the search, flow state kept), C3 (map pins and rows link to the same truck), C7 (names wrap, not cut off), C2 (radar stops when the slot has no truck), C6 (main button "වේලාව වෙනස් කරන්න" when no truck is free at the time).
- Core missing: none.
- Outcome: user asked for the recommended order to be built. Open decision left for the user: whether the profile may request a truck outside the area.

## 2026-11-10 · Towing step 3 (timing) · places pinned, schedule grid, own cancel result
- Principles used: C11 (the two places stay in view while the time is chosen), C3 and UX 24 (3 days then "තවත්", hours in an even 3-per-row grid), C4 (the button names what is missing; tapping it scrolls to the schedule), C10 (the owner's own cancellation result once the day and hour are set), C1 (change buttons 44px in the pinned strip), C2 (map chip removed: one way to change places).
- Core missing: none.
- Outcome: user asked for the recommended changes; today and tomorrow kept as one-word labels, later days unchanged.

## 2026-11-09 · Towing step 3 (timing) · edit paths, Now/Schedule clarity, cancel note
- Principles used: C1 (visible change action on each place row, map chip), C3 (both choices and the helper line visible), C4 (helper line says what the next button does), C2 (duplicate "කවදාද?" removed from header; step name in pill), C10 (cancellation rule shown in the empty space), C13 (selected segment uses navy active pill; label size raised), C7 (label 13px, 44px hit area on row buttons).
- Core missing: none.
- Outcome: user asked for all six suggestions to be implemented.

## 2026-11-09 · Towing step 2 (route) · overview confirm
- Principles used: C5 (overview reuses the map and card pattern of the SOS picker), C1 (rows say "වෙනස් කරන්න").
- Core missing: none.
- Outcome: pickup label named "ඔබ සිටින තැන" (user reverted an earlier rename; the request was to revert, no new principle).

## 2026-11-09 · Towing step 4 (bids) · quote reveal, bid choice
- Principles used: C4 (status card says what the app is doing: searching, quotes found), C3 (every quote visible as a whole-card choice), C8 (widen-radius asked only in a modal after a wait), C6 (one filled "තෝරන්න" button on the cheapest quote, bottom bar holds the confirm).
- Core missing: none.
- Outcome: implemented earlier in the session.

## Review history

- 2026-11-09: core set created (C1–C13) from the refinements above. Nothing demoted yet. Next review due after 10 entries.
