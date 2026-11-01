# OnGarage: memory export for Claude

Purpose: a copy of what Claude Code has learned about this user and project, for safekeeping online (for example, upload it to a claude.ai Project's knowledge, or paste it into a new session). Exported 2026-10-08. It contains no keys or secrets.

## How to use it

- **Safekeeping online:** create a Project on claude.ai named "OnGarage", add this file as project knowledge, and also add `CLAUDE.md` and `docs/HANDOVER.md` from the repo.
- **New laptop with Claude Code:** the repo's `CLAUDE.md` loads automatically. The local memory (below) does not follow the folder. Either start the first message with "Read docs/CLAUDE_MEMORY_EXPORT.md and docs/HANDOVER.md", or recreate the memory files in `C:\Users\<you>\.claude\projects\<folder-slug>\memory\` (the slug is the project path with `:` and `\` turned into `-`, for example `d--OnGarage-User-App`).
- Claude should treat this as background, and check the code before relying on any specific file name.

## The user

- Product owner and designer of OnGarage, a Sri Lankan vehicle-services marketplace (vehicle owners, garages, parts shops, technicians). They decide business rules themselves and have corrected assumptions before.
- Communicates in English with Sinhala and Singlish phrases; spells UI copy in their own way (keep their spellings). They review work in the running apps and report back with screenshots.

## How to work with them

- Big features: give an opinion and a concrete plan first, list the decisions needed with a default for each, then build in numbered steps. After each step, a short report. Wait for "start step N".
- Do not build past an unanswered business question.
- Commit and push only when asked. Never commit `.env` files or API keys.
- Quick UI tweaks: make the change quickly; they check it themselves. During the OnMart build they asked for changes only, no type check, tests or browser checks, until they say to verify. After "run verification now", verification is wanted: typecheck, unit tests, then browser specs, fixing failures.
- Use the editor tools (not long shell heredocs) to write files that contain apostrophes or backticks.

## Standing business rules (also in CLAUDE.md)

- **SOS fee = the technician's call-out fee** (OnGarage-approved travel compensation, LKR 500 + 250 per radius expansion). Paid even if no repair is needed. Never a platform fee. Bill = call-out fee + repair charge settled after inspection (may be 0). (Corrected by the user on 2026-10-05.)
- **No manager review of diagnoses.** A technician's diagnosis goes straight to the vehicle owner; most Sri Lankan workshops have no separate manager. (2026-10-06.)
- Parts are ordered only for lines the owner approved (or parts the owner named in their post); handover waits for unordered or undelivered parts; labour and parts are billed separately.
- Workshop jobs close only with the owner's QR or 6-digit code.
- Levels cannot be bought; ads and paid placements never buy ranking.
- UI language is Sinhala; English only for proper nouns, category names and tab labels. Never use `Alert.alert`.

## The project in one page

- Monorepo at `D:\OnGarage User App` (GitHub `AkilaDri/Ongarage`, branch `feature/marketplace-apps`; last push `5b86fc8`). Four Expo apps (owner `apps/user` port 8091, garage 8092, parts shop 8093, technician 8094) plus `packages/shared`. No backend yet: every app runs on seed data and simulates the others.
- An earlier prototype lives at `E:\Ongarage App` (a porting reference only; it holds plain-text API key files, never read or copy them). Earlier build history (Oct 4–8) is in Claude Code transcripts under `C:\Users\Magic Corn Marketing\.claude\projects\e--OnGarage-User-App\` (local to the old laptop).
- Look and feel: PickMe-inspired soft surfaces, pill buttons, sky-blue header bands with a rounded sheet overlapping them, round icon discs, two-tone tab icons.
- Planned next: an admin app, the backend, a Claude-backed AI provider, and "Laya".

## OnMart (the spare-parts marketplace), built 2026-10-08

Idea: a marketplace where owners (and garages) find parts at nearby shops, post rare-part requests on an open nationwide wall, reserve and collect parts (inspect and pay at the counter, or delivery), and where garages can tell a customer to buy a part themselves and recommend shops, earning a disclosed referral commission.

Decisions the user accepted:
- Search ladder: 10 km, then 50 km, then nationwide; audience choice shops / wall / both.
- Commission: shop-set percentage (default 3, cap 5) of parts value; tracked in a ledger, never added to the owner's price; disclosed to the owner; earned only once the part was fitted and the job closed with the owner's code; cancelled if the part is returned; a referred buyer is never charged above the listed price. Payment and commission settlement happen outside the app.
- Contact: call plus a structured thread; the AI off-app check holds back phone numbers and off-app payment talk.
- One 6-digit purchase code per job part; 7-day return window; only a verified purchase can be rated.
- Shop rankings never use referral fees; paid banners and the Featured shop row are always labelled "දැන්වීම" and never change the organic rows.
- Owner OnMart tab is modelled on the owner Home page: banners, offer tiles, deals with a −% badge and countdown, shop rows with cover cards. Gradients and emoji stand in for photos.
- Shop deals: 1–50% off, at most 14 days.

Status: all nine build steps and the seven-step landing overhaul are written and pushed. Typecheck and 71 unit tests pass; owner, parts-customer and parts-promotion browser specs pass; the garage OnMart spec has 3 failing checks; older browser specs not yet re-run; dark mode not yet viewed.

## Where to look

- `CLAUDE.md` (repo rules, including "OnMart rule" and the SOS and workshop rules), `apps/user/CLAUDE.md`, `docs/HANDOVER.md` (setup on a new machine, status, map of OnMart files, known failures).
