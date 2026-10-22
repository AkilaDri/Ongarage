export type LatLng = { latitude: number; longitude: number };

export type PickedLocation = { address: string; coords: LatLng };

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  type: string;
  registrationNo?: string;
  chassisNo?: string;
  engineNo?: string;
  make?: string;
  model?: string;
  color?: string;
  insuranceNo?: string;
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
  /** The bidding garage's own id: the owner's record with a garage is kept by this, not by its name. */
  garageId?: string;
  garageName: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  coords: LatLng;
  /** What the owner pays in total: the work, plus `travelFee` when the garage is far away. */
  price: number;
  /** A far garage's travel compensation, already included in `price` (see marketplace/travel.ts); the owner sees such a bid marked. */
  travelFee?: number;
  warrantyMonths: number;
  estHours: number;
  submittedAt: number;
  level?: LevelId;
};

/** A voice note the owner recorded for a job; uri is set once real recording exists. */
export type VoiceNote = { id: string; durationSec: number; uri?: string };

/** A parts-fitting job: the part to fit, and whether the owner brings it or the garage supplies it. */
export type PartsFitting = { partName: string; supply: 'owner' | 'garage' };

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
  /** Parts Fitting jobs (category 15): the part to fit and who supplies it. */
  fitting?: PartsFitting;
};

export type JobDraft = Pick<RepairJob, 'categoryId' | 'description' | 'vehicleId'> & { replacesJobId?: string; fitting?: PartsFitting };

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
  /** Photos of the part wanted (the worn part, the damage, a part number plate). */
  photos?: string[];
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
  /** The discount the shop agreed with this garage, already taken off the unit prices. */
  tradeDiscountPercent?: number;
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
  /** Parts: already in the garage, to be ordered from a shop by the garage, or bought by the owner ('owner', through OnMart). */
  source?: 'stock' | 'order' | 'owner';
  /** Owner-bought parts: the part number to match, and the shops the garage recommends (PartsShop ids). */
  partNo?: string;
  recommendedShopIds?: string[];
  /** Estimated price for the whole line (LKR). */
  price: number;
  /** Parts: photos of this part (the worn one, the damage), so the owner sees what is meant. */
  photos?: string[];
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
export type OwnerDecision = {
  approvedLineIds: string[];
  declinedLineIds: string[];
  decidedAt: number;
  /** In the owner's app (default), told by phone to the garage / technician (no code), or left for later because the owner couldn't be reached. */
  via?: 'app' | 'phone' | 'deferred';
};

/** Work found mid-repair; same approval rule as the diagnosis. */
export type ExtraWorkRequest = {
  id: string;
  reason: string;
  photos?: string[];
  voiceNotes?: VoiceNote[];
  lines: DiagnosisLine[];
  sentAt: number;
  decision?: OwnerDecision;
  /** The owner couldn't be reached: the job waits (free for the garage) until they answer or the garage picks another way. */
  waitingSince?: number;
};

/** What kind of routine service was done. */
export type ServiceKind = 'full' | 'oil' | 'fluids';
export type ServiceFluid = 'engineOil' | 'transmission' | 'brakeFluid' | 'powerSteering';

/** The record of a routine service, written by the garage at handover: what was done, the mileage and the next service. */
export type ServiceDetails = {
  kind: ServiceKind;
  /** The fluids that were changed. */
  fluids: ServiceFluid[];
  /** The odometer reading when the vehicle came in. */
  mileageKm: number;
  nextServiceKm?: number;
  /** When the next service is due (the owner is reminded before it). */
  nextServiceAt?: number;
  /** Anything else worth keeping (filters changed, tyre pressures, advice). */
  notes?: string;
};

