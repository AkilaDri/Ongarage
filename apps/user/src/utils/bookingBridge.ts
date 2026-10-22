/**
 * Lets a chat (which lives outside the tab screens) start a direct booking of a garage, with what the owner already told it (an inquiry): the app registers how the booking
 * sheet opens, the chat calls it.
 */
export type BookingInitial = { description?: string; vehicleId?: string; service?: string };
type Opener = (garageId: string, categoryId?: string, initial?: BookingInitial) => void;

let opener: Opener | null = null;

export const setBookingOpener = (fn: Opener | null) => {
  opener = fn;
};

export const openBookingFor = (garageId: string, categoryId?: string, initial?: BookingInitial) => opener?.(garageId, categoryId, initial);
