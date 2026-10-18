/**
 * The owner app tells a job when its owner-bought part is purchased; a garage buys for itself, so there
 * is nothing to tell.
 */
export const useWorkshops = () => ({ markPartBought: (_bookingId: string, _lineId: string, _info: { shopName: string; amount: number }) => {} });
