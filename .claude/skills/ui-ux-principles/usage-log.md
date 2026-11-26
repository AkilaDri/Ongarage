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

## 2026-11-26 · Owner running job · inspection stage
- Principles used: C4 and UX 13 (expected time for a long wait), UPD 087 and C8 (calm card, notify only for changes), C15 (late only when the time has passed), C10 (fee stated before the report).
- Core missing: none.
- Outcome: approved. Not yet checked on a phone.

## 2026-11-26 · Owner running job · the bar waits for the owner's confirmation
- Principles used: UPD 116 mental model and C11 (the step number matches what the owner is being asked; it never jumps past a step they have not accepted).
- Core missing: none.
- Outcome: user reported confusion at 4/7. Not yet checked on a phone.

## 2026-11-26 · Owner handover question · a real process behind "no"
- Principles used: C4 and UPD 116 (the card says what happens next; progress goes back to step 1), C9 and UPD 074 (one question before sending, a way back, "handed over now"), C10 (free cancel stated), C5 (same box on card and chat).
- Core missing: none.
- Outcome: user approved with two reasons only, no police advice, 2 hours. Not yet checked on a phone.

## 2026-11-26 · Owner running job, step 6 · payment and cancellation wording
- Principles used: C10 (the claim names the amount and says the garage confirms), C4 (chosen date on its button; work shown as paused), UPD 029 (red only for lateness), UPD 074 (safe choice first, cancel with a fee second in soft red).
- Core missing: none.
- Outcome: approved; the six steps are done. Warranty claim to be revisited. Not yet checked on a phone.

