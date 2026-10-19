import { EarningsLineIcon, GarageLineIcon, JobsLineIcon, ProfileLineIcon, type NavItem } from '@ongarage/shared';

export type TabId = 'jobs' | 'garages' | 'earnings' | 'me';

// Same tab bar as the owner and garage apps: English labels and two-tone icons (components/NavIcons).
export const TECH_TABS: NavItem<TabId>[] = [
  { id: 'jobs', label: 'Jobs', icon: JobsLineIcon },
  { id: 'garages', label: 'Garages', icon: GarageLineIcon },
  { id: 'earnings', label: 'Earnings', icon: EarningsLineIcon },
  { id: 'me', label: 'Profile', icon: ProfileLineIcon },
];
