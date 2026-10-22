import { ClipboardLineIcon, HomeLineIcon, OrdersLineIcon, ProfileLineIcon, ReceiptLineIcon, RequestLineIcon, ShopLineIcon, WallLineIcon, type NavItem } from '@ongarage/shared';
import { OnGarageIcon } from '../components/OnGarageIcon';

export type TabId = 'home' | 'bids' | 'activity' | 'mart' | 'profile';
export type MartSegment = 'shops' | 'mine' | 'wall' | 'orders';

/** OnMart's bar: its four sections, with a way back to the OnGarage app in the middle. */
export type MartNavId = MartSegment | 'ongarage';

export const MART_TABS: NavItem<MartNavId>[] = [
  {
    id: 'shops',
    label: 'Shops',
    accessibilityLabel: 'OnMart shops',
    icon: ShopLineIcon,
  },
  {
    id: 'mine',
    label: 'Requests',
    accessibilityLabel: 'OnMart mine',
    icon: RequestLineIcon,
  },
  {
    id: 'ongarage',
    label: 'OnGarage',
    accessibilityLabel: 'Back to OnGarage',
    icon: OnGarageIcon,
  },
  {
    id: 'wall',
    label: 'On Feed',
    accessibilityLabel: 'OnMart wall',
    icon: WallLineIcon,
  },
  {
    id: 'orders',
    label: 'Orders',
    accessibilityLabel: 'OnMart orders',
    icon: OrdersLineIcon,
  },
];

// The icons are the designer's artwork (assets/updated_icons), converted by scripts/build-nav-icons.cjs.
export const USER_TABS: NavItem<TabId>[] = [
  { id: 'home', label: 'Home', icon: HomeLineIcon },
  { id: 'bids', label: 'Bids', icon: ReceiptLineIcon },
  // OnMart sits in the middle of the bar.
  { id: 'mart', label: 'OnMart', icon: ShopLineIcon },
  { id: 'activity', label: 'Activity', icon: ClipboardLineIcon },
  { id: 'profile', label: 'Account', icon: ProfileLineIcon },
];
