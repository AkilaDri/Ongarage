# Handoff: where the owner app stands

For the next developer, or the next Claude Code session on a new machine. Read `CLAUDE.md` and `apps/user/CLAUDE.md` first; this file only covers what happened recently and why. Last updated at commit `d08c84e` on `feature/marketplace-apps` (merged to `main` through PRs #1–#5).

## State of the project

- Stages 0–7 of the plan are done: four Expo apps (`apps/user`, `garage`, `parts`, `tech`) plus `packages/shared`, all running on seed data and simulating each other. Planned next, only when asked: an admin app, the backend, a Claude-backed AI provider, Laya.
- Recent work was **owner app (`apps/user`) only**. The user said not to bring the new look to the other three apps yet. The one shared change is `BottomNav` accepting an optional `icon` component per tab; the other apps still pass a `path`.
- Checks that pass at this commit: `npm run typecheck`, and `npm run e2e -- owner` (65 specs; needs the four dev servers running, ports 8091–8094).

## The owner app's design direction (PickMe-inspired)

- **Layout:** Home shows a sky-blue greeting header, with a white rounded sheet overlapping it. Bids and Activity show a title band instead of the greeting; Account has no header at all.
- **Bottom tabs** are in English: Home / Bids / Activity / Account. The icons are the designer's artwork in `apps/user/assets/updated_icons/*.svg`, converted by `apps/user/scripts/build-nav-icons.cjs` into `src/components/NavIcons.tsx` (generated, never hand-edit). Navy maps to a theme-aware "ink", sky blue to an "accent".
- **Home banners** (in `App.tsx`, outside the scrolling sheet): SOS (red gradient) and Post Job (navy gradient) are stacked cards at the top. Scrolling rises the whole area over the greeting and tweens both cards into one compact row; scrolling back restores them. The animation is driven by one `Animated.Value` (`sheetScroll`, 0 to 1 over the first 60px of Home scroll).
- **Copy** mixes Sinhala and English on purpose, exactly as the user wrote it: "වාහනය Breakdown ද ?" / "ළගම OnGarage උදව් ඉල්ලන්න" (SOS), "වාහනයේ Repair එකක්ද?" / "OnGarage වලින් Quotes ගන්න" (Post Job), "Quotes ඉල්ලන්න" (compact Post Job). Keep the user's spellings.
- **Home list:** sits in its own rounded, shadowed sheet under the banners. The service categories are the first child of the ScrollView with `stickyHeaderIndices={[0]}`, so they stay pinned under the banners while everything else scrolls beneath, with a soft edge glow (shadow on light, sky-blue glow on dark).
- **Category icons:** 12 cut-out artwork icons (no ring, shadow baked into the image). The bundled copies in `assets/home/category-icons/` are 200px (the hi-res originals are in `assets/job cat icons/`). `CATEGORY_ICON_FIT` in `constants/home.ts` scales and centres each icon by its visible area so they look equal in size; regenerate it if an icon is replaced.
- **Bids tab:** map behind a three-stage sheet (`ThreeStateSheet`: peek, collapsed, expanded). Pill status tabs, the navy Post Job banner and soft-shadow cards, to match Home.

## Gotchas learned the hard way

- The floating tab bar needs a higher `zIndex` than the Home sheet (it has 20), or the sheet swallows tab taps and many e2e specs fail.
- react-native-web: draggable surfaces need `userSelect: 'none'`; images need explicit width/height; a box shadow on a transparent PNG draws a rectangle.
- Installing packages can stop Metro; restart the dev server before `npm run e2e`. `-- --clear` clears its cache.
- `.env` files (and `apps/user/Google Map Full API Key.txt`) are git-ignored; copy them across by hand.

## Preferences the user has stated

- Commit and push only when asked. Never commit `.env` files or API keys.
- UI language is Sinhala (English for proper nouns, category names and the tab labels). Never use `Alert.alert`.
- A technician's diagnosis goes straight to the owner; no manager review. The SOS fee is the technician's call-out fee, not a platform fee. (Both are in `CLAUDE.md`.)
