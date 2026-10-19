import { JobsLineIcon, ProfileLineIcon, ScheduleLineIcon, ShopLineIcon, SosLineIcon, type NavItem } from '@ongarage/shared';

export type TabId = 'sos' | 'jobs' | 'schedule' | 'parts' | 'garage';

// Same tab bar as the owner app: English labels and two-tone icons (components/NavIcons).
export const GARAGE_TABS: NavItem<TabId>[] = [
  // Jobs is the home screen, so it comes first.
  { id: 'jobs', label: 'Jobs', icon: JobsLineIcon },
  { id: 'sos', label: 'SOS', icon: SosLineIcon },
  // OnMart (formerly Parts) sits in the middle: parts are ordered for a booked job and the whole marketplace is here.
  { id: 'parts', label: 'OnMart', icon: ShopLineIcon },
  { id: 'schedule', label: 'Schedule', icon: ScheduleLineIcon },
  { id: 'garage', label: 'Profile', icon: ProfileLineIcon },
];
