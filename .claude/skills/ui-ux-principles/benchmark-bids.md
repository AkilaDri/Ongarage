# Benchmark page: the owner app's Bids tab (Received)

The user signed this screen off on 2026-11-17 ("this bids screen is done and correct"). It is the **reference page**. When recommending or building a screen, compare it to this page first and reuse its patterns. Break a pattern only with a stated reason (C5 / UPD 035). Source: `apps/user/src/screens/BidsScreen.tsx` (main, commit after `b40a5fd`); header and tabs from the shared `SegmentTabs` / `FilterChips`.

How to use it:
1. Before giving a recommendation for another screen, name which rules below the screen already follows and which it breaks.
2. Recommend the benchmark's pattern for the same role (header, tabs, chips, card, price, buttons, countdown, count label), not a new one.
3. Do not copy the page's content; copy its structure, sizes and colours.
4. If the benchmark itself should change, say so and ask; do not let screens drift apart.

## 1. Page frame

- **Header band:** one solid sky-blue band (`pageHeaderBlue()`), top padding 46 (12 once folded). Rows: title ("Your Bids", white, bold) with the list and map icons at the right end; then the tabs; then the chips. The tab's title row folds away on scroll; tabs and chips stay pinned.
- **Page colour:** the sheet and list are the page grey (`pageBg()`); **cards are white** (`Colors.bgCard`). Cards are separated from the page by outline, shadow and radius, not by colour changes.
- **Tabs:** `SegmentTabs pills radius={12}`: a white track, three equal pills (label + count only, no icons), the open pill filled navy `#1e3a8a` with white label, the count in a small yellow chip. The open pill keeps its width (same font weight selected or not).
- **Chips:** `FilterChips plain onBlue scroll radius={10}`: navy chips with a white edge, the chosen one with a thicker yellow edge, sliding sideways.
- **Floating chat pill:** stays at the bottom right, over the end of the list; keep the last card's actions clear of it.
- **Language:** Sinhala copy; English only for proper nouns and category names.

## 2. Job card (one per request)

- White card, radius 26, 1px `#f3f4f6` edge, soft blue shadow, 12px gap inside.
- **Job header (two lines):** service picture 38px; line 1 the service name (13px bold); line 2 the vehicle and plate (10.5px, muted). The plate is text, not a big plate box. A status badge sits at the right **only when the job has an accepted bid** (booked / booking status).
- **Countdown:** an amber rounded chip under the header ("⏱ පැය 11 ක් 20 මිනි. ඉතිරියි"): 12.5px semi-bold `#b45309` on `rgba(245,158,11,.16)`; red (`#b91c1c` on `rgba(239,68,68,.14)`) under one hour.
- **Count label:** a plain 13px semi-bold muted line directly above the first bid, "ලංසු N ක් ලැබී ඇත · තෝරන්න". The count never sits in the header, never in a pill. It belongs to the thing it counts and says what to do next.
- A "විස්තර ›" link closes the card.

## 3. Bid card (inside the job card)

Order, top to bottom:
1. **Who:** garage photo, name (15px bold, can take the full width, no trash icon beside it), level badge, history tag ("New"), stars + rating (count), then "ago · category" line.
2. **Price:** the green price, 22px bold (`Colors.success`) with the money icon after it, 6px above and below. One price per card.
   - **With a travel fee: a receipt** instead of one number. Label left, figure right, two lines at 14px semi-bold (the repair fee, then "+ travel fee"), a full-width 1.5px rule, then the total: label "මුළු ගාස්තුව" at the left, the **green 22px "LKR 4,650"** at the right, no money icon. Labels are plain 13px muted text, no brackets. Rows are tight (6px gap); the whole block has 12px padding above and below. No separate travel banner or "included" tag.
3. **Facts:** one line, "🛡️ මාස 3 වගකීම · 🕒 පැය 1" (15px).
4. **Market note:** one line under the facts ("≈ සාමාන්‍ය වෙළඳපොළ මිල" / "වෙළඳපොළ මිලට වඩා 18% අඩුයි"), 12px semi-bold, green when cheaper.
5. **Distance** on its own muted row ("📍 1.2 km").
6. **Actions:** three equal outlined buttons in one row, height 40: "📄 විස්තර", "🗺️ දිශාවන්", "✓ පිළිගන්න". All have a 1.5px yellow `#facc15` edge; accept has a soft blue fill `#dbeafe` (soft green `#bbf7d0` with green text for the lowest bid). Deleting a bid is **not** on the card; it is a quiet "ලංසුව ඉවත් කරන්න" link in the bid's detail sheet.
- The lowest bid's card edge is green `rgba(16,185,129,.55)`.

## 4. Rows view (the ☰ switch)

One compact row per bid: left, the garage name (14.5px bold, up to two lines) with "★ 4.9 (124) · 3.5 km" under it (and "💰 අඩුම" on the lowest); right, **the price itself is the accept button** (a 40px pill, min 104px wide, navy `#1e3a8a` white bold text, green for the lowest bid). No separate accept button; an accepted bid shows the price with ✓.

## 5. Patterns to carry to other screens

| Role | Use |
|---|---|
| Page header | solid blue band, title row that folds, pinned tabs and chips |
| Tabs | `SegmentTabs pills`, label + count, no icons, constant weight |
| Count of a list | a plain label above the list, with the next step; not a header badge |
| Deadline | amber chip, red under an hour |
| Card | white card on the page grey, radius 26, light edge + soft blue shadow |
| Main number | green 22px bold; breakdowns as a receipt, total last and green |
| Destructive action | out of the card, into the detail view, behind a confirm |
| Buttons | outlined (yellow edge) with a soft fill on the main one; the main action is the widest or last |
| Duplicates | say each fact once (no repeated category, distance, hours, phone) |

## 6. Known deliberate choices (do not "fix")

- Buttons keep the yellow outline and soft fills (the user asked to keep them).
- The distance stays on its own row.
- The map view on Bids is still the earlier version (the full-screen redesign was tried and reverted; it lives on the `ux-optimized` branch).
- Typecheck is run only when the user asks, except after structural edits.
