import React, { useEffect, useRef } from 'react';
import { dayText, paymentDue } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

const MORNING = 9;
const EVENING = 18;

/**
 * Follows the balances customers promised to pay (nothing on screen): on the promised day, from 9:00, the garage is told it is to receive the money; from 18:00 on
 * that day (and every day after, while it is still open) it is asked to say whether it arrived, so a customer who did not pay is followed up. Each reminder shows once
 * a day.
 */
export const PaymentReminders: React.FC = () => {
  const { bookings, notify } = useGarage();
  const told = useRef(new Set<string>());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const day = dayText(now.getTime());
      for (const b of bookings) {
        const pay = b.progress?.payment;
        const due = paymentDue(pay);
        if (!pay || (due !== 'today' && due !== 'overdue') || pay.confirm === 'disputed') continue;
        const left = `රු. ${pay.balance.toLocaleString('en-US')}`;
        const morning = `${b.id}:${day}:m`;
        const evening = `${b.id}:${day}:e`;
        if (now.getHours() >= MORNING && now.getHours() < EVENING && !pay.missedAt && !told.current.has(morning)) {
          told.current.add(morning);
          notify({ icon: '💰', title: 'අද ලබා ගත යුතු ගෙවීමක්', body: `${b.customer.name} ගෙන් ${left} (${b.title}) අද ලැබිය යුතුයි.`, tone: 'primary' });
        } else if ((now.getHours() >= EVENING || due === 'overdue') && !pay.missedAt && !told.current.has(evening)) {
          told.current.add(evening);
          notify({ icon: '⏰', title: 'ගෙවීම ලැබුණාද?', body: `${b.customer.name} ගෙන් ${left} ලැබී නැත්නම් “ගෙවුවේ නැහැ” ලෙස සලකුණු කරන්න — ඔහුට මතක් කරනවා.`, tone: 'danger' });
        }
      }
    };
    check();
    const t = setInterval(check, 60 * 1000);
    return () => clearInterval(t);
  }, [bookings, notify]);

  return null;
};
