import { OrdersLineIcon, RequestLineIcon, ShopLineIcon, StockLineIcon, type NavItem } from '@ongarage/shared';

export type TabId = 'requests' | 'orders' | 'stock' | 'shop';

// Same tab bar as the owner and garage apps: English labels and two-tone icons (components/NavIcons).
export const PARTS_TABS: NavItem<TabId>[] = [
  { id: 'requests', label: 'Requests', icon: RequestLineIcon },
  { id: 'orders', label: 'Orders', icon: OrdersLineIcon },
  { id: 'stock', label: 'Catalogue', icon: StockLineIcon },
  { id: 'shop', label: 'Shop', icon: ShopLineIcon },
];
