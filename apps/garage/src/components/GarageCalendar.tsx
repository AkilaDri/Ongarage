import React, { useMemo } from 'react';
import { ActivityCalendar, type CalendarItem } from './ActivityCalendar';
import { useGarage } from '../context/GarageContext';
import { useGarageTxns } from './GarageActivityView';
import { openBookingDetail } from '../utils/scheduleSignal';

/**
 * The calendar of the Schedule page's two titles: on the Schedule, a dot on each day with a job (touch a day to list its jobs, touch a job to
 * open it); on the Activitys, a dot on each day with a money movement (the job income and the commissions).
 */
export const GarageCalendar: React.FC<{ visible: boolean; onClose: () => void; view: 'schedule' | 'activity' }> = ({ visible, onClose, view }) => {
  const { bookings } = useGarage();
  const txns = useGarageTxns();

  const items = useMemo<CalendarItem[]>(() => {
    if (view === 'schedule') {
      return bookings.map((b) => ({
        id: b.id,
        at: b.status === 'completed' ? (b.completedAt ?? b.scheduledAt) : b.scheduledAt,
        icon: b.icon,
        title: b.title,
        sub: `${b.customer.name} · ${b.vehicle.plate}`,
        amount: b.price,
        open: () => {
          onClose();
          openBookingDetail(b.id);
        },
      }));
    }
    return txns.map((t) => ({ id: t.id, at: t.at, icon: t.icon, title: t.title, sub: t.sub, amount: t.amount, open: onClose }));
  }, [view, bookings, txns, onClose]);

  return <ActivityCalendar visible={visible} onClose={onClose} items={items} />;
};
