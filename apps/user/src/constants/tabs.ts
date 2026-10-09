import type { NavItem } from '@ongarage/shared';
import { AccountIcon, ActivitiesIcon, BidsIcon, HomeIcon } from '../components/NavIcons';
import { MartIcon, OrdersIcon, RequestsIcon, ShopsIcon, WallIcon } from '../components/MartNavIcon';

export type TabId = 'home' | 'bids' | 'activity' | 'mart' | 'profile';
export type MartSegment = 'shops' | 'mine' | 'wall' | 'orders';

export const MART_TABS: NavItem<MartSegment>[] = [
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
  { id: 'bids', label: 'Bids', icon: BidsIcon },
  { id: 'activity', label: 'Activity', icon: ActivitiesIcon },
  { id: 'mart', label: 'OnMart', icon: MartIcon },
  { id: 'profile', label: 'Account', icon: AccountIcon },
];
