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
  /** The garage's level (trust ladder), shown as a badge to owners. */
  level?: LevelId;
  /** Per-dimension averages from owners' reviews. */
  dimensions?: DimensionRating;
  /** Latest reviews, with the garage's public replies. */
  recentReviews?: GarageReview[];
};

/**
 * An owner's review of a closed job (only jobs closed with the owner's code can be
 * rated): overall stars, the four dimensions, the technician, and the garage's reply.
 */
export type GarageReview = {
  id: string;
  customer: string;
  rating: number;
  dimensions?: DimensionRating;
  technician?: { name: string; rating: number };
  text: string;
  at: number;
  /** The garage's public reply, shown under the review. */
  reply?: { text: string; at: number };
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
  level?: LevelId;
};

/** A voice note the owner recorded for a job; uri is set once real recording exists. */
export type VoiceNote = { id: string; durationSec: number; uri?: string };

export type RepairJob = {
  id: string;
  categoryId: string;
  description: string;
  vehicleId: string;
  sparePart: PartType;
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
  /** The approved diagnosis / extra-work lines this request buys (workshop jobs). */
  forLineIds?: string[];
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
  /**
   * Collecting from the counter instead of delivery (most garages do): ready this many
   * minutes after confirming, total without the delivery fee.
   */
  pickup?: { readyInMin: number; total: number };
};

/**
 * Delivery: confirming → dispatched → arrived → received.
 * Pickup:   confirming → ready (held at the counter until holdUntil) → received
 * (the shop scans the garage's collection code).
 */
export type PartsOrderStatus = 'confirming' | 'dispatched' | 'arrived' | 'ready' | 'received' | 'unavailable' | 'problem';

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
  fulfilment?: 'delivery' | 'pickup';
  /** Pickup: shown at the counter as a QR / code so the right garage collects. */
  pickupCode?: string;
  /** Pickup: the shop holds the parts until then. */
  holdUntil?: number;
  /** Pickup: who goes to the counter (a team member; none = the garage itself). */
  collector?: { id: string; name: string; hasApp?: boolean };
};

/**
 * A technician sent to a parts shop's counter for a garage (pickup orders). They show
 * the pickup code (QR / 6 digits), collect, and hand the parts to the garage.
 */
export type PartsCollectTask = {
  id: string;
  orderId: string;
  garage: GarageRef;
  shop: { name: string; phone: string; address: string; coords: LatLng };
  lines: PartLine[];
  partType: Exclude<PartType, 'GarageChoice'>;
  /** The job the parts are for, e.g. "Brake pads · CAE-1122". */
  forJob?: string;
  pickupCode: string;
  holdUntil: number;
  /** Already paid by the garage (pickup orders are paid at the counter otherwise). */
  amount: number;
  status: 'assigned' | 'collected' | 'delivered';
  assignedAt: number;
  collectedAt?: number;
  deliveredAt?: number;
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
    /** The garage's agreed price (labour) the diagnosis builds on. */
    agreedPrice: number;
    /** The part type the owner asked for in their post. */
    ownerPartType?: PartType;
    /** The workshop steps; the same record the garage and owner apps read. */
    progress?: WorkshopProgress;
  };
};

// ---------- Workshop jobs (garage ⇄ owner ⇄ technician) ----------
// A booked repair (from a bid or a direct booking) runs as: booked → vehicle received →
// diagnosing → owner approves the diagnosis → repairing (maybe waiting for parts) →
// ready for handover → closed with the owner's QR / 6-digit code. Parts are ordered
// only after the owner approves (or when the owner's own post named the part), and any
// extra cost needs another approval. A problem at handover sends the job back for
// rework; an unresolved one goes to OnGarage.

export type WorkshopStage =
  | 'booked'
  | 'received'
  | 'diagnosing'
  | 'awaitingApproval'
  | 'repairing'
  | 'readyForHandover'
  | 'closed'
  /** The owner declined the diagnosis; only what was already agreed is charged. */
  | 'declined'
  | 'disputed';

/** One line of a diagnosis or extra-work request. */
export type DiagnosisLine = {
  id: string;
  kind: 'part' | 'labour';
  name: string;
  qty: number;
  /** Parts: the type, which must respect the owner's choice (Recon instead of Genuine needs approval). */
  partType?: PartType;
  /** Parts: already in the garage, or to be ordered from a shop. */
  source?: 'stock' | 'order';
  /** Estimated price for the whole line (LKR). */
  price: number;
};

