import { buildBill, shareBill } from '@ongarage/shared';
import type { Booking, GarageProfile } from '../types';

/** Makes the job's final bill and sends it to the customer (a PDF on a phone's share sheet, the print dialog on the web). Resolves with how it was sent. */
export const sendJobBill = async (b: Booking, profile: GarageProfile) => {
  if (!b.progress?.handover) return null;
  const doc = buildBill({
    id: b.id,
    issuedAt: b.progress.closedAt ?? b.progress.handover.readyAt,
    garage: { name: profile.name, phone: profile.phone, address: profile.address },
    customer: { name: b.customer.name, phone: b.customer.phone },
    vehicle: `${b.vehicle.name} · ${b.vehicle.plate}`,
    title: b.title,
    agreedPrice: b.price,
    progress: b.progress,
    partsCost: b.partsCost,
    warrantyMonths: b.warrantyMonths,
  });
  return shareBill(doc);
};
