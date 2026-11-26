import { useMemo } from 'react';
import { payStanding, type PayStanding } from '@ongarage/shared';
import { useWorkshops } from './WorkshopContext';

/**
 * On the development server the late-payment flag is left off: the seed data always has an overdue balance, so it would show on every run and hold back new
 * requests while the app is being tested. Release builds are not affected. To test the flag itself, set EXPO_PUBLIC_SHOW_LATE_PAYMENT=1 in this app's .env
 * and restart the dev server.
 */
const HIDE_IN_DEV = __DEV__ && process.env.EXPO_PUBLIC_SHOW_LATE_PAYMENT !== '1';

/** The same switch for every other late-payment warning (the Activity card of owed balances, the overdue reminder). */
export const hideLatePayments = HIDE_IN_DEV;

/** How reliably the owner pays garages, from the payment records of their jobs (marketplace/reliability.ts); recomputed when a record changes. */
export const usePayStanding = (): PayStanding => {
  const { workshops } = useWorkshops();
  return useMemo(() => payStanding(HIDE_IN_DEV ? [] : Object.values(workshops).map((w) => w.progress.payment)), [workshops]);
};
