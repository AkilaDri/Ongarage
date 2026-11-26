---
name: top-bar-layout
description: Use when building or changing a top header bar, a top nav bar (pill tabs) or a filter chip bar on any page of the OnGarage apps (owner, garage, parts, tech). Holds the measured layout the owner app's Activity and Bids pages agreed on (heights, gaps, fonts, chip borders, colours) so new or changed pages use the same numbers. Load before touching SegmentTabs, FilterChips, AppPageHeader or the page header in apps/user/src/App.tsx.
---

# Top header, nav and filter bar layout

These values were measured in the browser (Activity and Bids, 390px wide, DPR 1) and agreed with the user. Use them as the standard for every page that has a blue top band with a nav pill and a filter chip row. The shared components (`SegmentTabs` pills, `FilterChips` on the blue band, `PageHeader`) are used by all four apps, so a change to them changes all four.

## 0. Current values for the owner's Activity and Bids (2026-11-26; these override sections 1–4 for those two pages)

Both pages now build the band the same way. Keep them identical:
- Band: padding top 46 (12 folded), sides 10, bottom 6; no extra padding on any wrapper around it (a 2px / 4px wrapper padding on Activity had pushed its rows down).
- Title row: min height 44, padding sides 6, gap 8, bottom 14; title 19/24 bold white; `VehicleChip onBlue`; icons in 32×32 boxes at 24px (hamburger glyph 22/24), 10 apart.
- Tabs: `SegmentTabs pills radius={12}`, label and count only, **no icons**; the nav block has `marginBottom: 10`.
- Chips: `FilterChips plain onBlue radius={10}` with the shared `TOP_BAR.filter` sizes (36 high, 1.5 white edge, 2.5 amber when chosen; no per-page overrides); 16px icons. Activity's four chips share the width; Bids' sort chips scroll.

## 1. Top header bar (the blue band with the heading)

