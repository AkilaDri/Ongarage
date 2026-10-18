import type { NavItem } from '@ongarage/shared';
import { OnGarageIcon } from '../components/OnGarageIcon';
import { OrdersIcon, RequestsIcon, ShopsIcon, WallIcon } from '../components/MartNavIcon';

/** OnMart's bar while the OnMart tab is open: its sections, with a way back to the garage's own app in the middle. */
export type MartNavId = 'shops' | 'mine' | 'ongarage' | 'wall' | 'orders';

export const MART_TABS: NavItem<MartNavId>[] = [
  { id: 'shops', label: 'වෙළඳසැල්', accessibilityLabel: 'OnMart shops', icon: ShopsIcon },
  { id: 'mine', label: 'මගේ ඉල්ලීම්', accessibilityLabel: 'OnMart mine', icon: RequestsIcon },
  { id: 'ongarage', label: 'OnGarage', accessibilityLabel: 'Back to OnGarage', icon: OnGarageIcon },
  { id: 'wall', label: 'විවෘත', accessibilityLabel: 'OnMart wall', icon: WallIcon },
  { id: 'orders', label: 'ඇණවුම්', accessibilityLabel: 'OnMart orders', icon: OrdersIcon },
];
