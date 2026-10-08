import type { NavItem } from '@ongarage/shared';
import { EarningsIcon, GaragesIcon, JobsIcon, ProfileIcon } from '../components/NavIcons';

export type TabId = 'jobs' | 'garages' | 'earnings' | 'me';

// Same tab bar as the owner and garage apps: English labels and two-tone icons (components/NavIcons).
export const TECH_TABS: NavItem<TabId>[] = [
  { id: 'jobs', label: 'Jobs', icon: JobsIcon },
  { id: 'garages', label: 'Garages', icon: GaragesIcon },
  { id: 'earnings', label: 'Earnings', icon: EarningsIcon },
  { id: 'me', label: 'Profile', icon: ProfileIcon },
];
