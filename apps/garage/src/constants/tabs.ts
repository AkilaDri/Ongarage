import type { NavItem } from '@ongarage/shared';
import { JobsIcon, MartIcon, ProfileIcon, ScheduleIcon, SOSIcon } from '../components/NavIcons';

export type TabId = 'sos' | 'jobs' | 'schedule' | 'parts' | 'garage';

// Same tab bar as the owner app: English labels and two-tone icons (components/NavIcons).
export const GARAGE_TABS: NavItem<TabId>[] = [
  // Jobs is the home screen, so it comes first.
  { id: 'jobs', label: 'Jobs', icon: JobsIcon },
  { id: 'sos', label: 'SOS', icon: SOSIcon },
  // OnMart (formerly Parts) sits in the middle: parts are ordered for a booked job and the whole marketplace is here.
  { id: 'parts', label: 'OnMart', icon: MartIcon },
  { id: 'schedule', label: 'Schedule', icon: ScheduleIcon },
  { id: 'garage', label: 'Profile', icon: ProfileIcon },
];
