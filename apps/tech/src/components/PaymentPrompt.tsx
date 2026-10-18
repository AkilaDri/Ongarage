import React from 'react';
import { PaymentReceivedSheet, workshopBill } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { Toast } from './Toast';

/**
 * The job just closed with the owner's code: what did the customer actually pay? (The garage also sees what is recorded.) Dismissing it leaves the job unrecorded; the
 * garage can record it from its own app.
 */
export const PaymentPrompt: React.FC = () => {
  const { payPromptId, jobs, recordPayment, dismissPayPrompt } = useTech();
  const j = jobs.find((x) => x.id === payPromptId);
  const p = j?.workshop?.progress;
  const open = !!j && !!p && p.stage === 'closed' && !p.payment;
  return (
    <PaymentReceivedSheet
      visible={open}
      onClose={dismissPayPrompt}
      overlay={<Toast topOffset={40} />}
      subject={{ title: j?.title ?? '', vehicle: j ? `${j.vehicle.name} · ${j.vehicle.plate}` : '' }}
      total={j?.workshop && p ? p.handover?.bill.total ?? workshopBill(j.workshop.agreedPrice, p).total : 0}
      onSubmit={(r) => j && recordPayment(j.id, r)}
    />
  );
};