- Band height: **68px** (`BIDS_TITLE_H`) for pages that show the nav and filter bar under the heading (Activity, Bids). Other pages keep `PAGE_TITLE_H` = 84px. Source: `apps/user/src/constants/layout.ts`.
- Heading: one line only. The subtitle line under the heading is removed on Activity and Bids.
- Heading block is wrapped in `<View style={{ flex: 1, paddingTop: 14 }}>` in `apps/user/src/App.tsx` (the header's `AppPageHeader`). Heading text rows measured at y ≈ 42–61.
- Band background: the app's header blue (`setAppTone` header bg, navy `#1e3a8a` in the owner app). Band bottom corners are flat, no curve.

## 2. Top nav bar (pill tabs)

Used with `SegmentTabs` in `pills` mode (Activity) and the custom `renderTabs()` in Bids (`BidsScreen.tsx`). Both must measure the same:

- Track (white pill): **40px** tall total, `padding: 2`, `borderRadius: 26`, `marginHorizontal: 6`, `marginBottom: 10`, blue shadow (`shadowOpacity 0.26`, `shadowRadius 20`, `elevation 8`).
- Chip: **38px** tall (`pillChip height: 38`, Bids `segChip height: 38`), `borderRadius: 22`, `minWidth: 96`, equal widths (`flexGrow: 1`).
- Label: **14px**, `FONTS.bodySemiBold` when not selected, `FONTS.bodyMedium` and white when selected. No bold.
- Icon: **20px** (`size={pills ? 20 : 14}` in `SegmentTabs`).
- Selected chip: filled with the header blue (`brandBlue()`), white label.
- Vertical position: nav track top at **y ≈ 82–83** on the page (Activity: `marginTop: 14` on the nav wrapper, Bids: `floatTabs top: 17`).

## 3. Filter chip bar (under the nav bar)

Activity uses `FilterChips plain onBlue` (fit row, shared). Bids uses its own `ScrollView` row (`sortRow`) with `sortChip` styles. Both must measure the same:

- Row: `fitRow` gap **6**, `marginHorizontal: 6`, `paddingTop: 10` (shared). Bids row: `gap: 10`, `paddingLeft: 12`, `paddingRight: 16`, scrolls sideways.
- Chip: **36px** tall, `borderRadius: 20`, background = header blue.
- Unselected edge: **1.5px**, white.
- Selected edge: **2.5px**, amber `#fbbf24`.
- Label: `FONTS.bodyMedium` 11–12px. Selected label is **white** (not yellow, no bold).
- Measured rows: filter chips at **y ≈ 140–175** on the page (Activity: `marginTop: 4` on the filter wrapper; Bids: `pinnedTools top: 71`).
- Gap between the nav track bottom and the filter chips: keep the filter wrapper / `pinnedTools` offset as above (the gap was widened by 6px on both pages).

## 4. Spacing rules that hold on both pages

- Heading → nav bar: the header band is 68px tall, the nav starts about 14px below the heading block.
- Nav → filter bar: about 8–16px of blue between the nav track bottom and the first chip row.
- Filter bar → cards: the first card starts under the filter bar with about 14px gap (Bids list `paddingTop: 60`, Activity list unchanged).
- The blue band runs down behind the filter chips and ends about 8px below them (Bids `pinnedTools paddingBottom: 8`).

## 5. Things not to do

- Do not add a bold weight to the selected nav or chip label; it was removed on request.
- Do not put a curved bottom edge on the blue band under the nav or filter bar (it looked like a gap on the cards).
- Do not use a yellow label on the selected chip; the label is white and only the border is amber.
- Do not change one page's nav position without re-measuring the other; both were aligned pixel by pixel.

## How to check

Start the dev server (`npm run user:web`), open Activity and Bids in the browser at 390px wide with `ongarage.themeMode` set to `light`, and measure: track top/bottom (white pixels at a column inside the track), chip top/bottom (amber edge on the selected chip), and the heading text rows. The two pages must agree within 1px.

## 6. Garage app: Jobs and Garage (Schedule) pages (saved as the user agreed them)

These two pages live in `apps/garage`. They are not measured against the owner pages above; they were tuned by hand on the garage app.

**Blue band (both pages)**
- Band = the page's `tabBar`: `paddingTop: 46`, `paddingHorizontal: 10`, background `pageHeaderBlue().from`.
- Jobs (`JobFeedScreen.tsx`): `paddingBottom: 18`.
- Garage / Schedule (`ScheduleScreen.tsx`): `paddingBottom: 6`, and its `navCard` has `marginBottom: 10`. Together these give the same band bottom (measured y = 193 on 390px) as Jobs. Keep the two in step: if one band changes, change the other.

**Title row (`jobsHead`)**
- Row, centred, `paddingHorizontal: 6`, `gap: 8`, `paddingBottom: 14` (Jobs and Garage).
- Jobs title: the garage's name (`profile.name`), `fontSize: 17`, `lineHeight: 22`, bold white, no icon. Calendar icon (`CalendarGridIcon size 28`) at the right, in the same row.
- Garage title: the text "Garage", `fontSize: 19`, `lineHeight: 24`, bold white, `flex: 1`. Icon `GarageLineIcon active={false} size={32}` (line, not filled) white, to the left of the text. Calendar icon at the far right (`marginLeft: auto`).

**Nav pill (top navi bar)**
- Jobs: `segRow` white, `borderRadius: 26`, `padding: 2`, `gap: 2`, `marginBottom: 14`. Chip `segChip` height `38`, `borderRadius: 22`, `paddingHorizontal: 4`, label `fontSize: TOP_BAR.nav.labelSize` (14), medium weight. Selected chip: filled with the header blue, label white.
- Garage (Schedule): `SegmentTabs pills`. Chip height 40 from the page's own style is not used; the shared pill chip (38) applies.

**Sub navi bar (filter pills)**
- Jobs: `barFilters` `paddingTop: 10`, `paddingBottom: 4`, `paddingRight: 2`, wraps with `rowGap: 8`. Pills `filter` height `36`, `borderRadius: 20`, `borderWidth: 1.5`, border white, `minWidth: 40`, label `fontSize 12`, white.
- Selected pill: `filterActive` amber edge `#fbbf24`, `borderWidth 2.5`, label white (no yellow label, no bold).
- Icons on the chips: white (`#ffffff`).
- Garage (Schedule): `FilterChips plain onBlue`, icons passed as white (`color="#ffffff"`).
- The filter icon (☰ style, the last item) has no border, white sliders icon, 36×36, `marginLeft: auto` so it sits at the far right.
- The filter list opens as a message popup: centred under the icon, white card, `borderRadius 16`, amber edge 1.5px, close ✕ at its top right, dim backdrop; rows are one per line with the name.

**Chip icons**
- Sub bar chips (ලංසු රැකියා, My bids, Lost): icons 15px, white.
- Top nav icons come from the shared pill component (`size 20`).

**SOS chip**
- No flashing animation. Soft red fill `#fecaca`, border `#f87171` (the last agreed values).

**Do not change without re-measuring**
- The `jobsHead` `paddingBottom` (14) and the band `paddingBottom` move together: changing one moves the nav and the band.
- Measure with a 390px screenshot: band bottom at x = 4 (both pages should read the same y), nav white rows at x = 60, filter yellow rows at the selected chip.

## 7. LOCKED: Garage (Schedule) page

The garage app's Garage page (`apps/garage/src/screens/ScheduleScreen.tsx`) is locked as the user approved it in the screenshot "44": the white "Garage" heading with the house icon on the left, the calendar icon on the right, the navy band, the three tabs (ඉදිරියට / සම්පූර්ණ / අවලංගු) as a white pill, and the chip row (SOS, Booking, ලංසු, Search) under it, with the band ending just under the chips.

Do not change its spacing, sizes, icons or colours unless the user explicitly asks for that exact change. Other pages are matched to this one, not the other way round.

**Values (for building the same top band elsewhere)**

- Band: background `pageHeaderBlue().from` (navy); padding top 46 px (status bar), bottom 6 px, sides 10 px; square corners.
- Title row: left icon `GarageLineIcon active={false} size={32}` white (outline); title "Garage" 19 px / line height 24, bold, white; right `CalendarGridIcon size={28}` white with `marginLeft: auto`; row padding horizontal 6, gap 8, bottom padding 14.
- Nav pill (`SegmentTabs pills`): track white, padding 2, radius 26, margin horizontal 6, margin bottom 10; chip height 38, radius 22, min width 96, equal width; label 14 px (selected medium white, others semi-bold grey); icon 20 px.
- Chip row (`FilterChips plain onBlue`): row gap 8, padding top 10, margin horizontal 6; chip height 36, radius 20, border 1.5 white; selected border 2.5 amber `#fbbf24`, label white; label 12 px; icons white, size 16; chips are not equal width, they scroll sideways in dark mode.
- End of band: margin bottom 10 after the chip row, band padding bottom 6.
- The shared `TopBandLayout` (`packages/shared/src/ui/TopBandLayout.tsx`) draws all of this with these defaults.

**Scroll behaviour of the bands**

- Garage (Schedule): the band is fixed. Scrolling the list passes under it; it never folds.
- Owner Activity: the band folds with the page scroll. Progress = (scroll y - 8) / 30, clamped 0 to 1. At 1 the band is gone; the pinned strip's padding (2 → 20 → 0) and its blue fade with the same progress, so nothing is left behind. Scrolling back restores it.
- Owner Bids: the band folds with the list scroll inside the open sheet. Progress = list offset / 180, clamped 0 to 1; the band moves 1:1 with the list and comes back as the list scrolls back to the top. The sort chips move up with the band (no fade). The sheet cannot be lowered while it is up (`canLower` false) and has no peek height (`noPeek`). With the map open full screen the sheet and the sort chips are not shown.
