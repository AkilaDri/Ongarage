import { useMemo } from 'react';
import { payStanding, type PayStanding } from '@ongarage/shared';
import { useWorkshops } from './WorkshopContext';

/** How reliably the owner pays garages, from the payment records of their jobs (marketplace/reliability.ts); recomputed when a record changes. */
export const usePayStanding = (): PayStanding => {
  const { workshops } = useWorkshops();
  return useMemo(() => payStanding(Object.values(workshops).map((w) => w.progress.payment)), [workshops]);
};
