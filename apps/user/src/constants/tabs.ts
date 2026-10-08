import type { NavItem } from '@ongarage/shared';
import { AccountIcon, ActivitiesIcon, BidsIcon, HomeIcon } from '../components/NavIcons';
import { MartIcon } from '../components/MartNavIcon';

export type TabId = 'home' | 'bids' | 'activity' | 'mart' | 'profile';

// The icons are the designer's artwork (assets/updated_icons), converted by scripts/build-nav-icons.cjs.
export const USER_TABS: NavItem<TabId>[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bids', label: 'Bids', icon: BidsIcon },
  { id: 'activity', label: 'Activity', icon: ActivitiesIcon },
  { id: 'mart', label: 'OnMart', icon: MartIcon },
  { id: 'profile', label: 'Account', icon: AccountIcon },
];
