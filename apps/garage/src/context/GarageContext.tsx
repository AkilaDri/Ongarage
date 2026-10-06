import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  breakdownInfo,
  computeIntake,
  dayStart,
  FAIRNESS,
  fairnessFlags,
  firstDayWithRoom,
  isRisingGarage,
  planFor,
  PLANS,
  RISING_HEAD_START_MIN,
  valueGuarantee,
  computeTrustScore,
  currentLevel,
  effectiveLevel,
  entitlementsFor,
  LEVELS,
  categoryInfo,
  DEFAULT_WARRANTY_MONTHS,
  distanceKm,
  marketPrice,
  newWorkshopProgress,
  offsetCoordinate,
  warrantyEnd,
  workshopBill,
  type DiagnosisReport,
  type IntakeStatus,
  type SubscriptionPlan,
  type SubscriptionPlanId,
  type Feature,
  type Level,
  type LevelStats,
  type TrustScore,
  type ExtraWorkRequest,
  type HandoverReport,
  type WorkshopProgress,
} from '@ongarage/shared';
import {
  BID_DECISION_MS,
  BOOKINGS,
  DIRECT_ARRIVAL_MS,
  DIRECT_POOL,
  DIRECT_RESPONSE_MIN,
  FEED_ARRIVAL_MS,
  FEED_POOL,
  GARAGE,
  RATING_HISTORY,
  TRUST_HISTORY,
  FAIRNESS_SEED,
  REVIEWS,
  SOS_ARRIVAL_MS,
  SOS_POOL,
  TEAM,
} from '../constants/mockData';
import { formatDate } from '../utils/format';
import type { Attendance, Booking, DirectRequest, Dispatch, DispatchStage, FeedJob, GarageProfile, JobDetails, MyBid, Notice, Review, SOSRequest, TeamMember } from '../types';

const MIN = 60 * 1000;
const REQUEST_TTL_MS = 4 * MIN; // after this another garage is assumed to have taken it
const MAX_PENDING_REQUESTS = 3;
const CUSTOMER_REPLY_MS = 3500;
// Simulated technician-app steps (compressed). DRIVE_MS matches the dispatch screen's trip.
const TECH_ACCEPT_MS = 3000;
const DRIVE_MS = 18000;
const TECH_STEP_MS = 2500;

const today = () => new Date().toDateString();
const HOUR = 60 * MIN;
/** An owner accepts a garage's other time only if it is within a day of what they asked for. */
const OWNER_ACCEPTS_WITHIN_MS = 24 * HOUR;
/** Two workshop bookings closer than this overlap. */
const BOOKING_SLOT_MS = 90 * MIN;

/** A booking this garage already has around that time, if any. */
export const scheduleClash = (bookings: Booking[], at: number) =>
  bookings.find((b) => b.status !== 'completed' && Math.abs(b.scheduledAt - at) < BOOKING_SLOT_MS) ?? null;

const makeDirect = (i: number, garage: GarageProfile, now: number): DirectRequest => {
  const { address, km, bearing, requestedMinAgo, day, hour, ...seed } = DIRECT_POOL[i];
  const coords = offsetCoordinate(garage.coords, km, bearing);
  const preferred = new Date(now + day * 24 * HOUR);
  preferred.setHours(hour, 0, 0, 0);
  const requestedAt = now - requestedMinAgo * MIN;
  return {
    ...seed,
    id: `direct-${i}-${now}`,
    requestedAt,
    // A same-day slot that has already passed moves to tomorrow.
    preferredAt: preferred.getTime() > now ? preferred.getTime() : preferred.getTime() + 24 * HOUR,
    respondBy: requestedAt + DIRECT_RESPONSE_MIN * MIN,
    status: 'new',
    location: { address, coords },
    distanceKm: Number(distanceKm(garage.coords, coords).toFixed(1)),
  };
};

const bookingFrom = (job: JobDetails, source: Booking['source'], at: number, price: number, note?: string, warrantyMonths = DEFAULT_WARRANTY_MONTHS): Booking => {
  const cat = categoryInfo(job.categoryId);
  return {
    job,
    progress: newWorkshopProgress(),
    warrantyMonths,
    note: note || undefined,
    // A walk-in owner gets the garage's location and phone with the confirmation.
    locationSharedAt: job.doorstep ? undefined : Date.now(),
    id: `b-${job.id}`,
    source,
    title: cat.name,
    icon: cat.icon,
    customer: job.customer,
    vehicle: job.vehicle,
    address: job.location.address,
    coords: job.location.coords,
    doorstep: job.doorstep,
    scheduledAt: at,
    price,
    status: 'scheduled',
  };
};

const makeRequest = (i: number, garage: GarageProfile, at: number): SOSRequest => {
  const seed = SOS_POOL[i % SOS_POOL.length];
  const coords = offsetCoordinate(garage.coords, seed.km, seed.bearing);
  return {
    id: `sos-${at}-${i}`,
    customer: seed.customer,
    vehicle: seed.vehicle,
    breakdownId: seed.breakdownId,
    note: seed.note,
    location: { address: seed.address, coords },
    distanceKm: Number(distanceKm(garage.coords, coords).toFixed(1)),
    calloutFee: seed.calloutFee,
    requestedAt: at,
  };
};

const makeFeedJob = (i: number, garage: GarageProfile, now: number): FeedJob => {
  const { address, km, bearing, postedMinAgo, ...seed } = FEED_POOL[i];
  const coords = offsetCoordinate(garage.coords, km, bearing);
  return {
    ...seed,
    id: `job-${i}`,
    postedAt: now - postedMinAgo * MIN,
    location: { address, coords },
    distanceKm: Number(distanceKm(garage.coords, coords).toFixed(1)),
  };
};

/**
 * Review and quote are only "considering": nothing has been promised to the
 * customer, so the request can go back to the inbox. From the quote onwards the
 * garage has promised a crew, and the job holds one present mechanic.
 */
export const isCommitted = (d: Dispatch | null | undefined): boolean => !!d && d.stage !== 'review' && d.stage !== 'quote' && d.stage !== 'done';

export const bidDeadline = (job: FeedJob) => job.postedAt + job.biddingHours * 60 * MIN;

/** A bid wins when it is at or under the category's typical market price. */
const bidWins = (job: FeedJob, price: number) => price <= marketPrice(job.categoryId) * 1.05;

/**
 * SOS capacity. A garage may hold as many committed SOS jobs as it has mechanics
 * present *today* (confirmed register) — never more, or it would take work another
 * garage could have done. Each committed job holds one present mechanic, even
 * before a specific person is assigned.
 */
export type Crew = {
  total: number;
  confirmed: boolean;
  presentIds: string[];
  /** Present but on a break right now; not available for a job. */
  breakIds: string[];
  onJobIds: string[];
  committedJobs: number;
  /** Present, not on a break, and not holding a committed job. */
  free: number;
};

