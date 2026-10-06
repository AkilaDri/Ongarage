import type { NavItem } from '@ongarage/shared';

export type TabId = 'sos' | 'jobs' | 'schedule' | 'parts' | 'garage';

// Same 24×24 filled-icon style as the owner app's tab bar.
export const GARAGE_TABS: NavItem<TabId>[] = [
  { id: 'sos', label: 'SOS', path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' },
  {
    id: 'jobs',
    label: 'රැකියා',
    path: 'M2.5 19h19v2h-19zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-3.45-2.07 1.04 5.34 2.67-3.17 1.58-2.61-1.31-1.86.93L7.5 15.5l14.07-5.06c.8-.22 1.28-1.05 1.06-1.8m-3.9 1.95l-9.15 3.29-.68-1.37 9.15-3.29.68 1.37z',
  },
  {
    id: 'schedule',
    label: 'කාලසටහන',
    path: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z',
  },
  // Next to Schedule: parts are always ordered for a booked job.
  {
    id: 'parts',
    label: 'කොටස්',
    path: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  },
  { id: 'garage', label: 'ගරාජය', path: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z' },
];
