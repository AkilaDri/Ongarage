/**
 * The top bar of a page: the blue header band, the nav pill under it and the filter chip row under that.
 * These are the measured values the owner app's Activity and Bids pages agreed on (390px wide), so every
 * page that has the three rows uses the same numbers. Change them here, not in a page.
 *
 * Usage: `import { TOP_BAR } from '@ongarage/shared'` and read the value in a style sheet.
 */
export const TOP_BAR = {
  /** The blue header band with the page heading (the page's own band, 68px on Activity and Bids). */
  header: {
    height: 68,
    /** The heading block's top padding, so the heading sits lower in the band. */
    headingPaddingTop: 14,
  },
  /** The nav pill: a white track with three tabs. */
  nav: {
    trackPadding: 2,
    trackMarginHorizontal: 6,
    trackMarginBottom: 10,
    trackRadius: 26,
    /** Track height = trackPadding * 2 + chipHeight. */
    chipHeight: 38,
    chipMinWidth: 96,
    chipRadius: 22,
    labelSize: 14,
    /** Selected label is medium weight, white; the others semi-bold, grey. */
    iconSize: 20,
  },
  /** The filter chip row under the nav pill. */
  filter: {
    rowGap: 8,
    rowPaddingTop: 10,
    rowMarginHorizontal: 6,
    chipHeight: 36,
    chipRadius: 20,
    /** An unselected chip has a thin white edge. */
    chipBorderWidth: 1.5,
    chipBorderColor: '#ffffff',
    /** The selected chip has a thicker amber edge and a white label. */
    selectedBorderWidth: 2.5,
    selectedBorderColor: '#fbbf24',
    labelSize: 12,
  },
  /** The space between the rows: the blue carries on behind the filter chips. */
  gaps: {
    headingToNav: 14,
    navToFilter: 8,
    filterToCards: 14,
  },
} as const;
