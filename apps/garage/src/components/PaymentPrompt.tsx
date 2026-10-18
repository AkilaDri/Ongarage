import React from 'react';
import { PaymentReceivedSheet } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { billOf } from './PaymentNote';
import { Toast } from './Toast';

/**
 * The prompt that follows the owner's code: the job is closed, now how much did the customer pay? It opens over whatever screen the owner code was entered on (the job
 * card, the chat). Closing it without answering leaves the question on the job's card (PaymentNote) until it is answered.
 */
export const PaymentPrompt: React.FC = () => {
  const { payPromptId, bookings, recordPayment, dismissPayPrompt } = useGarage();
  const b = bookings.find((x) => x.id === payPromptId);
  const open = !!b && b.progress?.stage === 'closed' && !b.progress.payment;
  return (
    <PaymentReceivedSheet
      visible={open}
      onClose={dismissPayPrompt}
      overlay={<Toast topOffset={40} />}
      subject={{ title: b?.title ?? '', vehicle: b ? `${b.vehicle.name} · ${b.vehicle.plate}` : '' }}
      total={b ? billOf(b) : 0}
      onSubmit={(r) => b && recordPayment(b.id, r)}
    />
  );
};
