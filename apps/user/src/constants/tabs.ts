import type { NavItem } from '@ongarage/shared';
import { AccountIcon, HomeIcon } from '../components/NavIcons';
import { ActivityListIcon } from '../components/ActivityListIcon';
import { OnGarageIcon } from '../components/OnGarageIcon';
import { BidsBillIcon } from '../components/BidsBillIcon';
import { MartIcon, OrdersIcon, RequestsIcon, ShopsIcon, WallIcon } from '../components/MartNavIcon';

export type TabId = 'home' | 'bids' | 'activity' | 'mart' | 'profile';
export type MartSegment = 'shops' | 'mine' | 'wall' | 'orders';

/** OnMart's bar: its four sections, with a way back to the OnGarage app in the middle. */
export type MartNavId = MartSegment | 'ongarage';

export const MART_TABS: NavItem<MartNavId>[] = [
  {
    id: 'shops',
    label: 'වෙළඳසැල්',
    accessibilityLabel: 'OnMart shops',
    icon: ShopsIcon,
  },
  {
    id: 'mine',
    label: 'මගේ ඉල්ලීම්',
    accessibilityLabel: 'OnMart mine',
    icon: RequestsIcon,
  },
  {
    id: 'ongarage',
    label: 'OnGarage',
    accessibilityLabel: 'Back to OnGarage',
    icon: OnGarageIcon,
  },
  {
    id: 'wall',
    label: 'විවෘත',
    accessibilityLabel: 'OnMart wall',
    icon: WallIcon,
  },
  {
    id: 'orders',
    label: 'ඇණවුම්',
    accessibilityLabel: 'OnMart orders',
    icon: OrdersIcon,
  },
];

// The icons are the designer's artwork (assets/updated_icons), converted by scripts/build-nav-icons.cjs.
export const USER_TABS: NavItem<TabId>[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bids', label: 'Bids', icon: BidsBillIcon },
  // OnMart sits in the middle of the bar.
  { id: 'mart', label: 'OnMart', icon: MartIcon },
  { id: 'activity', label: 'Activity', icon: ActivityListIcon },
  { id: 'profile', label: 'Account', icon: AccountIcon },
];