## 2026-11-26 · Owner finished job card, step 5 · one next step
- Principles used: C2 and UPD 099 (pay, then rate; history only in details), C8 and UPD 087 (the garage's rating on the card only when a low one is unanswered), C5 (quiet foot row).
- Core missing: none.
- Outcome: approved. Not yet checked on a phone.

## 2026-11-26 · Owner running job, step 4 · one button style and readable text
- Principles used: C5 (FlowButton on the card and pop-ups), C7 (13px minimum, long labels wrap), UPD 029 (soft red only for a risky confirm).
- Core missing: none.
- Outcome: approved. Warranty pop-up left for later. Not yet checked on a phone.

## 2026-11-26 · Owner running job, step 3 · rare actions in the details view
- Principles used: C2 and UX 50 (rare actions off the card), C9 and UPD 069 (cancel away from confirm buttons, last and red), C7 (44px rows).
- Core missing: none.
- Outcome: approved. Not yet checked on a phone.

## 2026-11-26 · Owner running job, step 2 · collect and approval pop-ups
- Principles used: UPD 099 (unapproved handover items first), UPD 113 and UX 06 (buttons named in full), C10 (new total and finish time before opening; extra work's effect on current work stated).
- Core missing: none.
- Outcome: approved. Not yet checked on a phone.

## 2026-11-26 · Owner running job card, step 1 · the owner's turn
- Principles used: C4 and UPD 116 (one source, ownerNeed, drives the pill, the action box and the progress line), UPD 099 and C6 (the action sits above the progress bar), UPD 087 (nothing shown while waiting on others), C5 (Bids amber chip).
- Core missing: none.
- Outcome: user approved step 1 of 6. Buttons, text sizes, rare actions and pop-ups are later steps. Not yet checked on a phone.

## 2026-11-26 · Owner Bids and Activity headers · made the same
- Principles used: C5 and UPD 035 (one header on both), UPD 006 alignment (rows at the same height, wrapper padding removed), C13, C7 (32px icon boxes with extra hit area). Bids was the model.
- Core missing: none.
- Outcome: built; not yet measured in a browser.

## 2026-11-26 · Owner Bids map · floating header like the SOS map
- Principles used: C5 (SOS map's round button and pill; the Bids sort chips and colours), C2 and UPD 067 (the blue band steps aside so the map fills the page; a title and bid count instead of a search box), C1 (the chips now do something on the map: the first pin of the chosen order is picked out), framing round the owner and all pins.
- Core missing: none.
- Outcome: built as asked. Not yet checked on a phone.

## 2026-11-26 · Owner booking, tracking step · the rule box stays put
- Principles used: UPD 035 consistency of position and C5 (what does not change with the choice does not move), UPD 152 (the explanation stays next to the choice it explains). Space is reserved for the longer text instead of a fixed height.
- Core missing: none.
- Outcome: user asked for it. Not yet checked on a phone.

## 2026-11-26 · Owner Bids · next step in empty tabs
- Principles used: C14 and UX 15 (the empty state names the next step), UPD 087 and C2 (a post button only when nothing is waiting or received; a link to the other tab otherwise; none on Expired), C5 (Home's wording, the flow button), C10 ("free" by the button), Typography 60 (Pending title shortened).
- Core missing: none.
- Outcome: user approved. Not yet checked on a phone.

## 2026-11-26 · Owner completed job details · same hierarchy as the job details
- Principles used: UPD 099 (job and cost, then bill, cover, service record, review, history), C2 (the three-cell strip, the repeated garage row and the repeated receipt number removed), C5 (the same card, soft box, headings and money style), C13.
- Core missing: none.
- Outcome: built as asked. CompletedRecord's new order also shows in a session job's details. Direct booking details still old. Not yet checked on a phone.

## 2026-11-26 · Owner booking, soonest confirmation · one answer on screen
- Principles used: C2 and UPD 067 figure-ground (the day and time choices hide while the soonest slot waits for a yes, so two dates are never shown together), UPD 074 forgiveness (saying no brings the owner's choice back unchanged).
- Core missing: none.
- Outcome: user asked for it. Not yet checked on a phone.

## 2026-11-26 · Owner posted-job details · Activity card on top, decision first
- Principles used: UPD 099 inverted pyramid (job, time left, bids, then map and what was sent), C2 (the three-cell strip repeated the count and lowest price; empty photo and voice sections merged into one card), C5 (Bids-tab chip, count label, bid cards, FlowButton), C1 (other bids folded behind a visible link once one is chosen).
- Core missing: none.
- Outcome: built as asked. The direct-booking details view is unchanged. Not yet checked on a phone.

## 2026-11-26 · Owner Bids · empty tabs without a card
- Principles used: UPD 067 figure-ground and C2 (no card around nothing; the message alone, centred), C14 (the empty state says what is missing and when it appears).
- Core missing: none.
- Outcome: user asked for it. Suggested, not built: a "new quote" button in the empty state. Not yet checked on a phone.

## 2026-11-26 · Owner Bids and Activity · one place per job
- Principles used: C2 (each tab answers one question), C4 and UX 134 (a notice says where the job went), C15 (the Bids badge counts only what needs the owner). The job's bid history stays in its detail view.
- Core missing: none.
- Outcome: user approved the hand-off at the garage's confirmation. Not yet checked on a phone.

## 2026-11-26 · Owner bid booking, tracking step · same step as the garage booking
- Principles used: C5 (one shared TrackStep and the same return-to-summary behaviour), C11 (step count updated), C10 (approval rule shown for both choices).
- Core missing: none.
- Outcome: user asked for it. Open: muting for "without live". Not yet checked on a phone.

## 2026-11-26 · Owner bid booking, review step · same summary card as the garage booking
- Principles used: C5 (BookingSummaryCard in both), C10 (the agreed price inside the card; the 2-hour answer rule before sending), C1 (chevron only on lines that can be changed here), C2 (garage named once; empty attachments line left out).
- Core missing: none.
- Outcome: user asked for it. Not yet checked on a phone.

## 2026-11-26 · Owner bid booking, date and time · merged as in the garage booking
- Principles used: C5 (one day-and-time step with the same cards, soonest confirmation and back button), UX 49 (one step fewer), C4 (the button names what is missing).
- Core missing: none.
- Outcome: user asked for it. Not yet checked on a phone.

## 2026-11-26 · Owner garage booking, header · back first, close quiet and last
- Principles used: C6 and UPD 067 (the often-used back is the solid white button; close, which drops the request, is faint), UPD 069 (46px targets kept apart by the pill), C7 (white at 75% on the navy band stays legible). Trade-off: close moved from the app's usual left place; user's decision.
- Core missing: none.
- Outcome: user asked for it. Open: confirm on close; bid booking and quote headers still have close on the left. Not yet checked on a phone.

## 2026-11-26 · Owner garage booking, header · back chevron in the step pill
- Principles used: C1 (a chevron on a round disc), C7 (40px disc with extra hit area), C5 (mirrors the icon disc). Trade-off noted: back usually sits left; the user chose the right end, which also keeps it away from close.
- Core missing: none.
- Outcome: user chose the position. Open: confirm on close not decided. Not yet checked on a phone.

## 2026-11-26 · Owner garage booking, tracking step · choice apart from explanation
- Principles used: C5 (laid out like the part-type step), C2 and UPD 099 (two short choices, the picked one explained below), C10 (the approval and close-code rule shown for both choices), UPD 107.
- Core missing: none.
- Outcome: user chose option A of three. Open: muting step updates for "without live" is not built yet. Not yet checked on a phone.

## 2026-11-26 · Owner booking, soonest slot · confirmed before moving on
- Principles used: C4 (a sheet names the date and time and says nothing is sent yet), UPD 074 forgiveness (a way out that changes nothing), C6 (confirm is the filled button), C5 (the soonest card's colours and the flow buttons). C9 noted: the step is reversible, so a confirm is not required by it; the user asked for one because one tap chose and advanced.
- Core missing: none.
- Outcome: user asked for it. The soonest card stays after a choice, and the short time chips are back. Not yet checked on a phone.

## 2026-11-26 · Owner booking, day and time · times drawn like the day cards
- Principles used: C5 and UPD 171 (one card for date and time: small label, big number, small label), C3 and UPD 127 (six times in a 3x2 grid, in order), C2 (the repeated picked-day line is left out where the day is in view; the soonest shortcut leaves once a day is picked).
- Core missing: none.
- Outcome: user chose the grid option. Not yet checked on a phone.

## 2026-11-25 · Owner garage booking, summary step · drawn as an Activity card
- Principles used: C5 (the Activity card: picture and garage, soft box with job and plate, footer line), C2 (the garage card above is hidden here so the garage is named once; empty attachments line left out), C1 (each choice line has a chevron and opens its step), C10 (the 2-hour answer rule before sending), UPD 099.
- Core missing: none.
- Outcome: built as asked. Not yet checked on a phone.

## 2026-11-25 · Owner garage booking, tracking step · choices drawn like the other steps
- Principles used: C5 (same heading with tick and the navy-with-yellow-edge choice as the part types), C1 (benefit chips that looked tappable became plain lines; a radio mark shows the choice), C2 (removed lines that repeated each title), C7.
- Core missing: none.
- Outcome: built as asked. Not yet checked on a phone.

## 2026-11-15 · Owner Home header · vehicle line weight, logo spacing
- Principles used: C13 (plate and vehicle name share one weight, so the chip reads as one control), C2 (16px gap keeps the logo clear of the location chip), UPD 152 proximity.
- Core missing: none.
- Outcome: user asked for the small change set. Not yet checked on a phone.

## 2026-11-10 · Owner Bids tab · accept on the card, timer in hours, map permanent
- Principles used: C6 (accept sits on the card as the one primary action), C9 (the accept confirm and the new delete confirm stay; no other window opens), C4 (the timer names the closing time in hours and minutes, and updates per minute, not every second: UPD 087), C7 (delete target 44px), C13 (the title is Sinhala, as every other label; English only for brand names).
- Core missing: none.
- Outcome: user asked for accept from the card, no navigation to other windows, the timer to show time left, and the map to stay. Not yet checked on screen.

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

## 2026-11-17 · Owner Bids tab · set as the benchmark page
- Principles used: C1, C2, C5, C6, C7, C8, C10, C13 (header and tabs, count label above the list, amber countdown chip, price receipt with a green total, price-as-button rows, delete moved to the detail view).
- Core missing: a rule for consistency across screens; added section 0a and benchmark-bids.md.
- Outcome: signed off by the user as the reference page; later recommendations must follow it.

## Review history

- 2026-11-09: core set created (C1–C13) from the refinements above. Nothing demoted yet. Next review due after 10 entries.
