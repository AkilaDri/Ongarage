import React from 'react';
import { BottomNav, pendingExtra, pendingRecon } from '@ongarage/shared';
import { isHandedOver, useBids } from '../context/BidsContext';
import { useBookings } from '../context/BookingsContext';
import { useMart } from '../context/MartContext';
import { useWorkshops } from '../context/WorkshopContext';
import { MART_TABS, USER_TABS, type MartNavId, type TabId } from '../constants/tabs';

/** What waits for the owner, as the red counts on the bottom bars. */
const useOwnerCounts = () => {
  const { jobs } = useBids();
  const { bookings } = useBookings();
  const { workshops } = useWorkshops();
  const { attention } = useMart();
  // Jobs in Bids that need the owner: a winner to pick, a time to pick, or a garage's other time to answer (not one that is only waiting for the garage).
  const bids = jobs.filter((j) => j.bids.length > 0 && !isHandedOver(j) && (!j.acceptedBidId || j.booking?.status !== 'requested')).length;
  // A garage's proposed time, a diagnosis or extra work to approve, a Recon question, or a vehicle ready to collect.
  const activity =
    bookings.filter((b) => b.status === 'proposed').length +
    Object.values(workshops).filter((w) => {
      const p = w.progress;
      return !p.cancelled && (p.stage === 'awaitingApproval' || p.stage === 'readyForHandover' || (p.stage === 'repairing' && (!!pendingExtra(p) || !!pendingRecon(p))));
    }).length;
  // OnMart: what is news and not seen yet (a shop has the part, a reply to a wall post, a shop writing back, an order ready / sent / arrived).
  return { bids, activity, mart: attention };
};

export const OwnerNav: React.FC<{ activeTab: TabId; onTabChange: (tab: TabId) => void }> = ({ activeTab, onTabChange }) => {
  const c = useOwnerCounts();
  const badges: Partial<Record<TabId, number>> = { bids: c.bids, activity: c.activity, mart: c.mart.total };
  // While something in OnMart waits for the owner, its tab pulses (a blue radar) as well as showing the count, so it is noticed from any other tab.
  return <BottomNav items={USER_TABS.map((t) => ({ ...t, badge: badges[t.id], alert: t.id === 'mart' && c.mart.total > 0 ? ('enroute' as const) : undefined }))} activeTab={activeTab} onTabChange={onTabChange} />;
};

export const OwnerMartNav: React.FC<{ activeTab: Exclude<MartNavId, 'ongarage'>; onTabChange: (tab: MartNavId) => void }> = ({ activeTab, onTabChange }) => {
  const c = useOwnerCounts();
  // Inside OnMart each page shows what is new on it; opening the page clears it.
  const news: Partial<Record<MartNavId, number>> = { mine: c.mart.requests, wall: c.mart.wall, orders: c.mart.orders };
  return <BottomNav items={MART_TABS.map((t) => ({ ...t, badge: news[t.id] || undefined, alert: news[t.id] ? ('enroute' as const) : undefined }))} activeTab={activeTab} onTabChange={onTabChange} />;
};