export type HandoverReport = {
  /** Routine service only: what was done, the mileage and the next service (the garage fills this in). */
  service?: ServiceDetails;
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
/** The owner cancelled a job with the garage they chose: why, an optional note, and how they rated the garage so far (1-5). */
/**
 * What was paid for a closed job. Closing with the owner's code says the work was handed over, not that it was paid: when the garage closes the job it records what it
 * actually received; if that is less than the bill, the rest is a balance the owner promised to pay by a date. The owner confirms the record (or disputes it).
 * The money itself never moves through the app.
 */
export type JobPayment = {
  /** The bill (labour and parts). */
  total: number;
  received: number;
  balance: number;
  status: 'paid' | 'partial';
  /** When the owner promised to pay the balance. */
  promisedAt?: number;
  note?: string;
  recordedAt: number;
  /** The owner's answer to the garage's record: a full payment needs none (confirmed from the start). */
  confirm: 'pending' | 'confirmed' | 'disputed';
  disputeNote?: string;
  decidedAt?: number;
  /** How many times the garage said the promised payment did not arrive. */
  missedCount?: number;
  /** Set when the garage said it did not arrive, until the customer names a new day. */
  missedAt?: number;
  /** The customer says they paid; the garage confirms (the money is then received) or denies it. */
  claim?: { amount: number; at: number; status: 'pending' | 'confirmed' | 'denied' };
  /** Payments received after the first record. */
  installments?: { amount: number; at: number }[];
};

/** What a garage says about a customer after a closed job: stars and fixed reasons (not free-form accusations), an optional short note. */
export type CustomerTag = 'paidOnTime' | 'polite' | 'onTime' | 'clearBrief' | 'paidLate' | 'unpaid' | 'noShow' | 'rude';

export type CustomerRating = {
  id: string;
  jobId: string;
  /** The garage that rated (the customer sees it; other garages do not). */
  garage: string;
  stars: number;
  tags: CustomerTag[];
  note?: string;
  at: number;
  /** The customer's answer, shown with the rating. */
  reply?: { text: string; at: number };
  /** The customer disputes it: until it is settled the rating does not count in the public record. */
  dispute?: { note: string; at: number; status: 'open' | 'upheld' | 'withdrawn' };
};

/** The record other garages see for a customer: made from their payments and the ratings garages gave. */
export type CustomerRecord = {
  level: 'new' | 'good' | 'fair' | 'poor';
  jobs: number;
  paidInFull: number;
  paidLate: number;
  unpaid: number;
  owed: number;
  rated: number;
  avgStars?: number;
  topTags: { tag: CustomerTag; count: number }[];
  /** Ratings left out while the customer's dispute is open. */
  disputed: number;
};

/** The owner asks the garage to fit another part to the vehicle while a job runs; the garage accepts it (and quotes it as extra work) or declines with a reason. */
export type PartFitRequest = {
  id: string;
  partName: string;
  supply: 'owner' | 'garage';
  note?: string;
  status: 'requested' | 'accepted' | 'declined';
  requestedAt: number;
  decidedAt?: number;
  declineReason?: string;
  /** A part the customer brings (supply "owner"): when the garage confirmed it received it (handed over with the vehicle). */
  partReceivedAt?: number;
};

/** The owner's request to cancel a job in progress: the garage answers it with its compensation for the work done so far, then the owner decides. */
export type CancelRequest = {
  status: 'requested' | 'quoted';
  requestedAt: number;
  reason: string;
  note?: string;
  /** The garage's answer: what it charges (LKR) for the work done so far, and what that covers. */
  compensation?: number;
  workDone?: string;
  quotedAt?: number;
};

/** A job the owner cancelled (the garage approved and the owner accepted its compensation): why, a note, how they rated the garage, and what they owe it. */
export type JobCancellation = { at: number; by: 'owner'; reason: string; note?: string; rating?: number; compensation?: number; workDone?: string; /** What it cost, as the owner was told. */ feeNote?: string };

export type WorkshopProgress = {
  stage: WorkshopStage;
  checkInPhotos?: string[];
  receivedAt?: number;
  /** The owner confirmed (in their app) that they really handed the vehicle over, after the garage said it had received it. */
  handoverConfirmedAt?: number;
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
  /** Done by a Premier garage: covered by the OnGarage Guarantee (capped). */
  protected?: boolean;
  /** The owner's OnGarage Guarantee claim, if any. */
  guaranteeClaim?: GuaranteeClaim;
  /** Requests to fit another part (the owner's "fit a new part"), answered by the garage. */
  fitRequests?: PartFitRequest[];
  /** What was paid once the job closed (see JobPayment); missing until the garage records it. */
  payment?: JobPayment;
  /** The garage's rating of the customer (see marketplace/customerRating.ts); one per closed job. */
  customerRating?: CustomerRating;
  /** The owner asked to cancel the job and waits for the garage's compensation (see marketplace/cancel.ts); the work is on hold. */
  cancelRequest?: CancelRequest;
  /** The owner cancelled the job before handover: the work stops (see marketplace/cancel.ts). */
  cancelled?: JobCancellation;
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

// ---------- OnMart (owners, garages and parts shops) ----------
// The spare-parts marketplace. An owner (or a garage) finds a part at nearby shops, asks
// every shop, or posts the request on the open wall for the whole country. A shop answers
// "I have it" with an offer; the buyer reserves it and collects it (showing a purchase code)
// or has it delivered. When a garage tells the owner to buy a part ('owner' lines), the shops it
// recommends are recorded as referrals that both the garage and the shop can see.

export type PartVehicle = { name: string; plate: string; type: string; make?: string; model?: string; year?: number; chassisNo?: string; engineNo?: string };

/** One part being looked for, with what a shop needs to be sure it is the right one. */
export type PartBrief = {
  id: string;
  /** Canonical part name where known (see ai PART_WORDS), else what the buyer wrote. */
  name: string;
  qty: number;
  partType: PartType;
  partNo?: string;
  note?: string;
  photos?: string[];
  voiceNotes?: VoiceNote[];
  vehicle: PartVehicle;
  /** Service category (SERVICE_CATEGORIES id) the part belongs to, used to match shops. */
  categoryId?: string;
};

/** Who is asked: the shops near the buyer, the open wall (every shop in the country), or both. */
export type MartAudience = 'shops' | 'wall' | 'both';

/** How far the search has reached: nearby, then wider, then the whole country. */
export type SearchRing = 'nearby' | 'wider' | 'nationwide';

/** What OnMart measures about a shop (a backend keeps these; the apps simulate them). */
export type ShopStats = {
  /** Average minutes the shop takes to answer an enquiry. */
  avgResponseMin: number;
  /** Share of orders it fulfilled (0–1). */
  fulfilmentRate: number;
  /** Share of "in stock" answers that really were in stock (0–1). */
  stockAccuracy: number;
  /** Share of orders sent back as the wrong part (0–1). */
  wrongPartRate: number;
  /** Share of orders it cancelled after accepting (0–1). */
  cancelRate: number;
  ordersDone: number;
  /** Price against the market reference (1 = list price; lower is cheaper). */
  priceLevel: number;
  /** Share of its "have it" answers the buyer confirmed (0–1): the catalogue-era counterpart of stockAccuracy. */
  answerAccuracy?: number;
  /** How many "have it" answers that share is measured over. */
  answersDone?: number;
};

/** A shop as buyers see it in OnMart. */
export type ShopListing = PartsShop & {
  coords: LatLng;
  district: string;
  openHours: string;
  isOpen: boolean;
  types: Exclude<PartType, 'GarageChoice'>[];
  /** Service categories it stocks parts for (SERVICE_CATEGORIES ids). */
  categories: string[];
  /** Keeps its stock up to date, so availability is shown live. */
  liveStock: boolean;
  courier: boolean;
  ownDelivery: boolean;
  counterPickup: boolean;
  stats: ShopStats;
  /** Referral commission the shop offers garages, % of parts value (never shown in rankings). */
  referralPercent?: number;
  /** The kinds of part it sells and for which vehicles (no live stock needed): what searches are matched against. */
  catalogue?: ShopCatalogue;
};

/** The job a part is bought for, and who recommended where to buy it. */
export type JobPartsRef = {
  bookingId: string;
  lineId: string;
  garage: { id: string; name: string };
  recommendedShopIds: string[];
};

export type PartEnquiryStatus = 'open' | 'reserved' | 'bought' | 'cancelled' | 'expired';

export type PartEnquiry = {
  id: string;
  /** What shops and the wall see of the buyer (the wall never shows a phone number). */
  buyer: { name: string; phone?: string };
  briefs: PartBrief[];
  audience: MartAudience;
  ring: SearchRing;
  /** The exact search radius the owner chose on the map (km); without it the ring decides (past 50 km: every shop in the country). */
  radiusKm?: number;
  coords: LatLng;
  jobRef?: JobPartsRef;
  /** Requests asked together (a job's parts, a service kit) share a batch: they are read as one group (marketplace/partsBatch.ts); each part is still answered on its own. */
  batchId?: string;
  batchTitle?: string;
  /** This part's place in its basket (0-based) and how many parts the basket has. */
  batchIndex?: number;
  batchSize?: number;
  createdAt: number;
  /** Shops can answer until this time. */
  quoteUntil: number;
  status: PartEnquiryStatus;
};

/** A shop's answer to one part of an enquiry. */
export type ShopOffer = {
  id: string;
  enquiryId: string;
  briefId: string;
  shop: PartsShop;
  /** What the shop answered: have it, don't, or will check (older offers carry only `available`). */
  reply?: ShopReplyKind;
  /** The neighbour shops it points the buyer to (PartsShop ids), when it does not have the part. */
  suggestedShopIds?: string[];
  available: boolean;
  partType: Exclude<PartType, 'GarageChoice'>;
  brand?: string;
  unitPrice: number;
  qty: number;
  total: number;
  /** The shop checked the part against the vehicle's chassis / engine number. */
  fitmentConfirmed: boolean;
  warrantyMonths: number;
  /** Minutes until it is ready at the counter after the buyer reserves it. */
  readyInMin: number;
  /** Hours the shop holds it for the buyer. */
  holdHours: number;
  delivery?: { courier?: string; fee: number; etaMin: number };
  note?: string;
  /** A running deal on this part at this shop: the discount, and the unit price before it. */
  dealPercent?: number;
  wasUnitPrice?: number;
  at: number;
  /** "Will check": the time the shop promised to answer by (finding a part takes time, and that is the shop's to ask for, not the buyer's to wait out). */
  checkUntil?: number;
};

export type PartPurchaseStatus = 'reserved' | 'bought' | 'rejected' | 'released' | 'returned';

/** A reserved part, then bought at the counter (the purchase code is shown there) or delivered. */
export type PartPurchase = {
  id: string;
  enquiryId?: string;
  offerId: string;
  briefId: string;
  shop: PartsShop;
  /** Six digits (and QR) shown at the shop; for job parts it also proves the purchase to the garage. */
  code: string;
  status: PartPurchaseStatus;
  fulfilment: 'pickup' | 'delivery';
  reservedUntil: number;
  /** What was actually paid for the part (the shop enters it when it verifies the code). */
  amount?: number;
  invoiceNo?: string;
  boughtAt?: number;
  rejectedReason?: string;
  /** Last day the part can be brought back. */
  returnBy?: number;
  jobRef?: JobPartsRef;
  /** Parts of one basket reserved together at one shop share a group, and so one purchase code; each part is still inspected and paid on its own. */
  groupId?: string;
};

export type ReferralStatus = 'recommended' | 'viewed' | 'reserved' | 'purchased' | 'fitted' | 'returned' | 'lapsed';

/** A garage sent an owner to a shop for a part: both sides see this record. */
export type PartReferral = {
  id: string;
  garage: { id: string; name: string };
  shop: { id: string; name: string };
  bookingId: string;
  lineId: string;
  partName: string;
  status: ReferralStatus;
  history: { status: ReferralStatus; at: number }[];
  /** What the owner paid the shop (set when the purchase is verified). */
  amount?: number;
  /** % of parts value the shop pays the garage; the owner is told before choosing. */
  commissionPercent: number;
  /** Earned only when the part was fitted and the job closed with the owner's code. */
  commission?: number;
  jobClosedAt?: number;
  disclosed: boolean;
  recommendedAt: number;
};

/** One month of referrals between a garage and a shop, as either of them sees it. */
export type ReferralStatement = {
  month: string;
  garageId: string;
  shopId: string;
  referrals: number;
  purchases: number;
  returned: number;
  partsValue: number;
  commission: number;
};

export type PartsQuickAsk = 'available' | 'price' | 'fits' | 'holdIt' | 'photo' | 'delivery';

/** The chat between a vehicle owner and a garage about one job. */
export type ChatSide = 'owner' | 'garage' | 'shop' | 'tech';
/** A parts shop tagged in a chat message ("@Galle Auto Parts"): tapping it goes to that shop in OnMart. */
export type ChatShopTag = { id: string; name: string };

export type ChatMessage = { id: string; from: ChatSide; /** Parts shops tagged in the text (each appears in the text as "@name"). */ shops?: ChatShopTag[]; text?: string; photos?: string[]; /** Voice notes (a recorded description instead of typing). */ voiceNotes?: VoiceNote[]; at: number; /** The sender changed the text after sending it. */ edited?: boolean; /** The sender took it back: its text and photos are gone. */ deleted?: boolean; /** A note the app puts in the chat (the job's record), shown in the middle, not as a bubble. */ record?: boolean; /** A line the app writes into the chat as the job goes on (a step done, a part, a call): shown in the middle, not as a bubble. */ update?: boolean; /** The message carries a report (the diagnosis, extra work, the handover): a chip under it opens that report. */ report?: { kind: 'diagnosis' | 'extra' | 'handover'; id?: string } };

export type PartsMessage = {
  id: string;
  from: 'buyer' | 'shop';
  quick?: PartsQuickAsk;
  text?: string;
  photos?: string[];
  /** A recorded description instead of typing (the same voice notes as in OnChat). */
  voiceNotes?: VoiceNote[];
  at: number;
  /** The off-platform check flagged a phone number or payment move. */
  flagged?: boolean;
  /** The sender changed the text after sending it. */
  edited?: boolean;
  /** The sender took it back: its text and photos are gone. */
  deleted?: boolean;
};

/** A conversation between a buyer and one shop about one enquiry. */
export type PartsThread = { id: string; enquiryId: string; shopId: string; messages: PartsMessage[] };

// ---------- OnMart promotions (banners, offers, deals) ----------
// What OnMart's landing page shows beyond the plain shop list. Banners and the Featured shop row are paid placements:
// always labelled as ads and kept apart from the organic rows, which ads never change. Deals are discounts a shop
// puts on a part it has in stock, for a limited time.

export type MartGradientStop = { offset: string; color: string };

/** Where a banner or offer tile leads. */
export type MartTarget = { kind: 'shop'; shopId: string } | { kind: 'search'; query: string } | { kind: 'kit'; kitId: string } | { kind: 'wall' } | { kind: 'deals' };

/** A paid banner from a shop (always labelled as an ad). */
export type MartBanner = { id: string; shopId: string; title: string; subtitle: string; cta: string; emoji: string; stops: MartGradientStop[]; target: MartTarget; endsAt?: number };

/** A coloured offer tile: a short title, one line, a big emoji, and where it leads. */
export type MartOffer = { id: string; title: string; subtitle: string; emoji: string; stops: MartGradientStop[]; target: MartTarget; endsAt?: number };

/** A shop's limited-time discount on one part it has in stock. */
export type ShopDeal = { id: string; shopId: string; partName: string; partType: Exclude<PartType, 'GarageChoice'>; discountPercent: number; endsAt: number };

/** A round icon on the landing page's part strip (the service-category photo, and the search it opens). */
export type PartGroup = { id: string; name: string; emoji: string; serviceCategoryId: string; query: string };


// ---------- OnMart catalogue (a shop says what it sells, not what it has) ----------

export type VehicleKind = 'car' | 'commercial' | 'bike' | 'threewheeler';

/** A group of part kinds (Brakes, Lights…); `serviceCategoryId` is the SERVICE_CATEGORIES id it belongs to. */
export type PartTaxonomyGroup = { id: string; name: string; si: string; icon: string; serviceCategoryId: string };

/** One kind of part a shop can say it sells, with the words a buyer may type for it and its variants (Halogen / LED…). */
export type PartTaxonomyPart = { id: string; groupId: string; name: string; si: string; words: string[]; variants?: string[] };

/** A vehicle a part is sold for: a make, optionally narrowed to models and to chassis / model codes (NZE141). */
export type CatalogueVehicleTag = { make: string; models?: string[]; codes?: string[] };

/**
 * One line of a shop's catalogue: a part kind (or, with no `partId`, every part of the group), the vehicles it sells it for
 * (empty = any vehicle), the brands and part types it deals in.
 */
export type ShopCatalogueEntry = {
  id: string;
  groupId: string;
  partId?: string;
  vehicles: CatalogueVehicleTag[];
  brands: string[];
  partTypes: Exclude<PartType, 'GarageChoice'>[];
  /** Variants it deals in (e.g. LED headlights), when the part kind has variants. */
  variants?: string[];
  note?: string;
  addedAt: number;
};

export type ShopCatalogue = ShopCatalogueEntry[];

/** What a buyer is looking for, to be matched against shops' catalogues. */
export type CatalogueQuery = {
  partId?: string;
  groupId?: string;
  vehicle?: { make?: string; model?: string; code?: string; year?: number };
  partType?: PartType;
  brand?: string;
};

/** How a catalogue covers a query: how close the vehicle fit is, whether it was the part or its whole group, and the entry. */
export type CatalogueMatch = { tier: 'exact' | 'model' | 'make' | 'any'; scope: 'part' | 'group'; entry: ShopCatalogueEntry };

/** A shop's answer to a request: it has the part, it has not, or it will check and say. */
export type ShopReplyKind = 'have' | 'none' | 'check';
