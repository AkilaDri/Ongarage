import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { categoryInfo, marketPrice } from '@ongarage/shared';
import { useNotice } from './NoticeContext';
import { SEED_WORKSHOP_ID, useWorkshops } from './WorkshopContext';
import { MOCK_GARAGES } from '../constants/mockData';
import type { DirectBooking, DirectBookingInput } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
/** The garage must answer within this (same as the garage app's DIRECT_RESPONSE_MIN). */
const RESPOND_WITHIN_MS = 2 * HOUR;
/** Simulated garage reply (compressed). */
const GARAGE_REPLY_MS = 5000;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;

type BookingsState = {
  bookings: DirectBooking[];
  requestBooking: (input: DirectBookingInput) => void;
  acceptProposal: (id: string) => void;
  declineProposal: (id: string) => void;
  cancelBooking: (id: string) => void;
};

const BookingsContext = createContext<BookingsState | null>(null);

/** Seed: a brake job booked this morning; the garage's diagnosis is waiting (see WorkshopContext). */
const seedBookings = (): DirectBooking[] => {
  const at = Date.now() - 2 * HOUR;
  return [
    {
      id: SEED_WORKSHOP_ID,
      garage: MOCK_GARAGES[3],
      categoryId: '7',
      service: 'Brake Pads',
      vehicleId: 'premio',
      preferredAt: at,
      description: 'බ්‍රේක් ගහද්දී කෑගහනවා, පෙඩලය ටිකක් පහතට යනවා.',
      doorstep: false,
      photos: [],
      voiceNotes: [],
      requestedAt: at - 20 * HOUR,
      respondBy: at - 18 * HOUR,
      status: 'confirmed',
      scheduledAt: at,
      estimate: 3800,
    },
  ];
};

/**
 * Direct bookings the owner sent. Until there is a backend the garage's side is
 * simulated, following the garage app's direct-request rules: it confirms a slot in
 * working hours, otherwise proposes the next morning; the owner decides on proposals.
 */
export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const { startWorkshop } = useWorkshops();
  const [bookings, setBookings] = useState<DirectBooking[]>(seedBookings);
  const live = useRef(bookings);
  live.current = bookings;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback((id: string, change: Partial<DirectBooking>) => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...change } : b))), []);

  const requestBooking = useCallback(
    (input: DirectBookingInput) => {
      const now = Date.now();
      const booking: DirectBooking = { ...input, id: `db-${now}`, requestedAt: now, respondBy: now + RESPOND_WITHIN_MS, status: 'requested' };
      setBookings((prev) => [booking, ...prev]);
      notify({ icon: '📨', title: 'වෙන්කිරීම් ඉල්ලීම යැව්වා', body: `${input.garage.name} පැය 2ක් ඇතුළත පිළිතුරු දෙයි.`, tone: 'primary' });

      timers.current.push(
        setTimeout(() => {
          const b = live.current.find((x) => x.id === booking.id);
          if (!b || b.status !== 'requested') return;
          const estimate = marketPrice(b.categoryId);
          const hour = new Date(b.preferredAt).getHours();
          if (hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
            patch(b.id, { status: 'confirmed', scheduledAt: b.preferredAt, estimate, garageNote: b.doorstep ? undefined : 'පැමිණීමට පෙර අමතන්න.' });
            startWorkshop({ id: b.id, garageName: b.garage.name, categoryId: b.categoryId, agreedPrice: estimate, scheduledAt: b.preferredAt, doorstep: b.doorstep, vehicleId: b.vehicleId });
            notify({
              icon: '✅',
              title: `${b.garage.name} වෙන්කිරීම තහවුරු කළා`,
              body: b.doorstep ? 'නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ.' : 'ගරාජයේ ස්ථානය සහ දුරකථන අංකය “ක්‍රියාකාරකම්” හි ඇත.',
              tone: 'success',
            });
          } else {
            const next = new Date(b.preferredAt + (hour >= CLOSE_HOUR ? 24 * HOUR : 0));
            next.setHours(9, 0, 0, 0);
            patch(b.id, { status: 'proposed', proposal: { at: next.getTime(), estimate, note: 'එම වේලාවේ ගරාජය වසා ඇත.' } });
            notify({ icon: '🕘', title: `${b.garage.name} වෙනත් වේලාවක් යෝජනා කළා`, body: 'පිළිගන්න හෝ වෙනත් ගරාජයක් තෝරන්න.', tone: 'primary' });
          }
        }, GARAGE_REPLY_MS)
      );
    },
    [notify, patch, startWorkshop]
  );

  const acceptProposal = useCallback(
    (id: string) => {
      const b = live.current.find((x) => x.id === id);
      if (!b?.proposal) return;
      patch(id, { status: 'confirmed', scheduledAt: b.proposal.at, estimate: b.proposal.estimate });
      startWorkshop({ id, garageName: b.garage.name, categoryId: b.categoryId, agreedPrice: b.proposal.estimate, scheduledAt: b.proposal.at, doorstep: b.doorstep, vehicleId: b.vehicleId });
      notify({ icon: '✅', title: 'වෙන්කිරීම තහවුරුයි', body: `${b.garage.name} · ${categoryInfo(b.categoryId).name}`, tone: 'success' });
    },
    [notify, patch, startWorkshop]
  );
  const declineProposal = useCallback((id: string) => patch(id, { status: 'declined', declineReason: 'ඔබ යෝජිත වේලාව ප්‍රතික්ෂේප කළා' }), [patch]);
  const cancelBooking = useCallback((id: string) => patch(id, { status: 'cancelled' }), [patch]);

  // An unanswered request lapses, so the owner can go elsewhere.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setBookings((prev) => (prev.some((b) => b.status === 'requested' && b.respondBy <= now) ? prev.map((b) => (b.status === 'requested' && b.respondBy <= now ? { ...b, status: 'expired' } : b)) : prev));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  return <BookingsContext.Provider value={{ bookings, requestBooking, acceptProposal, declineProposal, cancelBooking }}>{children}</BookingsContext.Provider>;
};

export const useBookings = () => {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used inside BookingsProvider');
  return ctx;
};
