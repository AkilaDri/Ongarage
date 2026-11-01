import { ClipboardLineIcon, GarageLineIcon, JobsLineIcon, ProfileLineIcon, ShopLineIcon, type NavItem } from '@ongarage/shared';

export type TabId = 'jobs' | 'schedule' | 'activity' | 'parts' | 'garage';

// Same tab bar as the owner app: English labels and two-tone icons (components/NavIcons).
export const GARAGE_TABS: NavItem<TabId>[] = [
  // Jobs is the home screen, so it comes first.
  { id: 'jobs', label: 'Jobs', icon: JobsLineIcon },
  { id: 'schedule', label: 'Garage', icon: GarageLineIcon },
  // Activity (every transaction) used to be the Schedule page's second title; it is its own tab now.
  { id: 'activity', label: 'Activity', icon: ClipboardLineIcon },
  // OnMart (formerly Parts) sits right before Profile: parts are ordered for a booked job and the whole marketplace is here.
  { id: 'parts', label: 'OnMart', icon: ShopLineIcon },
  { id: 'garage', label: 'Profile', icon: ProfileLineIcon },
];
