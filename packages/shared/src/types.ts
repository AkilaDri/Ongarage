export type LatLng = { latitude: number; longitude: number };

export type PickedLocation = { address: string; coords: LatLng };

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  type: string;
};

export type Garage = {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  distance: number;
  status: 'open' | 'closed';
  phone: string;
  address: string;
  coords: LatLng;
  reviews_text?: string;
  photos?: string[];
};

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
};

export type Bid = {
  id: string;
  garageName: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  coords: LatLng;
  price: number;
  warrantyMonths: number;
  estHours: number;
  submittedAt: number;
};

/** A voice note the owner recorded for a job; uri is set once real recording exists. */
export type VoiceNote = { id: string; durationSec: number; uri?: string };

export type RepairJob = {
  id: string;
  categoryId: string;
  description: string;
  vehicleId: string;
  sparePart: string;
  doorstep: boolean;
  biddingHours: number;
  submittedAt: number;
  photos?: string[];
  voiceNotes?: VoiceNote[];
  address: string;
  coords: LatLng;
  bids: Bid[];
  acceptedBidId?: string;
};

export type JobDraft = Pick<RepairJob, 'categoryId' | 'description' | 'vehicleId'> & { replacesJobId?: string };

export type BreakdownType =
  | 'Tyre Puncture'
  | 'Engine Problem'
  | 'Brake Issue'
  | 'Gearbox Issue'
  | 'Electrical Issue'
  | 'Fuel Empty';

export type SOSRequest = {
  location: string;
  vehicleId: string;
  breakdownType: BreakdownType;
  coordinates?: LatLng;
};

export type Mechanic = {
  id: string;
  name: string;
  distance: number;
  eta: number;
  phone: string;
  specialty: string;
  callMessage: string;
  coords: LatLng;
};

// ---------- Spare parts (garage ⇄ parts shops) ----------
// A garage asks nearby shops to quote for the parts a booked job needs; the
// cheapest suitable quote is ordered and delivered to the garage. Parts are
// billed to the vehicle owner separately from the garage's labour.

/** Genuine / OEM / Recon as the owner chose when posting the job; GarageChoice lets the garage decide. */
export type PartType = 'Genuine' | 'OEM' | 'Recon' | 'GarageChoice';

export type PartLine = { id: string; name: string; qty: number };

export type PartsShop = {
  id: string;
  name: string;
  rating: number;
  ratingCount: number;
  distanceKm: number;
  phone: string;
  address: string;
};

/** The garage asking for parts, as shops see it. */
export type PartsGarage = { id: string; name: string; phone: string; address: string; coords: LatLng; rating: number };

export type PartsRequest = {
  id: string;
  bookingId: string;
  garage?: PartsGarage;
  categoryId?: string;
  vehicle: { name: string; plate: string; type: string; chassis?: string };
  partType: PartType;
  lines: PartLine[];
  /** Part numbers or anything the shop should know. */
  note?: string;
  /** A photo of the old part is attached (shops identify parts far better with it). */
  oldPartPhoto?: boolean;
  createdAt: number;
  /** Shops can quote until this time. */
  quoteUntil: number;
  /** The part must reach the garage by this time (before the booked job). */
  needBy: number;
  radiusKm: number;
  status: 'open' | 'ordered' | 'received' | 'cancelled';
  /** Shops are still answering the current round. */
  searching: boolean;
  /**
   * The owner asked for Genuine. If none is available, Recon may be quoted only
   * after the owner approves.
   */
  reconApproval?: 'pending' | 'approved' | 'declined';
};

export type PartQuote = {
  id: string;
  requestId: string;
  shop: PartsShop;
  partType: Exclude<PartType, 'GarageChoice'>;
  /** Unit price for each request line, in the same order. */
  unitPrices: number[];
  partsTotal: number;
  deliveryFee: number;
  /** partsTotal + deliveryFee: what the garage compares. */
  total: number;
  etaMin: number;
  warrantyMonths: number;
  delivery: 'courier' | 'shop';
  /** e.g. 'PickMe Flash' when a courier carries it. */
  courier?: string;
  at: number;
  /** The shop could not supply it after all. */
  withdrawn?: boolean;
};

export type PartsOrderStatus = 'confirming' | 'dispatched' | 'arrived' | 'received' | 'unavailable' | 'problem';

export type PartsOrder = {
  id: string;
  requestId: string;
  quoteId: string;
  status: PartsOrderStatus;
  placedAt: number;
  etaAt?: number;
  rider?: { name: string; phone: string };
  trackingUrl?: string;
  receivedAt?: number;
  /** Why the garage sent it back (wrong or damaged part). */
  problem?: string;
  rating?: number;
};

/** A short in-app message (toast) about something the user did not trigger themselves. */
export type Notice = { id: number; icon: string; title: string; body: string; tone: 'primary' | 'success' | 'danger' };

// ---------- Technicians (garage ⇄ technician app) ----------
// A garage assigns an SOS job or a workshop job to one of its technicians, who runs
// the field steps from their own phone. Technicians can be the garage's employees
// or freelancers linked to several garages.

/** A garage as other apps see it (who is asking, where to go, who to call). */
export type GarageRef = PartsGarage;

/** How a technician works for a garage. Employees are assigned; freelancers accept or decline. */
export type TechLinkKind = 'employee' | 'freelance';

/** What a garage pays the technician per job (recorded, settled outside the app). */
export type TechRates = { sos: number; workshop: number };

/**
 * SOS steps on the technician's phone. The garage sees them live in its dispatch
 * screen ('approval': the final repair charge is above the quote, waiting for the
 * manager; 'awaitingConfirm': the owner checks the vehicle; 'payment': collecting
 * the bill after the QR / code).
 */
export type TechSOSStage = 'offered' | 'enroute' | 'arrived' | 'inspecting' | 'approval' | 'repairing' | 'awaitingConfirm' | 'qr' | 'payment' | 'done' | 'declined';

export type TechWorkshopStage = 'offered' | 'assigned' | 'working' | 'done' | 'declined';

/** Parts for a workshop job, as the technician needs to know it. */
export type TechPartsStatus = 'none' | 'ordered' | 'onTheWay' | 'arrived';

export type TechAssignment = {
  id: string;
  garage: GarageRef;
  customer: { name: string; phone: string };
  vehicle: { name: string; plate: string; type: string };
  title: string;
  icon: string;
  location: PickedLocation;
  assignedAt: number;
  /** What the technician earns for this job (from the link's rates). */
  pay: number;
  sos?: {
    breakdownId: BreakdownType | string;
    note?: string;
    calloutFee: number;
    /** The garage's estimate for the repair (0 = after inspection). */
    quote: number;
    etaMin: number;
    /** Owner's 6-digit code, the fallback when the QR can't be scanned. */
    closeCode: string;
    /** The technician must accept by then (freelancers; employees too, so a missed one is re-assigned). */
    acceptBy: number;
  };
  workshop?: {
    scheduledAt: number;
    description: string;
    photos?: string[];
    voiceNotes?: VoiceNote[];
    /** The owner brings the vehicle in (false) or the technician goes to them (true). */
    doorstep: boolean;
    parts: TechPartsStatus;
    partsSummary?: string;
  };
};
