import { OrdersLineIcon, RequestLineIcon, ShopLineIcon, WallLineIcon, type NavItem } from '@ongarage/shared';
import { OnGarageIcon } from '../components/OnGarageIcon';

/** OnMart's bar while the OnMart tab is open: its sections, with a way back to the garage's own app in the middle. */
export type MartNavId = 'shops' | 'mine' | 'ongarage' | 'wall' | 'orders';

export const MART_TABS: NavItem<MartNavId>[] = [
  { id: 'shops', label: 'Shops', accessibilityLabel: 'OnMart shops', icon: ShopLineIcon },
  { id: 'mine', label: 'Requests', accessibilityLabel: 'OnMart mine', icon: RequestLineIcon },
  { id: 'ongarage', label: 'OnGarage', accessibilityLabel: 'Back to OnGarage', icon: OnGarageIcon },
  { id: 'wall', label: 'On Feed', accessibilityLabel: 'OnMart wall', icon: WallLineIcon },
  { id: 'orders', label: 'Orders', accessibilityLabel: 'OnMart orders', icon: OrdersLineIcon },
];
