import type { NavItem } from '@ongarage/shared';
import { OrdersIcon, RequestsIcon, ShopIcon, StockIcon } from '../components/NavIcons';

export type TabId = 'requests' | 'orders' | 'stock' | 'shop';

// Same tab bar as the owner and garage apps: English labels and two-tone icons (components/NavIcons).
export const PARTS_TABS: NavItem<TabId>[] = [
  { id: 'requests', label: 'Requests', icon: RequestsIcon },
  { id: 'orders', label: 'Orders', icon: OrdersIcon },
  { id: 'stock', label: 'Stock', icon: StockIcon },
  { id: 'shop', label: 'Shop', icon: ShopIcon },
];
