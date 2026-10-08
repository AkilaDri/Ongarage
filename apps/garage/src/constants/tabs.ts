import type { NavItem } from '@ongarage/shared';
import { JobsIcon, PartsIcon, ProfileIcon, ScheduleIcon, SOSIcon } from '../components/NavIcons';

export type TabId = 'sos' | 'jobs' | 'schedule' | 'parts' | 'garage';

// Same tab bar as the owner app: English labels and two-tone icons (components/NavIcons).
export const GARAGE_TABS: NavItem<TabId>[] = [
  { id: 'sos', label: 'SOS', icon: SOSIcon },
  { id: 'jobs', label: 'Jobs', icon: JobsIcon },
  { id: 'schedule', label: 'Schedule', icon: ScheduleIcon },
  // Next to Schedule: parts are always ordered for a booked job.
  { id: 'parts', label: 'Parts', icon: PartsIcon },
  { id: 'garage', label: 'Profile', icon: ProfileIcon },
];
