---
name: top-bar-layout
description: Use when building or changing a top header bar, a top nav bar (pill tabs) or a filter chip bar on any page of the OnGarage apps (owner, garage, parts, tech). Holds the measured layout the owner app's Activity and Bids pages agreed on (heights, gaps, fonts, chip borders, colours) so new or changed pages use the same numbers. Load before touching SegmentTabs, FilterChips, AppPageHeader or the page header in apps/user/src/App.tsx.
---

# Top header, nav and filter bar layout

These values were measured in the browser (Activity and Bids, 390px wide, DPR 1) and agreed with the user. Use them as the standard for every page that has a blue top band with a nav pill and a filter chip row. The shared components (`SegmentTabs` pills, `FilterChips` on the blue band, `PageHeader`) are used by all four apps, so a change to them changes all four.

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