export type DiagnosisReport = {
  findings: string;
  photos?: string[];
  voiceNotes?: VoiceNote[];
  lines: DiagnosisLine[];
  /** Agreed price (bid / estimate) plus every line: what the owner would pay in total. */
  revisedTotal: number;
  finishBy: number;
  sentAt: number;
};

/** The owner's answer: approve all, some lines, or decline. */
export type OwnerDecision = { approvedLineIds: string[]; declinedLineIds: string[]; decidedAt: number };

/** Work found mid-repair; same approval rule as the diagnosis. */
export type ExtraWorkRequest = { id: string; reason: string; photos?: string[]; lines: DiagnosisLine[]; sentAt: number; decision?: OwnerDecision };

export type HandoverReport = {
  checklist: { label: string; done: boolean }[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  /** Replaced parts kept for the owner to see (a simple anti-fraud habit). */
  oldPartsKept: boolean;
  bill: { labour: number; parts: number; total: number };
  readyAt: number;
};

export type DisputeTopic = 'quality' | 'price' | 'delay' | 'behaviour' | 'damage' | 'wrongPart' | 'other';

export type Dispute = {
  id: string;
  topic: DisputeTopic;
  text: string;
  photos?: string[];
  raisedAt: number;
  /** open → rework (garage fixes it) → resolved; escalated goes to OnGarage (admin app). */
  status: 'open' | 'rework' | 'resolved' | 'escalated';
};

export type WarrantyClaim = { id: string; text: string; photos?: string[]; raisedAt: number; status: 'open' | 'accepted' | 'rejected' | 'escalated' };

/**
 * The owner asked for Genuine but it isn't available: the garage asks to use Recon
 * instead (cheaper). Nothing changes until the owner answers.
 */
export type ReconRequest = {
  id: string;
  /** Diagnosis / extra-work lines it applies to. */
  lineIds: string[];
  partNames: string[];
  genuinePrice: number;
  reconPrice: number;
  askedAt: number;
  status: 'pending' | 'approved' | 'declined';
  decidedAt?: number;
};

/** Everything that happened on one workshop job; the garage, owner and technician apps all read it. */
export type WorkshopProgress = {
  stage: WorkshopStage;
  checkInPhotos?: string[];
  receivedAt?: number;
  diagnosis?: DiagnosisReport;
  decision?: OwnerDecision;
  extras?: ExtraWorkRequest[];
  /** Waiting for ordered parts (the garage's parts request). */
  waitingForParts?: boolean;
  handover?: HandoverReport;
  dispute?: Dispute;
  /** Owner's QR / 6-digit code that closes the job. */
  closeCode: string;
  closedAt?: number;
  /** Warranty from the bid, counted from closing. */
  warrantyUntil?: number;
  warrantyClaim?: WarrantyClaim;
  /** Genuine unavailable: Recon asked for (and answered) by the owner. */
  recon?: ReconRequest[];
};

// ---------- Trust, levels and fair share ----------

/** Owners rate these separately, only on jobs closed with their QR / code. */
export type RatingDimension = 'quality' | 'pricing' | 'onTime' | 'communication';

export type DimensionRating = Record<RatingDimension, number>;

export type TrustScore = {
  /** 1–5, one decimal: what levels and placement use. */
  score: number;
  /** Per dimension, after the small-sample adjustment. */
  dimensions: DimensionRating;
  reviewCount: number;
  completionRate: number;
  disputeRate: number;
  onTimeRate: number;
};

export type LevelId = 'registered' | 'verified' | 'trusted' | 'premier';

/** Features a level switches on (the server will send these per garage). */
export type Feature =
  | 'sos'
  | 'bids'
  | 'directBookings'
  | 'verifiedBadge'
  | 'priorityPlacement'
  | 'highValueJobs'
  | 'protectedJobs'
  | 'adCredits'
  | 'analytics';

/** Today's new-work intake for a garage under fair-share limits (bids + direct bookings only). */
export type IntakeStatus = {
  /** Only garages flagged by fairness monitoring are limited. */
  limited: boolean;
  /** LKR of new work per day (Infinity when not limited). */
  limit: number;
  used: number;
  remaining: number;
  reached: boolean;
};

export type SubscriptionPlanId = 'growth' | 'pro' | 'premier';

export type GuaranteeClaim = {
  id: string;
  jobRef: string;
  reason: string;
  amount: number;
  photos?: string[];
  raisedAt: number;
  status: 'submitted' | 'garageResponded' | 'approved' | 'rejected';
  garageResponse?: string;
  /** The garage's share (deductible) and the guarantee's share if approved. */
  split?: { garagePays: number; guaranteePays: number };
};
