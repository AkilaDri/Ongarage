import { useMemo } from 'react';
import { summarizeCustomer, type CustomerRecord } from '@ongarage/shared';
import { useWorkshops } from './WorkshopContext';

/** What other garages see about the owner: their payment records and the ratings garages gave (a disputed one is left out until it is settled). */
export const useCustomerRecord = (): CustomerRecord => {
  const { workshops } = useWorkshops();
  return useMemo(() => {
    const all = Object.values(workshops);
    return summarizeCustomer(
      all.flatMap((w) => (w.progress.customerRating ? [w.progress.customerRating] : [])),
      all.map((w) => w.progress.payment)
    );
  }, [workshops]);
};