const computeCrew = (team: TeamMember[], attendance: Attendance, dispatches: Dispatch[]): Crew => {
  const confirmed = attendance.date === today();
  const presentIds = confirmed ? attendance.presentIds.filter((id) => team.some((m) => m.id === id)) : [];
  const committed = dispatches.filter(isCommitted);
  const onJobIds = committed.map((d) => d.mechanicId).filter((id): id is string => !!id);
  const breakIds = confirmed ? attendance.breakIds.filter((id) => presentIds.includes(id) && !onJobIds.includes(id)) : [];
  return {
    total: team.length,
    confirmed,
    presentIds,
    breakIds,
    onJobIds,
    committedJobs: committed.length,
    free: Math.max(0, presentIds.length - breakIds.length - committed.length),
  };
};

/** Why a new SOS cannot be taken right now (null = it can). */
export const sosBlockReason = (isOpen: boolean, crew: Crew): string | null => {
  if (!isOpen) return 'ඔබ නොබැඳියි';
  if (!crew.confirmed) return 'අද පැමිණීම තහවුරු කර නැත';
  if (crew.presentIds.length === 0) return 'අද කාර්මිකයන් පැමිණ නැත';
  if (crew.free === 0) return crew.breakIds.length ? 'නිදහස් කාර්මිකයන් නැත (විවේකයේ / රැකියාවල)' : 'සියලු කාර්මිකයන් රැකියාවල';
  return null;
};

type GarageState = {
  profile: GarageProfile;
  isOpen: boolean;
  team: TeamMember[];
  crew: Crew;
  /** null when a new SOS can be taken; otherwise a short reason to show. */
  sosBlocked: string | null;
  requests: SOSRequest[];
  /** The job currently open on screen (if any). */
  dispatch: Dispatch | null;
  /** Committed SOS jobs running in parallel. */
  activeJobs: Dispatch[];
  feed: FeedJob[];
  /** Owners who booked this garage directly; only this garage sees them. */
  directs: DirectRequest[];
  bids: MyBid[];
  bookings: Booking[];
  reviews: Review[];
  rating: { average: number; count: number };
  /** Trust score from the four rating dimensions and how jobs went (shared rules). */
  trust: TrustScore;
  levelStats: LevelStats;
  /** The level in effect (kept through the grace period after falling below it). */
  level: Level;
  /** The level the numbers support right now. */
  earnedLevel: Level;
  /** Days left to recover before the level drops (when below it). */
  graceDaysLeft?: number;
  /** Is a level feature switched on for this garage? */
  has: (f: Feature) => boolean;

  // Fair share and subscription (shared fairness rules)
  /** Why monitoring flagged this garage (empty = not flagged). */
  fairnessReasons: string[];
  /** When the daily limit starts (after the notice period). */
  limitFrom?: number;
  /** New work (value) on a day: limit, used, room. */
  intakeOn: (day: number) => IntakeStatus;
  /** A newer high-score garage sees new bid jobs first; others wait until this time. */
  headStartUntil: (job: FeedJob) => number | undefined;
  subscription: { plan: SubscriptionPlan; since: number } | null;
  /** The band the garage's app earnings put it in (the price it would pay). */
  recommendedPlan: SubscriptionPlan;
  subscribe: (plan: SubscriptionPlanId) => void;
  cancelSubscription: () => void;
  /** Won work this month and the value guarantee for the plan's fee. */
  monthWon: number;
  valueCheck: { target: number; met: boolean; credit: number } | null;
  notice: Notice | null;

  setOpen: (open: boolean) => void;
  toggleService: (categoryId: string) => void;
  setCoverage: (km: number) => void;

  addMember: (member: Omit<TeamMember, 'id'>, presentToday: boolean) => void;
  removeMember: (id: string) => boolean;
  confirmAttendance: (presentIds: string[]) => void;
  setPresent: (id: string, present: boolean) => boolean;
  /** Lunch or a short errand: the mechanic stays present but can't be dispatched. */
  setOnBreak: (id: string, onBreak: boolean) => boolean;

  declineRequest: (id: string) => void;
  openDispatch: (requestId: string) => void;
  resumeDispatch: (id: string) => void;
  /** Leave the open job: done → closed, committed → minimised, considering → back to the inbox. */
  leaveDispatch: () => void;
  setStage: (stage: DispatchStage) => void;
  sendQuote: (price: number, etaMin: number) => boolean;
  assignCrew: (mechanicId: string, vanId: string) => void;
  toggleTask: (index: number) => void;
  /** Set the final repair charge after inspection (needed=false: call-out fee only). */
  setRepair: (amount: number, needed: boolean) => void;
  completeRepair: () => void;
  confirmQrScan: () => void;
  /** Drop the open job entirely (declined at review, or finished). */
  closeDispatch: () => void;
  /** The technician asked for a repair charge above the quote. */
  approveRepairPrice: (approved: boolean) => void;
  /** Stop following the technician app and record the steps here. */
  takeOverDispatch: () => void;

  placeBid: (job: FeedJob, bid: Pick<MyBid, 'price' | 'warrantyMonths' | 'estHours' | 'note'>) => void;
  withdrawBid: (bidId: string) => void;

  /** Accept a direct booking at the owner's slot, or offer another time (the owner then decides). */
  answerDirect: (id: string, reply: { at: number; estimate: number; note: string }) => void;
  declineDirect: (id: string, reason: string) => void;

  /** Re-send the garage's location and phone to a walk-in customer. */
  shareLocation: (id: string) => void;

  // Workshop jobs (bid and direct bookings): see the shared WorkshopProgress.
  /** Vehicle received (or arrived at the owner's door), with condition photos. */
  receiveVehicle: (id: string, photos: string[]) => void;
  /** Send the diagnosis; the owner approves all, some or none of its lines. */
  sendDiagnosis: (id: string, report: DiagnosisReport) => void;
  /** Work found mid-repair: the owner approves it like the diagnosis; handover waits for the answer. */
  requestExtraWork: (id: string, extra: ExtraWorkRequest) => void;
  markReadyForHandover: (id: string, report: HandoverReport) => void;
  /** The owner reported a problem at handover: back to repairing. */
  startRework: (id: string) => void;
  /** The owner's QR / code checked out: close, start the warranty, book the money. */
  closeWorkshopJob: (id: string) => void;
  assignTech: (id: string, memberId: string) => void;

  replyReview: (id: string, text: string) => void;

  dismissNotice: () => void;
  /** Show a toast (used by the parts store). */
  notify: (n: Omit<Notice, 'id'>) => void;
  /** Add received parts to a booking's separate parts bill. */
  addPartsCost: (bookingId: string, amount: number) => void;
};

const GarageContext = createContext<GarageState | null>(null);

