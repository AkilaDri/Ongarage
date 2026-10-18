import React, { useEffect, useRef } from 'react';
import { dayText, paymentDue } from '@ongarage/shared';
import { useNotice } from '../context/NoticeContext';
import { useWorkshops } from '../context/WorkshopContext';

const MORNING = 9;

/**
 * Follows the balances the owner promised to pay (nothing on screen): on the promised day, from 9:00, the owner is told to pay that garage, and every day after it while
 * the balance is open. Each reminder shows once a day per job.
 */
export const PaymentReminders: React.FC = () => {
  const { workshops } = useWorkshops();
  const { notify } = useNotice();
  const told = useRef(new Set<string>());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const day = dayText(now.getTime());
      for (const w of Object.values(workshops)) {
        const pay = w.progress.payment;
        const due = paymentDue(pay);
        if (!pay || (due !== 'today' && due !== 'overdue') || pay.confirm === 'disputed' || w.progress.cancelled) continue;
        if (now.getHours() < MORNING && due === 'today') continue;
        const key = `${w.id}:${day}`;
        if (told.current.has(key)) continue;
        told.current.add(key);
        const left = `රු. ${pay.balance.toLocaleString('en-US')}`;
        notify(
          due === 'today'
            ? { icon: '💳', title: 'අද ගෙවිය යුතු දිනයයි', body: `${w.garageName} ට ඉතිරි ${left} අද ගෙවන්න (ඔබ පොරොන්දු වූ දිනය).`, tone: 'primary' }
            : { icon: '⚠️', title: 'ගෙවීම ප්‍රමාදයි', body: `${w.garageName} ට ඉතිරි ${left} තවමත් ගෙවා නැත — ගෙවන්න හෝ නව දිනයක් දන්වන්න.`, tone: 'danger' }
        );
      }
    };
    check();
    const t = setInterval(check, 60 * 1000);
    return () => clearInterval(t);
  }, [workshops, notify]);

  return null;
};
