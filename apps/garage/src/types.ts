import type { BreakdownId, LatLng, PickedLocation, VoiceNote } from '@ongarage/shared';

// Garage-side views of the records the owner app creates. When a backend exists
// these are what the garage receives for each owner action.

export type Customer = { name: string; phone: string };
export type CustomerVehicle = { name: string; plate: string; type: string };

/** An owner's SOS broadcast that reached this garage's coverage radius. */
export type SOSRequest = {
  id: string;
  customer: Customer;
  vehicle: CustomerVehicle;
  breakdownId: BreakdownId;
  note?: string;
  location: PickedLocation;
  distanceKm: number;
  /**
   * Call-out fee OnGarage approves for the technician: compensation for travelling
   * to the breakdown, paid even when no repair turns out to be needed. It grows when
   * the owner widens the search radius (farther travel). Not a platform fee.
   */
  calloutFee: number;
  requestedAt: number;
};

/** Mirrors the owner's SOS steps from the garage side. */
export type DispatchStage =
  | 'review'
  | 'quote'
  | 'awaitingCustomer'
  | 'techAccept'
  | 'assign'
  | 'enroute'
  | 'arrived'
  | 'repairing'
  | 'awaitingConfirm'
  | 'qr'
  | 'done';

export type Dispatch = {
  /** Same as request.id; one dispatch per SOS request. */
  id: string;
  request: SOSRequest;
  stage: DispatchStage;
  /** Estimated repair charge sent with the quote (on top of the call-out fee; 0 = decide after inspection). */
  quote?: { price: number; etaMin: number };
  /** Final repair charge, settled after inspection. needed=false: call-out fee only. */
  repair?: { amount: number; needed: boolean };
  mechanicId?: string;
  /** A service van, or 'own' when the mechanic rides their own bike/vehicle. */
  vanId?: string;
  startedAt: number;
  /** When the van left the garage; drives the trip progress. */
  enrouteAt?: number;
  /** Repair checklist, ticked by the mechanic. */
  tasks: boolean[];
  /**
   * 'app': the technician runs the field steps from the technician app and this
   * screen is a live view; 'manual': the garage records them (no app, or taken over).
   */
  techMode?: 'app' | 'manual';
  /** A final repair charge above the quote waits for the manager. */
  priceApproval?: { amount: number; status: 'pending' | 'approved' | 'rejected' };
};

/** What an owner describes for a repair, however it reaches the garage. */
export type JobDetails = {
  id: string;
  categoryId: string;
  description: string;
  buddySummary?: string;
  customer: Customer;
  vehicle: CustomerVehicle;
  sparePart: 'Genuine' | 'OEM' | 'Recon' | 'GarageChoice';
  doorstep: boolean;
  location: PickedLocation;
  distanceKm: number;
  photos?: string[];
  voiceNotes?: VoiceNote[];
};

/**
 * An owner booked this garage directly from a service category (owner app:
 * ServiceBrowseScreen) instead of asking for bids. Only this garage sees it; it
 * must answer before respondBy or the owner is free to pick another garage.
 */
export type DirectRequest = JobDetails & {
  /** The sub-service the owner picked in the category, if any. */
  service?: string;
  requestedAt: number;
  /** The slot the owner picked. */
  preferredAt: number;
  respondBy: number;
  /** 'proposed': the garage offered another time and waits for the owner. */
  status: 'new' | 'proposed';
  proposal?: { at: number; estimate: number; note: string };
};

/** A repair job an owner posted for bidding (owner app: PostJobScreen). */
export type FeedJob = JobDetails & {
  id: string;
  categoryId: string;
  description: string;
  buddySummary?: string;
  customer: Customer;
  vehicle: CustomerVehicle;
  sparePart: 'Genuine' | 'OEM' | 'Recon' | 'GarageChoice';
  doorstep: boolean;
  biddingHours: number;
  postedAt: number;
  location: PickedLocation;
  distanceKm: number;
  /** Bids from other garages so far. */
  otherBids: number;
};

export type BidStatus = 'pending' | 'won' | 'lost' | 'withdrawn';

/** This garage's bid; the owner sees it as a shared `Bid`. */
export type MyBid = {
  id: string;
  jobId: string;
  /** Snapshot of the job when bid on (a won job leaves the feed). */
  job: FeedJob;
  price: number;
  warrantyMonths: number;
  estHours: number;
  note: string;
  submittedAt: number;
  status: BidStatus;
};

export type BookingStatus = 'scheduled' | 'inProgress' | 'completed';

export type Booking = {
  id: string;
  source: 'bid' | 'sos' | 'direct';
  title: string;
  icon: string;
  customer: Customer;
  vehicle: CustomerVehicle;
  address: string;
  coords: LatLng;
  doorstep: boolean;
  scheduledAt: number;
  price: number;
  status: BookingStatus;
  completedAt?: number;
  rating?: number;
  /** SOS jobs: call-out fee only, no repair was needed. */
  calloutOnly?: boolean;
  /** What the owner sent (photos, voice notes, description), kept so the booked job can be reviewed. */
  job?: JobDetails;
  /** The garage's note to the owner when it accepted. */
  note?: string;
  /**
   * Walk-in bookings (not doorstep): when the garage's address, map link and phone
   * were sent to the owner so they can find the garage and call on the way.
   */
  locationSharedAt?: number;
  /** Parts bought for this job, billed to the owner separately from price (labour). */
  partsCost?: number;
};

/** hasApp: linked to the technician app, so SOS field steps come from their phone. */
export type TeamMember = { id: string; name: string; role: string; phone: string; hasApp?: boolean };

/** Who is at work today. SOS capacity comes only from a confirmed, same-day register. */
export type Attendance = {
  date: string;
  presentIds: string[];
  /** Present but briefly unavailable (lunch, an errand): can't be sent on a job. */
  breakIds: string[];
};
export type ServiceVan = { id: string; name: string; plate: string };

export type Review = {
  id: string;
  customer: string;
  rating: number;
  text: string;
  at: number;
  /** The garage's public reply, shown under the review in the owner app. */
  reply?: { text: string; at: number };
};

export type GarageProfile = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  address: string;
  coords: LatLng;
  openHours: string;
  photos: string[];
  /** SERVICE_CATEGORIES ids this garage takes jobs for. */
  services: string[];
  coverageKm: number;
};

export type { Notice } from '@ongarage/shared';
