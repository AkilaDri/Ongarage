import type { Garage, PartsFitting, VoiceNote } from '@ongarage/shared';

// Owner-side views of what the owner sends to garages. When a backend exists these
// are what the garage app receives as direct requests (its DirectRequest type).

/** An offer the owner chose on the garage's profile and booked with: a percent off the work, extra warranty months, or only a note. */
export type AppliedOffer = { id: string; title: string; icon: string; percent?: number; warrantyMonths?: number };

/** Booking a garage directly from a service category (no bidding). */
export type DirectBookingInput = {
  garage: Garage;
  categoryId: string;
  /** Sub-service the owner picked, e.g. "Brake Pads". */
  service?: string;
  vehicleId: string;
  /** The slot the owner asked for. */
  preferredAt: number;
  description: string;
  /** The garage comes to the owner (true) or the owner brings the vehicle in. */
  doorstep: boolean;
  photos: string[];
  voiceNotes: VoiceNote[];
  /** Parts Fitting (category 15): the part to fit and who supplies it. */
  fitting?: PartsFitting;
  /** The offer this booking was made with. */
  offer?: AppliedOffer;
};

/**
 * requested → the garage answers within 2 h: confirmed (at the slot asked for) or
 * proposed (another time, which the owner accepts or declines) or declined; no answer
 * in time → expired, and the owner can book another garage.
 */
export type DirectBookingStatus = 'requested' | 'proposed' | 'confirmed' | 'declined' | 'expired' | 'cancelled';

export type DirectBooking = DirectBookingInput & {
  id: string;
  requestedAt: number;
  respondBy: number;
  status: DirectBookingStatus;
  /** The garage's other time, while status is 'proposed'. */
  proposal?: { at: number; estimate: number; note?: string };
  /** Confirmed slot and the garage's estimate (final price settles after diagnosis). */
  scheduledAt?: number;
  estimate?: number;
  /** What the offer takes off the estimate once the garage confirms (LKR); the owner pays estimate minus this. */
  discount?: number;
  garageNote?: string;
  declineReason?: string;
};