export const GarageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<GarageProfile>(GARAGE);
  const [isOpen, setIsOpen] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>(TEAM);
  // Not confirmed for today until the owner says who came to work.
  const [attendance, setAttendance] = useState<Attendance>({ date: '', presentIds: [], breakIds: [] });
  const [requests, setRequests] = useState<SOSRequest[]>(() => {
    const now = Date.now();
    return [makeRequest(0, GARAGE, now - 40 * 1000), makeRequest(1, GARAGE, now - 95 * 1000)];
  });
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedJob[]>(() => FEED_POOL.slice(0, 4).map((_, i) => makeFeedJob(i, GARAGE, Date.now())));
  const [directs, setDirects] = useState<DirectRequest[]>(() => [makeDirect(0, GARAGE, Date.now()), makeDirect(1, GARAGE, Date.now())]);
  const [bids, setBids] = useState<MyBid[]>([]);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(REVIEWS);
  const [notice, setNotice] = useState<Notice | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const noticeId = useRef(0);
  const notify = useCallback((n: Omit<Notice, 'id'>) => setNotice({ ...n, id: ++noticeId.current }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const crew = useMemo(() => computeCrew(team, attendance, dispatches), [team, attendance, dispatches]);
  const sosBlocked = sosBlockReason(isOpen, crew);

  // Latest values for timers, intervals and guards.
  const live = useRef({ profile, isOpen, feed, directs, bids, dispatches, openId, team, attendance, crew, requests });
  live.current = { profile, isOpen, feed, directs, bids, dispatches, openId, team, attendance, crew, requests };
  // Any day's room for new work (set below, once bookings and the plan are known).
  const intakeRef = useRef<(day: number) => IntakeStatus>(() => ({ limited: false, limit: Infinity, used: 0, remaining: Infinity, reached: false }));

  const findDispatch = (id: string | null) => (id ? live.current.dispatches.find((d) => d.id === id) : undefined);
  const patch = useCallback((id: string, change: Partial<Dispatch> | ((d: Dispatch) => Partial<Dispatch>)) => {
    setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, ...(typeof change === 'function' ? change(d) : change) } : d)));
  }, []);

  // Owners' SOS broadcasts keep arriving while the garage is open, but only from
  // inside its coverage radius; unanswered ones lapse.
  const poolIndex = useRef(2);
  useEffect(() => {
    if (!isOpen) return;
    const arrive = setInterval(() => {
      const { profile: p } = live.current;
      setRequests((prev) => {
        if (prev.length >= MAX_PENDING_REQUESTS) return prev;
        const next = makeRequest(poolIndex.current++, p, Date.now());
        if (next.distanceKm > p.coverageKm) return prev;
        notify({ icon: '🚨', title: 'නව SOS ඉල්ලීමක්', body: `${breakdownInfo(next.breakdownId).label} · කි.මී. ${next.distanceKm}`, tone: 'danger' });
        return [next, ...prev];
      });
    }, SOS_ARRIVAL_MS);
    return () => clearInterval(arrive);
  }, [isOpen, notify]);

  useEffect(() => {
    const sweep = setInterval(() => {
      const cutoff = Date.now() - REQUEST_TTL_MS;
      setRequests((prev) => (prev.some((r) => r.requestedAt < cutoff) ? prev.filter((r) => r.requestedAt >= cutoff) : prev));
    }, 5000);
    return () => clearInterval(sweep);
  }, []);

  // One more owner posts a job a little later, so the feed is visibly live.
  useEffect(() => {
    const t = setTimeout(() => {
      const job = makeFeedJob(4, live.current.profile, Date.now());
      job.postedAt = Date.now();
      setFeed((prev) => [job, ...prev]);
      if (live.current.profile.services.includes(job.categoryId)) {
        notify({ icon: '🔨', title: 'නව රැකියාවක් පළ විය', body: `${categoryInfo(job.categoryId).name} · කි.මී. ${job.distanceKm}`, tone: 'primary' });
      }
    }, FEED_ARRIVAL_MS);
    return () => clearTimeout(t);
  }, [notify]);

  // A direct booking arrives a little later; unanswered ones lapse so the owner can go elsewhere.
  useEffect(() => {
    const t = setTimeout(() => {
      const d = makeDirect(2, live.current.profile, Date.now());
      setDirects((prev) => [d, ...prev]);
      notify({ icon: '📅', title: 'ඍජු වෙන්කිරීම් ඉල්ලීමක්', body: `${d.customer.name} ඔබව තෝරා ගත්තා · ${categoryInfo(d.categoryId).name}`, tone: 'primary' });
    }, DIRECT_ARRIVAL_MS);
    const sweep = setInterval(() => {
      const now = Date.now();
      const lapsed = live.current.directs.filter((d) => d.status === 'new' && d.respondBy <= now);
      if (!lapsed.length) return;
      setDirects((prev) => prev.filter((d) => !lapsed.some((l) => l.id === d.id)));
      notify({ icon: '⌛', title: 'ඍජු ඉල්ලීමක් කල් ඉකුත් විය', body: `${lapsed[0].customer.name} හට දැන් වෙනත් ගරාජයක් තෝරා ගත හැක.`, tone: 'danger' });
    }, 5000);
    return () => {
      clearTimeout(t);
      clearInterval(sweep);
    };
  }, [notify]);

  // ---------- Profile ----------
  const setOpen = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      notify(
        open
          ? { icon: '🟢', title: 'ඔබ දැන් සබැඳියි', body: 'SOS ඉල්ලීම් සහ රැකියා ලැබීම ආරම්භ විය.', tone: 'success' }
          : { icon: '⏸️', title: 'ඔබ දැන් නොබැඳියි', body: 'නව SOS ඉල්ලීම් නොලැබේ.', tone: 'primary' }
      );
    },
    [notify]
  );
  const toggleService = useCallback((id: string) => {
    setProfile((p) => ({ ...p, services: p.services.includes(id) ? p.services.filter((s) => s !== id) : [...p.services, id] }));
  }, []);
  const setCoverage = useCallback((km: number) => setProfile((p) => ({ ...p, coverageKm: km })), []);

  // ---------- Team & attendance ----------
  const addMember = useCallback((member: Omit<TeamMember, 'id'>, presentToday: boolean) => {
    const id = `m-${Date.now()}`;
    setTeam((t) => [...t, { ...member, id }]);
    if (presentToday && live.current.crew.confirmed) setAttendance((a) => ({ ...a, presentIds: [...a.presentIds, id] }));
  }, []);

  const removeMember = useCallback(
    (id: string) => {
      const { crew: c, team: t } = live.current;
      if (c.onJobIds.includes(id)) {
        notify({ icon: '⛔', title: 'ඉවත් කළ නොහැක', body: 'මෙම කාර්මිකයා දැනට SOS රැකියාවක සිටී.', tone: 'danger' });
        return false;
      }
      // Removing a present mechanic must not leave fewer present than promised jobs.
      if (c.presentIds.includes(id) && !c.breakIds.includes(id) && c.presentIds.length - c.breakIds.length - 1 < c.committedJobs) {
        notify({ icon: '⛔', title: 'ඉවත් කළ නොහැක', body: 'පොරොන්දු වූ SOS රැකියා සඳහා කාර්මිකයන් ප්‍රමාණවත් නොවේ.', tone: 'danger' });
        return false;
      }
      setTeam(t.filter((m) => m.id !== id));
      setAttendance((a) => ({ ...a, presentIds: a.presentIds.filter((p) => p !== id), breakIds: a.breakIds.filter((p) => p !== id) }));
      return true;
    },
    [notify]
  );

  const confirmAttendance = useCallback(
    (presentIds: string[]) => {
      // Mechanics out on a job are at work by definition.
      const ids = Array.from(new Set([...presentIds, ...live.current.crew.onJobIds]));
      setAttendance({ date: today(), presentIds: ids, breakIds: [] });
      notify({ icon: '👨‍🔧', title: 'අද පැමිණීම තහවුරු කළා', body: `කාර්මිකයන් ${ids.length} දෙනෙකු පැමිණ ඇත — SOS ධාරිතාව ${ids.length}.`, tone: 'success' });
    },
    [notify]
  );

  const setPresent = useCallback(
    (id: string, present: boolean) => {
      const { crew: c } = live.current;
      if (!present) {
        if (c.onJobIds.includes(id)) {
          notify({ icon: '⛔', title: 'වෙනස් කළ නොහැක', body: 'මෙම කාර්මිකයා දැනට SOS රැකියාවක සිටී.', tone: 'danger' });
          return false;
        }
        if (!c.breakIds.includes(id) && c.presentIds.length - c.breakIds.length - 1 < c.committedJobs) {
          notify({ icon: '⛔', title: 'වෙනස් කළ නොහැක', body: 'පොරොන්දු වූ SOS රැකියා සඳහා කාර්මිකයන් ප්‍රමාණවත් නොවේ.', tone: 'danger' });
          return false;
        }
      }
      setAttendance((a) => {
        const base = a.date === today() ? a.presentIds : [];
        const breaks = a.date === today() ? a.breakIds.filter((p) => p !== id) : [];
        return { date: today(), presentIds: present ? Array.from(new Set([...base, id])) : base.filter((p) => p !== id), breakIds: breaks };
      });
      return true;
    },
    [notify]
  );

  const setOnBreak = useCallback(
    (id: string, onBreak: boolean) => {
      const { crew: c } = live.current;
      if (!onBreak) {
        setAttendance((a) => ({ ...a, breakIds: a.breakIds.filter((p) => p !== id) }));
        return true;
      }
      if (!c.presentIds.includes(id) || c.onJobIds.includes(id)) return false;
      // A break must not leave fewer available mechanics than SOS jobs already promised.
      if (c.presentIds.length - c.breakIds.length - 1 < c.committedJobs) {
        notify({ icon: '⛔', title: 'විවේකයට යැවිය නොහැක', body: 'පොරොන්දු වූ SOS රැකියා සඳහා කාර්මිකයන් ප්‍රමාණවත් නොවේ.', tone: 'danger' });
        return false;
      }
      setAttendance((a) => ({ ...a, breakIds: Array.from(new Set([...a.breakIds, id])) }));
      return true;
    },
    [notify]
  );

  // ---------- Reviews ----------
  /** Empty text removes the reply. */
  const replyReview = useCallback((id: string, text: string) => {
    const t = text.trim();
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: t ? { text: t, at: Date.now() } : undefined } : r)));
  }, []);

  // ---------- SOS dispatch ----------
  const declineRequest = useCallback((id: string) => setRequests((prev) => prev.filter((r) => r.id !== id)), []);

  const returnToInbox = (d: Dispatch) => {
    setRequests((prev) => [d.request, ...prev.filter((r) => r.id !== d.request.id)].sort((a, b) => b.requestedAt - a.requestedAt));
    setDispatches((prev) => prev.filter((x) => x.id !== d.id));
  };

  const openDispatch = useCallback(
    (requestId: string) => {
      const { isOpen: open, crew: c, dispatches: ds } = live.current;
      const reason = sosBlockReason(open, c);
      if (reason) {
        notify({ icon: '⛔', title: 'නව SOS භාර ගත නොහැක', body: reason, tone: 'danger' });
        return;
      }
      // Only one request is "being considered" at a time; any other goes back.
      ds.filter((d) => !isCommitted(d) && d.stage !== 'done').forEach(returnToInbox);
      const request = live.current.requests.find((r) => r.id === requestId);
      if (!request) return;
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setDispatches((list) => [...list, { id: request.id, request, stage: 'review', startedAt: Date.now(), tasks: [false, false, false] }]);
      setOpenId(request.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify]
  );

  const resumeDispatch = useCallback((id: string) => setOpenId(id), []);

  const closeDispatch = useCallback(() => {
    const id = live.current.openId;
    if (!id) return;
    setDispatches((prev) => prev.filter((d) => d.id !== id));
    setOpenId(null);
  }, []);

  const leaveDispatch = useCallback(() => {
    const d = findDispatch(live.current.openId);
    if (d && d.stage === 'done') setDispatches((prev) => prev.filter((x) => x.id !== d.id));
    else if (d && !isCommitted(d)) returnToInbox(d);
    setOpenId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStage = useCallback(
    (stage: DispatchStage) => {
      const id = live.current.openId;
      if (id) patch(id, { stage });
    },
    [patch]
  );

  const sendQuote = useCallback(
    (price: number, etaMin: number) => {
      const id = live.current.openId;
      if (!id) return false;
      // Re-check at the moment of committing: another job may have taken the last free mechanic.
      const reason = sosBlockReason(live.current.isOpen, live.current.crew);
      if (reason) {
        notify({ icon: '⛔', title: 'මිල ගණන් යැවිය නොහැක', body: reason, tone: 'danger' });
        return false;
      }
      patch(id, { quote: { price, etaMin }, repair: { amount: price, needed: price > 0 }, stage: 'awaitingCustomer' });
      later(() => {
        if (findDispatch(id)?.stage !== 'awaitingCustomer') return;
        patch(id, { stage: 'assign' });
        notify({ icon: '🤝', title: 'පාරිභෝගිකයා ඔබව තෝරා ගත්තා!', body: 'යාන්ත්‍රිකයෙකු සහ වාහනයක් පවරන්න.', tone: 'success' });
      }, CUSTOMER_REPLY_MS);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch]
  );

  const assignCrew = useCallback(
    (mechanicId: string, vanId: string) => {
      const id = live.current.openId;
      const c = live.current.crew;
      if (!id || !c.presentIds.includes(mechanicId) || c.breakIds.includes(mechanicId) || c.onJobIds.includes(mechanicId)) return;
      const member = live.current.team.find((m) => m.id === mechanicId);
      if (member?.hasApp) {
        patch(id, { mechanicId, vanId, stage: 'techAccept', techMode: 'app' });
        runTechSim(id);
      } else {
        patch(id, { mechanicId, vanId, stage: 'enroute', enrouteAt: Date.now(), techMode: 'manual' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patch]
  );

  const setRepair = useCallback(
    (amount: number, needed: boolean) => {
      const id = live.current.openId;
      if (id) patch(id, { repair: { amount, needed } });
    },
    [patch]
  );

  const toggleTask = useCallback(
    (i: number) => {
      const id = live.current.openId;
      if (id) patch(id, (d) => ({ tasks: d.tasks.map((t, j) => (j === i ? !t : t)) }));
    },
    [patch]
  );

  const completeRepair = useCallback(() => {
    const id = live.current.openId;
    if (id) finishRepair(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishRepair = (id: string) => {
    patch(id, { stage: 'awaitingConfirm' });
    later(() => {
      if (findDispatch(id)?.stage !== 'awaitingConfirm') return;
      patch(id, { stage: 'qr' });
      notify({ icon: '✅', title: 'පාරිභෝගිකයා තහවුරු කළා', body: 'රැකියාව වසා දැමීමට QR කේතය ස්කෑන් කරන්න.', tone: 'success' });
    }, CUSTOMER_REPLY_MS);
  };

  const confirmQrScan = useCallback(() => {
    const id = live.current.openId;
    if (id) closeWithQr(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeWithQr = (id: string) => {
    const d = findDispatch(id);
    if (!d?.quote) return;
    // The technician earns the call-out fee plus whatever repair was actually done.
    const repairCharge = d.repair?.needed ? d.repair.amount : 0;
    const rating = Math.random() < 0.75 ? 5 : 4;
    const info = breakdownInfo(d.request.breakdownId);
    setBookings((prev) => [
      {
        id: `b-${d.request.id}`,
        source: 'sos',
        title: info.label,
        icon: info.icon,
        customer: d.request.customer,
        vehicle: d.request.vehicle,
        address: d.request.location.address,
        coords: d.request.location.coords,
        doorstep: false,
        scheduledAt: d.startedAt,
        price: d.request.calloutFee + repairCharge,
        calloutOnly: repairCharge === 0,
        status: 'completed',
        completedAt: Date.now(),
        rating,
      },
      ...prev,
    ]);
    setReviews((prev) => [
      { id: `r-${d.request.id}`, customer: d.request.customer.name, rating, dimensions: { quality: rating, pricing: 5, onTime: 5, communication: rating }, text: 'ඉක්මනින් පැමිණ ගැටලුව විසඳුවා. ස්තූතියි!', at: Date.now() },
      ...prev,
    ]);
    // 'done' is not committed, so the mechanic is free again.
    patch(d.id, { stage: 'done' });
  };

  // ---------- Technician app (simulated until a backend relays it) ----------
  const isApp = (id: string) => findDispatch(id)?.techMode === 'app';
  const techName = (id: string) => live.current.team.find((m) => m.id === findDispatch(id)?.mechanicId)?.name ?? 'තාක්ෂණිකයා';

  /** The technician's steps as they would arrive from the technician app. */
  const runTechSim = (id: string) => {
    later(() => {
      if (!isApp(id) || findDispatch(id)?.stage !== 'techAccept') return;
      patch(id, { stage: 'enroute', enrouteAt: Date.now() });
      notify({ icon: '📱', title: `${techName(id)} රැකියාව පිළිගත්තා`, body: 'සජීවී ස්ථානය බෙදා ගනිමින් ගමනේ.', tone: 'success' });
      later(() => {
        if (!isApp(id) || findDispatch(id)?.stage !== 'enroute') return;
        patch(id, { stage: 'arrived' });
        notify({ icon: '📍', title: `${techName(id)} ස්ථානයට පැමිණියා`, body: 'පරීක්ෂාව ආරම්භ කරමින්.', tone: 'primary' });
        later(() => {
          if (!isApp(id) || findDispatch(id)?.stage !== 'arrived') return;
          patch(id, (d) => ({ stage: 'repairing', tasks: d.tasks.map((t, i) => (i === 0 ? true : t)) }));
          later(() => {
            const d = findDispatch(id);
            if (!isApp(id) || d?.stage !== 'repairing') return;
            // The inspection found more work than estimated: ask the manager.
            const quote = d.quote?.price ?? 0;
            const asked = quote > 0 ? Math.round((quote * 1.3) / 50) * 50 : 2500;
            if (asked > quote) {
              patch(id, { priceApproval: { amount: asked, status: 'pending' } });
              notify({ icon: '💬', title: 'මිල අනුමැතිය අවශ්‍යයි', body: `${techName(id)} අලුත්වැඩියාවට රු. ${asked.toLocaleString()} ඉල්ලයි (ඇස්තමේන්තුව රු. ${quote.toLocaleString()}).`, tone: 'primary' });
            } else {
              patch(id, { repair: { amount: asked, needed: true } });
              continueRepair(id);
            }
          }, TECH_STEP_MS);
        }, TECH_STEP_MS);
      }, DRIVE_MS);
    }, TECH_ACCEPT_MS);
  };

  /** After the price is settled: the remaining checklist, then the owner's QR. */
  const continueRepair = (id: string) => {
    later(() => {
      if (!isApp(id)) return;
      patch(id, (d) => ({ tasks: d.tasks.map((t, i) => (i === 1 ? true : t)) }));
      later(() => {
        if (!isApp(id)) return;
        patch(id, (d) => ({ tasks: d.tasks.map(() => true) }));
        later(() => {
          if (!isApp(id) || findDispatch(id)?.stage !== 'repairing') return;
          finishRepair(id);
          // The technician scans the owner's QR once it is shown.
          later(() => {
            if (!isApp(id) || findDispatch(id)?.stage !== 'qr') return;
            closeWithQr(id);
            notify({ icon: '🔳', title: `${techName(id)} QR ස්කෑන් කළා`, body: 'රැකියාව වසා බිල්පත ගෙවන ලදී.', tone: 'success' });
          }, CUSTOMER_REPLY_MS + TECH_STEP_MS);
        }, TECH_STEP_MS);
      }, TECH_STEP_MS);
    }, TECH_STEP_MS);
  };

  const approveRepairPrice = useCallback((approved: boolean) => {
    const id = live.current.openId;
    const d = findDispatch(id);
    if (!id || !d?.priceApproval || d.priceApproval.status !== 'pending') return;
    const amount = approved ? d.priceApproval.amount : d.quote?.price ?? 0;
    patch(id, { priceApproval: { ...d.priceApproval, status: approved ? 'approved' : 'rejected' }, repair: { amount, needed: amount > 0 } });
    if (isApp(id)) continueRepair(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takeOverDispatch = useCallback(() => {
    const id = live.current.openId;
    const d = findDispatch(id);
    if (!id || !d) return;
    patch(id, { techMode: 'manual', ...(d.stage === 'techAccept' ? { stage: 'enroute' as const, enrouteAt: Date.now() } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Bidding ----------
  const placeBid = useCallback(
    (job: FeedJob, input: Pick<MyBid, 'price' | 'warrantyMonths' | 'estHours' | 'note'>) => {
      const jobId = job.id;
      // A won bid is booked tomorrow: it has to fit tomorrow's room (limited garages only).
      if (intakeRef.current(dayStart(Date.now()) + 24 * HOUR).remaining < input.price) {
        notify({ icon: '⚖️', title: 'හෙට දෛනික සීමාව පිරී ඇත', body: 'ඉඩ ඇති වූ විට නැවත ලංසු තබන්න — හෝ දායකත්වය බලන්න.', tone: 'danger' });
        return;
      }
      const existing = live.current.bids.find((b) => b.jobId === jobId && b.status === 'pending');
      const bid: MyBid = { ...input, id: existing?.id ?? `bid-${Date.now()}`, jobId, job, submittedAt: Date.now(), status: 'pending' };
      setBids((prev) => [bid, ...prev.filter((b) => b.id !== bid.id)]);

      // The owner compares bids and decides; re-submitting (editing) restarts the clock.
      later(() => {
        const current = live.current.bids.find((b) => b.id === bid.id);
        if (!current || current.status !== 'pending' || current.submittedAt !== bid.submittedAt) return;
        const won = bidWins(job, current.price);
        setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: won ? 'won' : 'lost' } : b)));
        const cat = categoryInfo(job.categoryId);
        if (won) {
          const at = new Date(Date.now() + 24 * 60 * MIN);
          at.setHours(10, 0, 0, 0);
          setBookings((prev) => [{ ...bookingFrom(job, 'bid', at.getTime(), current.price, current.note, current.warrantyMonths), id: `b-${bid.id}` }, ...prev]);
          setFeed((prev) => prev.filter((j) => j.id !== jobId));
          notify({ icon: '🏆', title: 'ඔබ ලංසුව දිනුවා!', body: `${cat.name} · ${job.customer.name} — වෙන් කිරීම කාලසටහනට එක් විය.`, tone: 'success' });
        } else {
          notify({ icon: '📉', title: 'ලංසුව අහිමි විය', body: `${cat.name} සඳහා පාරිභෝගිකයා අඩු මිලක් තෝරා ගත්තා.`, tone: 'danger' });
        }
      }, BID_DECISION_MS);
    },
    [later, notify]
  );

  const withdrawBid = useCallback((bidId: string) => setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: 'withdrawn' } : b))), []);

  // ---------- Direct bookings ----------
  const answerDirect = useCallback(
    (id: string, reply: { at: number; estimate: number; note: string }) => {
      const d = live.current.directs.find((x) => x.id === id);
      if (!d || d.status !== 'new') return;
      const cat = categoryInfo(d.categoryId);
      // Over the day's limit: never refused — offered the first day with room, same time.
      const day = firstDayWithRoom(reply.at, reply.estimate, (t) => intakeRef.current(t).remaining);
      const moved = day !== dayStart(reply.at);
      if (moved) reply = { ...reply, at: day + (reply.at - dayStart(reply.at)), note: reply.note || 'එදින ඉඩ නැති නිසා ඊළඟ නිදහස් දිනය යෝජනා කරමු.' };
      if (reply.at === d.preferredAt) {
        // The owner already chose this garage and this slot: accepting books it.
        setDirects((prev) => prev.filter((x) => x.id !== id));
        setBookings((prev) => [bookingFrom(d, 'direct', reply.at, reply.estimate, reply.note), ...prev]);
        notify({
          icon: '✅',
          title: 'වෙන්කිරීම තහවුරු කළා',
          body: d.doorstep
            ? `${cat.name} · ${d.customer.name} — කාලසටහනට එක් විය.`
            : `${d.customer.name} හට ඔබගේ ස්ථානය සහ දුරකථන අංකය යැවුවා.`,
          tone: 'success',
        });
        return;
      }
      setDirects((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'proposed', proposal: reply } : x)));
      notify(
        moved
          ? { icon: '⚖️', title: 'එම දිනයේ දෛනික සීමාව පිරී ඇත', body: `ප්‍රතික්ෂේප නොකර ඉඩ ඇති ඊළඟ දිනය (${formatDate(reply.at)}) ${d.customer.name} ට යෝජනා කළා.`, tone: 'primary' }
          : { icon: '📨', title: 'වෙනත් වේලාවක් යෝජනා කළා', body: `${d.customer.name} ගේ පිළිතුර බලාපොරොත්තුවෙන්.`, tone: 'primary' }
      );
      later(() => {
        const current = live.current.directs.find((x) => x.id === id);
        if (!current || current.status !== 'proposed') return;
        setDirects((prev) => prev.filter((x) => x.id !== id));
        if (Math.abs(reply.at - d.preferredAt) <= OWNER_ACCEPTS_WITHIN_MS) {
          setBookings((prev) => [bookingFrom(d, 'direct', reply.at, reply.estimate, reply.note), ...prev]);
          notify({ icon: '🤝', title: 'පාරිභෝගිකයා නව වේලාව පිළිගත්තා', body: `${cat.name} · ${d.customer.name} — කාලසටහනට එක් විය.`, tone: 'success' });
        } else {
          notify({ icon: '↩️', title: 'පාරිභෝගිකයා වෙනත් ගරාජයක් තෝරා ගත්තා', body: 'යෝජිත වේලාව ඉල්ලූ දිනයට වඩා බොහෝ දුරයි.', tone: 'danger' });
        }
      }, CUSTOMER_REPLY_MS);
    },
    [later, notify]
  );

  const declineDirect = useCallback(
    (id: string, reason: string) => {
      const d = live.current.directs.find((x) => x.id === id);
      if (!d) return;
      setDirects((prev) => prev.filter((x) => x.id !== id));
      notify({ icon: '👋', title: 'ඉල්ලීම ප්‍රතික්ෂේප කළා', body: `${d.customer.name} හට දැනුම් දුන්නා (${reason}) — ඔවුන්ට වෙනත් ගරාජයක් තෝරා ගත හැක.`, tone: 'primary' });
    },
    [notify]
  );

  // ---------- Bookings ----------
  const addPartsCost = useCallback(
    (id: string, amount: number) => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, partsCost: (b.partsCost ?? 0) + amount } : b))),
    []
  );
  const shareLocation = useCallback(
    (id: string) => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, locationSharedAt: Date.now() } : b))),
    []
  );
  // ---------- Workshop jobs ----------
  const liveBookings = useRef(bookings);
  liveBookings.current = bookings;
  const findBooking = (id: string) => liveBookings.current.find((b) => b.id === id);
  const patchProgress = useCallback(
    (id: string, change: Partial<WorkshopProgress>, booking?: Partial<Booking>) =>
      setBookings((prev) => prev.map((b) => (b.id === id && b.progress ? { ...b, ...booking, progress: { ...b.progress, ...change } } : b))),
    []
  );
  /** Simulation: the owner side's replies (the owner app answers for real once there's a backend). */
  const ownerDisputes = useRef(new Set<string>());

  const receiveVehicle = useCallback(
    (id: string, photos: string[]) => {
      patchProgress(id, { stage: 'diagnosing', checkInPhotos: photos, receivedAt: Date.now() }, { status: 'inProgress' });
      notify({ icon: '🚗', title: 'වාහනය ලැබුණා', body: 'පරීක්ෂා කර වාර්තාව අයිතිකරුට යවන්න.', tone: 'primary' });
    },
    [notify, patchProgress]
  );

  const sendDiagnosis = useCallback(
    (id: string, report: DiagnosisReport) => {
      patchProgress(id, { stage: 'awaitingApproval', diagnosis: report });
      notify({ icon: '📨', title: 'පරීක්ෂා වාර්තාව යැව්වා', body: 'අයිතිකරුගේ අනුමැතිය බලාපොරොත්තුවෙන්.', tone: 'primary' });
      // Simulated owner: approves every line (owners can approve some or none in the owner app).
      later(() => {
        const b = findBooking(id);
        if (b?.progress?.stage !== 'awaitingApproval') return;
        patchProgress(id, { stage: 'repairing', decision: { approvedLineIds: report.lines.map((l) => l.id), declinedLineIds: [], decidedAt: Date.now() } });
        notify({ icon: '✅', title: `${b.customer.name} අනුමත කළා`, body: report.lines.length ? `පේළි ${report.lines.length} ම අනුමතයි — අලුත්වැඩියාව අරඹන්න.` : 'අලුත්වැඩියාව අරඹන්න.', tone: 'success' });
      }, CUSTOMER_REPLY_MS + 1500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patchProgress]
  );

  const requestExtraWork = useCallback(
    (id: string, extra: ExtraWorkRequest) => {
      const b = findBooking(id);
      if (!b?.progress || b.progress.stage !== 'repairing') return;
      patchProgress(id, { extras: [...(b.progress.extras ?? []), extra] });
      notify({ icon: '📨', title: 'අමතර වැඩ ඉල්ලීම යැව්වා', body: 'අයිතිකරු අනුමත කරන තුරු එම කොටස් ඇණවුම් කරන්න හෝ වැඩ කරන්න එපා.', tone: 'primary' });
      // Simulated owner: approves the extra lines (the owner app lets them pick).
      later(() => {
        const cur = findBooking(id);
        const x = cur?.progress?.extras?.find((e) => e.id === extra.id);
        if (!cur?.progress || !x || x.decision) return;
        const decision = { approvedLineIds: x.lines.map((l) => l.id), declinedLineIds: [], decidedAt: Date.now() };
        patchProgress(id, { extras: cur.progress.extras!.map((e) => (e.id === extra.id ? { ...e, decision } : e)) });
        notify({ icon: '✅', title: `${cur.customer.name} අමතර වැඩ අනුමත කළා`, body: x.lines.some((l) => l.kind === 'part' && l.source === 'order') ? 'දැන් එම කොටස් ඇණවුම් කරන්න.' : 'වැඩ කරගෙන යන්න.', tone: 'success' });
      }, CUSTOMER_REPLY_MS + 1500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patchProgress]
  );

  const markReadyForHandover = useCallback(
    (id: string, report: HandoverReport) => {
      patchProgress(id, { stage: 'readyForHandover', handover: report, dispute: undefined });
      const b = findBooking(id);
      notify({ icon: '🔑', title: 'භාරදීමට සූදානම්', body: `${b?.customer.name ?? 'අයිතිකරු'} පරීක්ෂා කර ඔවුන්ගේ කේතය පෙන්වයි.`, tone: 'primary' });
      // Simulated owner: the battery job comes back once with a problem, to show the rework path.
      if (b?.title === 'Battery Replacement' && !ownerDisputes.current.has(id)) {
        ownerDisputes.current.add(id);
        later(() => {
          if (findBooking(id)?.progress?.stage !== 'readyForHandover') return;
          patchProgress(id, { stage: 'disputed', dispute: { id: `dp-${id}`, topic: 'quality', text: 'ඩෑෂ්බෝඩ් බැටරි ලයිට් එක තවමත් දැල්වෙනවා. ටර්මිනල් හරියට සවි කළාද?', raisedAt: Date.now(), status: 'open' } });
          notify({ icon: '⚠️', title: `${b.customer.name} ගැටලුවක් වාර්තා කළා`, body: 'නැවත පරීක්ෂා කර හදා භාර දෙන්න.', tone: 'danger' });
        }, CUSTOMER_REPLY_MS);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patchProgress]
  );

  const startRework = useCallback(
    (id: string) => {
      const b = findBooking(id);
      if (!b?.progress?.dispute) return;
      patchProgress(id, { stage: 'repairing', dispute: { ...b.progress.dispute, status: 'rework' } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patchProgress]
  );

  const closeWorkshopJob = useCallback(
    (id: string) => {
      const b = findBooking(id);
      if (!b?.progress || b.progress.stage !== 'readyForHandover') return;
      const now = Date.now();
      const bill = b.progress.handover?.bill ?? workshopBill(b.price, b.progress, b.partsCost);
      setBookings((prev) =>
        prev.map((x) =>
          x.id === id && x.progress
            ? {
                ...x,
                // Labour is the garage's earnings; parts are billed to the owner separately.
                price: bill.labour,
                partsCost: bill.parts,
                status: 'completed',
                completedAt: now,
                progress: {
                  ...x.progress,
                  stage: 'closed',
                  closedAt: now,
                  warrantyUntil: warrantyEnd(now, x.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS),
                  dispute: x.progress.dispute ? { ...x.progress.dispute, status: 'resolved' } : undefined,
                },
              }
            : x
        )
      );
      notify({ icon: '🎉', title: 'රැකියාව අවසන්', body: `${b.customer.name} කේතයෙන් තහවුරු කළා · මාස ${b.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS} වගකීම ආරම්භ විය.`, tone: 'success' });
      // Simulated owner: rates the job on the four dimensions a little later (owner app: RatingSheet).
      later(() => {
        const reworked = !!b.progress?.dispute;
        const d = reworked ? { quality: 4, pricing: 5, onTime: 3, communication: 4 } : { quality: 5, pricing: 5, onTime: 5, communication: 4 };
        const stars = Math.round(((d.quality * 0.4 + d.pricing * 0.25 + d.onTime * 0.2 + d.communication * 0.15) * 10)) / 10;
        setReviews((prev) => [
          {
            id: `r-${id}`,
            customer: b.customer.name,
            rating: stars,
            dimensions: d,
            text: reworked ? 'පළමු වතාවේ හරි ගියේ නැහැ, හැබැයි ඉක්මනින් නැවත හදලා දුන්නා.' : 'කියපු විදියටම කළා, පරීක්ෂා වාර්තාව පැහැදිලියි.',
            at: Date.now(),
          },
          ...prev,
        ]);
        notify({ icon: '⭐', title: `${b.customer.name} ඔබව ශ්‍රේණිගත කළා`, body: `★${stars} · “සමාලෝචන” හි පිළිතුරු දෙන්න.`, tone: 'primary' });
      }, CUSTOMER_REPLY_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify]
  );

  const assignTech = useCallback((id: string, memberId: string) => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, assignedTechId: memberId } : b))), []);

  const rating = useMemo(() => {
    const count = RATING_HISTORY.count + reviews.length;
    const sum = RATING_HISTORY.sum + reviews.reduce((s, r) => s + r.rating, 0);
    return { average: Number((sum / count).toFixed(1)), count };
  }, [reviews]);

  // ---------- Trust score and level (shared rules; a backend would compute these) ----------
  const trust = useMemo(() => {
    const ratings = Object.fromEntries(
      (Object.keys(TRUST_HISTORY.ratings) as (keyof typeof TRUST_HISTORY.ratings)[]).map((k) => {
        const rated = reviews.filter((r) => r.dimensions);
        return [k, { sum: TRUST_HISTORY.ratings[k].sum + rated.reduce((s, r) => s + r.dimensions![k], 0), count: TRUST_HISTORY.ratings[k].count + rated.length }];
      })
    ) as Parameters<typeof computeTrustScore>[0]['ratings'];
    const closed = bookings.filter((b) => b.status === 'completed');
    return computeTrustScore({
      ratings,
      jobsAccepted: TRUST_HISTORY.jobsAccepted + bookings.length,
      jobsClosed: TRUST_HISTORY.jobsClosed + closed.length,
      // A problem the owner reported that needed rework counts against the garage.
      disputes: TRUST_HISTORY.disputes + bookings.filter((b) => b.progress?.dispute).length,
      onTimeJobs: TRUST_HISTORY.onTimeJobs + closed.filter((b) => !b.progress?.dispute).length,
    });
  }, [reviews, bookings]);
  // The garage's subscription (a plan is a requirement for a Premier invitation).
  const [subscription, setSubscription] = useState<{ plan: SubscriptionPlan; since: number } | null>(null);
  const levelStats: LevelStats = useMemo(
    () => ({
      documents: TRUST_HISTORY.documents,
      closedJobs: TRUST_HISTORY.jobsClosed + bookings.filter((b) => b.status === 'completed').length,
      score: trust.score,
      disputeRate: trust.disputeRate,
      monthsOnApp: TRUST_HISTORY.monthsOnApp,
      subscribed: TRUST_HISTORY.subscribed || !!subscription,
    }),
    [trust, bookings, subscription]
  );
  const earnedLevel = useMemo(() => currentLevel(levelStats), [levelStats]);
  // When the numbers drop below the held level, a grace period starts (and ends if they recover).
  const [belowSince, setBelowSince] = useState<number | undefined>(undefined);
  const heldIndex = LEVELS.findIndex((l) => l.id === TRUST_HISTORY.heldLevel);
  const below = LEVELS.findIndex((l) => l.id === earnedLevel.id) < heldIndex;
  useEffect(() => {
    if (below && belowSince === undefined) {
      setBelowSince(Date.now());
      notify({ icon: '⚠️', title: 'ඔබගේ මට්ටම අවදානමේ', body: 'අවශ්‍යතාවලට වඩා පහළ ගියා — නැවත ළඟා වීමට දින 30ක්. “ගරාජය” ටැබය බලන්න.', tone: 'danger' });
    }
    if (!below && belowSince !== undefined) setBelowSince(undefined);
  }, [below, belowSince, notify]);
  const { level: levelId, graceDaysLeft } = effectiveLevel(TRUST_HISTORY.heldLevel, earnedLevel.id, belowSince, Date.now());
  const level = LEVELS.find((l) => l.id === levelId)!;
  const features = useMemo(() => entitlementsFor(level.id), [level.id]);
  const has = useCallback((f: Feature) => features.has(f), [features]);

  // ---------- Fair share and subscription ----------
  const fairnessReasons = useMemo(() => fairnessFlags(FAIRNESS_SEED.stats, (id) => categoryInfo(id).name), []);
  const limitFrom = fairnessReasons.length ? FAIRNESS_SEED.flaggedAt + FAIRNESS.graceDays * 24 * HOUR : undefined;
  const recommendedPlan = planFor(FAIRNESS_SEED.stats.avgMonthlyEarnings);
  const intakeOn = useCallback(
    (day: number) =>
      computeIntake({
        limited: limitFrom !== undefined && Date.now() >= limitFrom,
        // Capacity: today's register; later days assume the whole team.
        mechanicsPresent: dayStart(day) === dayStart(Date.now()) && crew.confirmed ? crew.presentIds.length : team.length,
        // New work on that day (SOS is never limited: it's an emergency).
        todaysJobValues: bookings.filter((b) => b.source !== 'sos' && dayStart(b.scheduledAt) === dayStart(day)).map((b) => b.price),
        planMultiplier: subscription?.plan.intakeMultiplier,
      }),
    [limitFrom, crew, team, bookings, subscription]
  );
  intakeRef.current = intakeOn;
  const subscribe = useCallback(
    (id: SubscriptionPlanId) => {
      const plan = PLANS.find((p) => p.id === id)!;
      setSubscription({ plan, since: Date.now() });
      notify({ icon: '⭐', title: `${plan.name} දායකත්වය ආරම්භ විය`, body: `මසකට රු. ${plan.fee.toLocaleString()} · ඔබ දිනූ වැඩ ගාස්තුව මෙන් 5 ගුණයකට අඩු නම් වෙනස ආපසු ලැබේ.`, tone: 'success' });
    },
    [notify]
  );
  const cancelSubscription = useCallback(() => {
    setSubscription(null);
    notify({ icon: '↩️', title: 'දායකත්වය අවලංගු කළා', body: 'මාසය අවසානය දක්වා ප්‍රතිලාභ ලැබේ.', tone: 'primary' });
  }, [notify]);
  const monthWon = useMemo(() => {
    const m = new Date();
    return FAIRNESS_SEED.monthWonBefore + bookings.filter((b) => b.source !== 'sos' && new Date(b.scheduledAt).getMonth() === m.getMonth()).reduce((s, b) => s + b.price, 0);
  }, [bookings]);
  const valueCheck = subscription ? valueGuarantee(subscription.plan.fee, monthWon) : null;
  const rising = isRisingGarage({ monthsOnApp: TRUST_HISTORY.monthsOnApp, score: trust.score, closedJobs: levelStats.closedJobs });
  const headStartUntil = useCallback(
    (job: FeedJob) => {
      const until = job.postedAt + RISING_HEAD_START_MIN * MIN;
      return rising || until <= Date.now() ? undefined : until;
    },
    [rising]
  );

  const value: GarageState = {
    profile,
    isOpen,
    team,
    crew,
    sosBlocked,
    requests,
    dispatch: dispatches.find((d) => d.id === openId) ?? null,
    activeJobs: dispatches.filter(isCommitted),
    feed,
    directs,
    bids,
    bookings,
    reviews,
    rating,
    trust,
    levelStats,
    level,
    earnedLevel,
    graceDaysLeft,
    has,
    fairnessReasons,
    limitFrom,
    intakeOn,
    headStartUntil,
    subscription,
    recommendedPlan,
    subscribe,
    cancelSubscription,
    monthWon,
    valueCheck,
    notice,
    notify,
    addPartsCost,
    setOpen,
    toggleService,
    setCoverage,
    addMember,
    removeMember,
    confirmAttendance,
    setPresent,
    setOnBreak,
    replyReview,
    declineRequest,
    openDispatch,
    resumeDispatch,
    leaveDispatch,
    setStage,
    sendQuote,
    assignCrew,
    toggleTask,
    setRepair,
    completeRepair,
    confirmQrScan,
    closeDispatch,
    approveRepairPrice,
    takeOverDispatch,
    placeBid,
    withdrawBid,
    answerDirect,
    declineDirect,
    shareLocation,
    receiveVehicle,
    sendDiagnosis,
    requestExtraWork,
    markReadyForHandover,
    startRework,
    closeWorkshopJob,
    assignTech,
    dismissNotice,
  };

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
};

export const useGarage = () => {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
};
