import React from 'react';
import { BottomNav, pendingExtra, pendingRecon } from '@ongarage/shared';
import { useBids } from '../context/BidsContext';
import { useBookings } from '../context/BookingsContext';
import { useMart } from '../context/MartContext';
import { useWorkshops } from '../context/WorkshopContext';
import { MART_TABS, USER_TABS, type MartNavId, type TabId } from '../constants/tabs';

/** What waits for the owner, as the red counts on the bottom bars. */
const useOwnerCounts = () => {
  const { jobs } = useBids();
  const { bookings } = useBookings();
  const { workshops } = useWorkshops();
  const { purchases } = useMart();
  // Posted jobs that have bids and no winner picked yet.
  const bids = jobs.filter((j) => !j.acceptedBidId && j.bids.length > 0).length;
  // A garage's proposed time, a diagnosis or extra work to approve, a Recon question, or a vehicle ready to collect.
  const activity =
    bookings.filter((b) => b.status === 'proposed').length +
    Object.values(workshops).filter((w) => {
      const p = w.progress;
      return !p.cancelled && (p.stage === 'awaitingApproval' || p.stage === 'readyForHandover' || (p.stage === 'repairing' && (!!pendingExtra(p) || !!pendingRecon(p))));
    }).length;
  // OnMart parts ready at the counter or arrived at the door.
  const orders = purchases.filter((p) => p.stage === 'ready' || p.stage === 'arrived').length;
  return { bids, activity, orders };
};

export const OwnerNav: React.FC<{ activeTab: TabId; onTabChange: (tab: TabId) => void }> = ({ activeTab, onTabChange }) => {
  const c = useOwnerCounts();
  const badges: Partial<Record<TabId, number>> = { bids: c.bids, activity: c.activity, mart: c.orders };
  return <BottomNav items={USER_TABS.map((t) => ({ ...t, badge: badges[t.id] }))} activeTab={activeTab} onTabChange={onTabChange} />;
};

export const OwnerMartNav: React.FC<{ activeTab: Exclude<MartNavId, 'ongarage'>; onTabChange: (tab: MartNavId) => void }> = ({ activeTab, onTabChange }) => {
  const c = useOwnerCounts();
  return <BottomNav items={MART_TABS.map((t) => (t.id === 'orders' ? { ...t, badge: c.orders } : t))} activeTab={activeTab} onTabChange={onTabChange} />;
};
