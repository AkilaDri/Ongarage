import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { checkCloseCode, type DiagnosisReport, type ExtraWorkRequest, type HandoverReport, type PartsCollectTask, type WorkshopProgress } from '@ongarage/shared';
import {
  ACCEPT_WINDOW_MS,
  APPROVAL_MS,
  AUTO_APPROVE_FACTOR,
  COLLECT_TASKS,
  EARNINGS,
  INVITES,
  LINKS,
  OWNER_CONFIRM_MS,
  PROFILE,
  RATING_HISTORY,
  REVIEWS,
  SOS_OFFER_AFTER_MS,
  SOS_POOL,
  SOS_TASKS,
  WORKSHOP_JOBS,
} from '../constants/mockData';
import type { Duty, EarningEntry, GarageLink, Invite, Notice, OwnerReview, TechJob, TechProfile } from '../types';

/** SOS stages where the technician is committed to the job (can't break or check out). */
/** Simulated owner reply to a diagnosis. */
const OWNER_APPROVE_MS = 4000;
/** Simulated garage: parts ordered after approval arrive this long after. */
const PARTS_ARRIVE_MS = 9000;

const SOS_ACTIVE = ['enroute', 'arrived', 'inspecting', 'approval', 'repairing', 'awaitingConfirm', 'qr', 'payment'];
export const isActiveSOS = (j: TechJob) => j.kind === 'sos' && SOS_ACTIVE.includes(j.stage);
export const isOpenWorkshop = (j: TechJob) => j.kind === 'workshop' && (j.stage === 'assigned' || j.stage === 'working');

/** The SOS bill: the call-out fee plus the repair actually done. */
export const sosTotal = (j: TechJob) => (j.sos?.calloutFee ?? 0) + (j.repair?.needed ? j.repair.amount : 0);

type TechState = {
  profile: TechProfile;
  links: GarageLink[];
  invites: Invite[];
  duty: Duty;
  jobs: TechJob[];
  earnings: EarningEntry[];
  reviews: OwnerReview[];
  rating: { average: number; count: number };
  notice: Notice | null;
  /** The SOS job open full screen. */
  openJob: TechJob | null;
  /** Jobs waiting for an answer (SOS offers and freelance workshop offers). */
  offers: TechJob[];

  checkIn: (garageId: string) => void;
  checkOut: () => void;
  setBreak: (onBreak: boolean) => void;
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  /** Accept an invite by the code a garage gave out. */
  joinWithCode: (code: string) => boolean;

  acceptJob: (id: string) => void;
  declineJob: (id: string, reason: string) => void;
  openSOS: (id: string) => void;
  closeSOS: () => void;

  markArrived: (id: string) => void;
  startInspection: (id: string) => void;
  submitInspection: (id: string, needed: boolean, amount: number) => void;
  toggleTask: (id: string, index: number) => void;
  finishRepair: (id: string) => void;
  /** Close with the owner's QR, or the 6-digit code they read out. */
  closeWithOwner: (id: string, code?: string) => boolean;
  collectPayment: (id: string, method: 'cash' | 'online') => void;

  // Workshop jobs follow the shared workshop steps (see WorkshopProgress).
  /** Vehicle received (or reached the owner's door) with condition photos: work starts. */
  receiveVehicle: (id: string, photos: string[]) => void;
  /** The diagnosis goes to the owner through the garage; parts wait for their approval. */
  sendDiagnosis: (id: string, report: DiagnosisReport) => void;
  /** Work found mid-repair goes to the owner the same way; handover waits for the answer. */
  requestExtraWork: (id: string, extra: ExtraWorkRequest) => void;
  markReadyForHandover: (id: string, report: HandoverReport) => void;
  /** Close with the owner's QR / 6-digit code: the job is done and paid to the technician. */
  closeWorkshopJob: (id: string, code: string) => boolean;
  setNotes: (id: string, notes: string) => void;

  /** Parts pickups garages sent this technician on. */
  collects: PartsCollectTask[];
  /** The shop checked the pickup code and handed the parts over. */
  collectedAtCounter: (id: string) => void;
  /** The parts reached the garage. */
  deliverParts: (id: string) => void;

  settleGarage: (garageId: string) => void;
  dismissNotice: () => void;
};

const TechContext = createContext<TechState | null>(null);

export const TechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile] = useState<TechProfile>(PROFILE);
  const [links, setLinks] = useState<GarageLink[]>(LINKS);
  const [invites, setInvites] = useState<Invite[]>(INVITES);
  const [duty, setDuty] = useState<Duty>({ garageId: null, onBreak: false });
  const [jobs, setJobs] = useState<TechJob[]>(WORKSHOP_JOBS);
  const [collects, setCollects] = useState<PartsCollectTask[]>(COLLECT_TASKS);
  const [earnings, setEarnings] = useState<EarningEntry[]>(EARNINGS);
  const [reviews, setReviews] = useState<OwnerReview[]>(REVIEWS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(Date.now());
  // Which garages already sent this session's SOS (one each, so the demo stays readable).
  const sentSOS = useRef<Set<string>>(new Set());

  const live = useRef({ links, invites, duty, jobs });
  live.current = { links, invites, duty, jobs };

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const noticeId = useRef(0);
  const notify = useCallback((n: Omit<Notice, 'id'>) => setNotice({ ...n, id: ++noticeId.current }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const patch = useCallback((id: string, change: Partial<TechJob> | ((j: TechJob) => Partial<TechJob>)) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...(typeof change === 'function' ? change(j) : change) } : j)));
  }, []);
  const find = (id: string) => live.current.jobs.find((j) => j.id === id);
  const linkFor = (garageId: string) => live.current.links.find((l) => l.garage.id === garageId);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // An SOS offer not answered in time goes to someone else.
  useEffect(() => {
    const missed = jobs.filter((j) => j.kind === 'sos' && j.stage === 'offered' && (j.sos?.acceptBy ?? Infinity) <= now);
    if (!missed.length) return;
    missed.forEach((j) => patch(j.id, { stage: 'declined', declineReason: 'කාලය ඉකුත් විය' }));
    notify({ icon: '⌛', title: 'SOS රැකියාව වෙනත් අයෙකුට පැවරුවා', body: 'නියමිත කාලය තුළ පිළිගත්තේ නැත.', tone: 'danger' });
  }, [now, jobs, patch, notify]);

  /** While checked in, available and free, the garage sends an SOS job (simulated). */
  const scheduleSOS = useCallback(
    (garageId: string) => {
      if (sentSOS.current.has(garageId)) return;
      later(() => {
        const { duty: d, jobs: js } = live.current;
        const link = linkFor(garageId);
        const seed = SOS_POOL.find((s) => s.garageId === garageId);
        if (!link || !seed || d.garageId !== garageId || d.onBreak || js.some(isActiveSOS) || sentSOS.current.has(garageId)) return;
        sentSOS.current.add(garageId);
        const { garageId: _g, breakdownId, note, calloutFee, quote, etaMin, ...rest } = seed;
        const job: TechJob = {
          ...rest,
          id: `sos-${garageId}-${Date.now()}`,
          garage: link.garage,
          stage: 'offered',
          assignedAt: Date.now(),
          pay: link.rates.sos,
          tasks: SOS_TASKS.map(() => false),
          sos: { breakdownId, note, calloutFee, quote, etaMin, closeCode: String(100000 + Math.floor(Math.random() * 900000)), acceptBy: Date.now() + ACCEPT_WINDOW_MS },
        };
        setJobs((prev) => [job, ...prev]);
        notify({ icon: '🚨', title: `${link.garage.name}: SOS රැකියාවක්`, body: `${job.title} · ${job.location.address} — පිළිගන්න`, tone: 'danger' });
      }, SOS_OFFER_AFTER_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify]
  );

  // ---------- Duty ----------
  const checkIn = useCallback(
    (garageId: string) => {
      const { duty: d, jobs: js } = live.current;
      const busyElsewhere = js.find((j) => (isActiveSOS(j) || (j.kind === 'workshop' && j.stage === 'working')) && j.garage.id !== garageId);
      if (busyElsewhere) {
        notify({ icon: '⛔', title: 'තවම වෙනත් රැකියාවක', body: `${busyElsewhere.garage.name} රැකියාව අවසන් කර පසුව මාරු වන්න.`, tone: 'danger' });
        return;
      }
      const link = linkFor(garageId);
      if (!link || d.garageId === garageId) return;
      setDuty({ garageId, since: Date.now(), onBreak: false });
      notify({ icon: '✅', title: `${link.garage.name} හි රාජකාරියට පැමිණියා`, body: 'ඔබ දැන් මෙම ගරාජයේ SOS ධාරිතාවට ගණන් වේ.', tone: 'success' });
      scheduleSOS(garageId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, scheduleSOS]
  );

  const checkOut = useCallback(() => {
    const { jobs: js } = live.current;
    if (js.some((j) => isActiveSOS(j) || (j.kind === 'workshop' && j.stage === 'working'))) {
      notify({ icon: '⛔', title: 'රාජකාරියෙන් පිටවිය නොහැක', body: 'ක්‍රියාත්මක රැකියාව අවසන් කරන්න.', tone: 'danger' });
      return;
    }
    setDuty({ garageId: null, onBreak: false });
  }, [notify]);

  const setBreak = useCallback(
    (onBreak: boolean) => {
      const { duty: d, jobs: js } = live.current;
      if (!d.garageId) return;
      if (onBreak && js.some(isActiveSOS)) {
        notify({ icon: '⛔', title: 'විවේකයට යා නොහැක', body: 'SOS රැකියාව අවසන් කර පසුව විවේකය ගන්න.', tone: 'danger' });
        return;
      }
      setDuty({ ...d, onBreak, breakSince: onBreak ? Date.now() : undefined });
      if (!onBreak) scheduleSOS(d.garageId);
    },
    [notify, scheduleSOS]
  );

  // ---------- Garages ----------
  const acceptInvite = useCallback(
    (inviteId: string) => {
      const inv = live.current.invites.find((i) => i.id === inviteId);
      if (!inv) return;
      setLinks((prev) => [...prev, { garage: inv.garage, kind: inv.kind, rates: inv.rates, since: Date.now(), jobsDone: 0 }]);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      notify({ icon: '🤝', title: `${inv.garage.name} සමඟ සම්බන්ධ වුණා`, body: 'එහි රාජකාරියට පැමිණි විට රැකියා ලැබේ.', tone: 'success' });
    },
    [notify]
  );
  const declineInvite = useCallback((inviteId: string) => setInvites((prev) => prev.filter((i) => i.id !== inviteId)), []);
  const joinWithCode = useCallback(
    (code: string) => {
      const inv = live.current.invites.find((i) => i.code.toUpperCase() === code.trim().toUpperCase());
      if (!inv) return false;
      acceptInvite(inv.id);
      return true;
    },
    [acceptInvite]
  );

  // ---------- Offers ----------
  const acceptJob = useCallback(
    (id: string) => {
      const j = find(id);
      if (!j || j.stage !== 'offered') return;
      if (j.kind === 'workshop') {
        patch(id, { stage: 'assigned' });
        notify({ icon: '📋', title: 'රැකියාව භාර ගත්තා', body: `${j.garage.name} · ${j.title}`, tone: 'success' });
        return;
      }
      if (live.current.jobs.some(isActiveSOS)) {
        notify({ icon: '⛔', title: 'දැනටමත් SOS රැකියාවක', body: 'එකවර එක SOS රැකියාවක් පමණි.', tone: 'danger' });
        return;
      }
      patch(id, { stage: 'enroute', enrouteAt: Date.now(), startedAt: Date.now() });
      setOpenId(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch]
  );
  const declineJob = useCallback((id: string, reason: string) => patch(id, { stage: 'declined', declineReason: reason }), [patch]);
  const openSOS = useCallback((id: string) => setOpenId(id), []);
  const closeSOS = useCallback(() => setOpenId(null), []);

  // ---------- SOS field steps ----------
  const markArrived = useCallback((id: string) => patch(id, { stage: 'arrived' }), [patch]);
  const startInspection = useCallback((id: string) => patch(id, (j) => ({ stage: 'inspecting', tasks: j.tasks.map((t, i) => (i === 0 ? true : t)) })), [patch]);

  const submitInspection = useCallback(
    (id: string, needed: boolean, amount: number) => {
      const j = find(id);
      if (!j?.sos) return;
      const quote = j.sos.quote;
      if (needed && amount > quote) {
        // Above the garage's estimate: the manager approves before the owner sees it.
        patch(id, { stage: 'approval', approval: { amount, status: 'pending' } });
        later(() => {
          const cur = find(id);
          if (cur?.stage !== 'approval') return;
          const ok = amount <= Math.max(quote, 1000) * AUTO_APPROVE_FACTOR;
          const final = ok ? amount : quote;
          patch(id, { stage: 'repairing', approval: { amount, status: ok ? 'approved' : 'rejected' }, repair: { amount: final, needed: final > 0 } });
          notify(
            ok
              ? { icon: '✅', title: 'කළමනාකරු අනුමත කළා', body: `අලුත්වැඩියා ගාස්තුව රු. ${final.toLocaleString()}`, tone: 'success' }
              : { icon: '↩️', title: 'කළමනාකරු ඇස්තමේන්තුවම තබා ගත්තා', body: `අලුත්වැඩියා ගාස්තුව රු. ${final.toLocaleString()}`, tone: 'danger' }
          );
        }, APPROVAL_MS);
        return;
      }
      patch(id, { stage: 'repairing', repair: { amount: needed ? amount : 0, needed } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch]
  );

  const toggleTask = useCallback((id: string, index: number) => patch(id, (j) => ({ tasks: j.tasks.map((t, i) => (i === index ? !t : t)) })), [patch]);

  const finishRepair = useCallback(
    (id: string) => {
      patch(id, { stage: 'awaitingConfirm' });
      later(() => {
        if (find(id)?.stage !== 'awaitingConfirm') return;
        patch(id, { stage: 'qr' });
        notify({ icon: '🔳', title: 'අයිතිකරු තහවුරු කළා', body: 'ඔවුන්ගේ දුරකථනයේ QR කේතය ස්කෑන් කරන්න.', tone: 'primary' });
      }, OWNER_CONFIRM_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch]
  );

  const closeWithOwner = useCallback(
    (id: string, code?: string) => {
      const j = find(id);
      if (!j?.sos || j.stage !== 'qr') return false;
      if (code !== undefined && code.trim() !== j.sos.closeCode) return false;
      patch(id, { stage: 'payment' });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patch]
  );

  const addEarning = (j: TechJob, collected: number) => {
    setEarnings((prev) => [
      { id: `e-${j.id}`, jobId: j.id, garageId: j.garage.id, garageName: j.garage.name, title: j.title, icon: j.icon, at: Date.now(), pay: j.pay, collected, settled: false },
      ...prev,
    ]);
    setLinks((prev) => prev.map((l) => (l.garage.id === j.garage.id ? { ...l, jobsDone: l.jobsDone + 1 } : l)));
    // The owner rates the technician a little later (simulated).
    later(() => {
      const stars = Math.random() < 0.8 ? 5 : 4;
      setEarnings((prev) => prev.map((e) => (e.jobId === j.id ? { ...e, rating: stars } : e)));
      setReviews((prev) => [
        { id: `or-${j.id}`, customer: j.customer.name, garage: j.garage.name, rating: stars, text: stars === 5 ? 'ඉතා හොඳ සේවාවක්, ඉක්මනින් හැදුවා!' : 'හොඳ වැඩක්, ස්තූතියි.', at: Date.now() },
        ...prev,
      ]);
      notify({ icon: '⭐', title: `${j.customer.name} ඔබව ශ්‍රේණිගත කළා`, body: '★'.repeat(stars), tone: 'success' });
    }, 3000);
  };

  const collectPayment = useCallback(
    (id: string, method: 'cash' | 'online') => {
      const j = find(id);
      if (!j || j.stage !== 'payment') return;
      const total = sosTotal(j);
      const collected = method === 'cash' ? total : 0;
      patch(id, { stage: 'done', completedAt: Date.now(), collected, paidOnline: method === 'online' });
      addEarning(j, collected);
      notify({ icon: '💰', title: 'රැකියාව අවසන්', body: `ඔබට රු. ${j.pay.toLocaleString()}${collected ? ` · ගරාජයට භාර දිය යුතු මුදල් රු. ${collected.toLocaleString()}` : ''}`, tone: 'success' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch]
  );

  // ---------- Workshop jobs ----------
  const patchProgress = useCallback(
    (id: string, change: Partial<WorkshopProgress>, job?: Partial<TechJob>) =>
      patch(id, (j) => (j.workshop?.progress ? { ...job, workshop: { ...j.workshop, progress: { ...j.workshop.progress, ...change } } } : {})),
    [patch]
  );

  const receiveVehicle = useCallback(
    (id: string, photos: string[]) => {
      const j = find(id);
      const { duty: d } = live.current;
      if (!j || j.stage !== 'assigned') return;
      if (d.garageId !== j.garage.id || d.onBreak) {
        notify({ icon: '⛔', title: 'පළමුව රාජකාරියට පැමිණෙන්න', body: `${j.garage.name} හි රාජකාරියට පැමිණ (විවේකයේ නොසිට) වැඩ අරඹන්න.`, tone: 'danger' });
        return;
      }
      patchProgress(id, { stage: 'diagnosing', checkInPhotos: photos, receivedAt: Date.now() }, { stage: 'working', startedAt: Date.now() });
      notify({ icon: '🚗', title: 'වාහනය ලැබුණා', body: 'පරීක්ෂා කර වාර්තාව ලියන්න — ගරාජය හරහා අයිතිකරුට යයි.', tone: 'primary' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patchProgress]
  );

  const sendDiagnosis = useCallback(
    (id: string, report: DiagnosisReport) => {
      patchProgress(id, { stage: 'awaitingApproval', diagnosis: report });
      // Simulated owner: approves every line through the garage (the owner app can approve some or none).
      later(() => {
        const j = find(id);
        if (j?.workshop?.progress?.stage !== 'awaitingApproval') return;
        const toOrder = report.lines.filter((l) => l.kind === 'part' && l.source === 'order');
        patchProgress(id, { stage: 'repairing', decision: { approvedLineIds: report.lines.map((l) => l.id), declinedLineIds: [], decidedAt: Date.now() } });
        if (toOrder.length)
          patch(id, (cur) => (cur.workshop ? { workshop: { ...cur.workshop, parts: 'ordered', partsSummary: toOrder.map((l) => `${l.name} (${l.partType})`).join(' · ') } } : {}));
        notify({ icon: '✅', title: `${j.customer.name} අනුමත කළා`, body: toOrder.length ? 'ගරාජය කොටස් ඇණවුම් කරයි — අලුත්වැඩියාව අරඹන්න.' : 'අලුත්වැඩියාව අරඹන්න.', tone: 'success' });
        // Simulated garage: the ordered parts arrive a little later.
        if (toOrder.length)
          later(() => {
            patch(id, (cur) => (cur.workshop ? { workshop: { ...cur.workshop, parts: 'arrived' } } : {}));
            notify({ icon: '📦', title: 'කොටස් ගරාජයට ලැබුණා', body: `${j.title} · ${toOrder.length} ක්`, tone: 'success' });
          }, PARTS_ARRIVE_MS);
      }, OWNER_APPROVE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch, patchProgress]
  );

  const requestExtraWork = useCallback(
    (id: string, extra: ExtraWorkRequest) => {
      const j = find(id);
      const p = j?.workshop?.progress;
      if (!j || !p || p.stage !== 'repairing') return;
      patchProgress(id, { extras: [...(p.extras ?? []), extra] });
      notify({ icon: '📨', title: 'අමතර වැඩ ඉල්ලීම යැව්වා', body: 'අයිතිකරු අනුමත කරන තුරු එම කොටස් හෝ වැඩ ආරම්භ කරන්න එපා.', tone: 'primary' });
      // Simulated owner: approves the extra lines; ordered parts then come as before.
      later(() => {
        const cur = find(id);
        const cp = cur?.workshop?.progress;
        const x = cp?.extras?.find((e) => e.id === extra.id);
        if (!cur || !cp || !x || x.decision) return;
        const decision = { approvedLineIds: x.lines.map((l) => l.id), declinedLineIds: [], decidedAt: Date.now() };
        patchProgress(id, { extras: cp.extras!.map((e) => (e.id === extra.id ? { ...e, decision } : e)) });
        const toOrder = x.lines.filter((l) => l.kind === 'part' && l.source === 'order');
        notify({ icon: '✅', title: `${cur.customer.name} අමතර වැඩ අනුමත කළා`, body: toOrder.length ? 'ගරාජය කොටස් ඇණවුම් කරයි.' : 'වැඩ කරගෙන යන්න.', tone: 'success' });
        if (toOrder.length) {
          patch(id, (c) => (c.workshop ? { workshop: { ...c.workshop, parts: 'ordered', partsSummary: toOrder.map((l) => `${l.name} (${l.partType})`).join(' · ') } } : {}));
          later(() => {
            patch(id, (c) => (c.workshop ? { workshop: { ...c.workshop, parts: 'arrived' } } : {}));
            notify({ icon: '📦', title: 'කොටස් ගරාජයට ලැබුණා', body: `${cur.title} · අමතර කොටස් ${toOrder.length} ක්`, tone: 'success' });
          }, PARTS_ARRIVE_MS);
        }
      }, OWNER_APPROVE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch, patchProgress]
  );

  const markReadyForHandover = useCallback(
    (id: string, report: HandoverReport) => {
      patchProgress(id, { stage: 'readyForHandover', handover: report });
      notify({ icon: '🔑', title: 'භාරදීමට සූදානම්', body: 'අයිතිකරු පරීක්ෂා කර ඔවුන්ගේ QR / කේතය පෙන්වයි.', tone: 'primary' });
    },
    [notify, patchProgress]
  );

  const closeWorkshopJob = useCallback(
    (id: string, code: string) => {
      const j = find(id);
      const p = j?.workshop?.progress;
      if (!j || !p || p.stage !== 'readyForHandover' || !checkCloseCode(p.closeCode, code)) return false;
      const now = Date.now();
      patchProgress(id, { stage: 'closed', closedAt: now }, { stage: 'done', completedAt: now });
      addEarning(j, 0);
      notify({ icon: '✅', title: 'රැකියාව අවසන්', body: `${j.customer.name} කේතයෙන් තහවුරු කළා · ඔබට රු. ${j.pay.toLocaleString()}`, tone: 'success' });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patchProgress]
  );
  const setNotes = useCallback((id: string, notes: string) => patch(id, { notes }), [patch]);

  // ---------- Parts pickups ----------
  const collectedAtCounter = useCallback(
    (id: string) => {
      setCollects((prev) => prev.map((t) => (t.id === id && t.status === 'assigned' ? { ...t, status: 'collected', collectedAt: Date.now() } : t)));
      notify({ icon: '🔩', title: 'කොටස් ලැබුණා', body: 'ගරාජයට ගෙන ගොස් භාර දෙන්න.', tone: 'success' });
    },
    [notify]
  );
  const deliverParts = useCallback(
    (id: string) => {
      const t = collects.find((x) => x.id === id);
      setCollects((prev) => prev.map((x) => (x.id === id && x.status === 'collected' ? { ...x, status: 'delivered', deliveredAt: Date.now() } : x)));
      if (t) notify({ icon: '📦', title: `${t.garage.name} වෙත භාර දුන්නා`, body: 'ගරාජය කොටස් පරීක්ෂා කර ලැබුණු බව සලකුණු කරයි.', tone: 'success' });
    },
    [collects, notify]
  );

  // ---------- Money ----------
  const settleGarage = useCallback(
    (garageId: string) => {
      setEarnings((prev) => prev.map((e) => (e.garageId === garageId ? { ...e, settled: true } : e)));
      notify({ icon: '🤝', title: 'ගිණුම පියවූවා', body: 'ගරාජය ගෙවූ බව සහ මුදල් භාර දුන් බව සටහන් කළා.', tone: 'success' });
    },
    [notify]
  );

  // ---------- Derived ----------
  const rating = useMemo(() => {
    const count = RATING_HISTORY.count + reviews.length;
    return { average: Number(((RATING_HISTORY.sum + reviews.reduce((s, r) => s + r.rating, 0)) / count).toFixed(1)), count };
  }, [reviews]);
  const offers = useMemo(() => jobs.filter((j) => j.stage === 'offered'), [jobs]);
  const openJob = jobs.find((j) => j.id === openId) ?? null;

  const value: TechState = {
    profile,
    links,
    invites,
    duty,
    jobs,
    earnings,
    reviews,
    rating,
    notice,
    openJob,
    offers,
    checkIn,
    checkOut,
    setBreak,
    acceptInvite,
    declineInvite,
    joinWithCode,
    acceptJob,
    declineJob,
    openSOS,
    closeSOS,
    markArrived,
    startInspection,
    submitInspection,
    toggleTask,
    finishRepair,
    closeWithOwner,
    collectPayment,
    receiveVehicle,
    sendDiagnosis,
    requestExtraWork,
    markReadyForHandover,
    closeWorkshopJob,
    setNotes,
    collects,
    collectedAtCounter,
    deliverParts,
    settleGarage,
    dismissNotice,
  };
  return <TechContext.Provider value={value}>{children}</TechContext.Provider>;
};

export const useTech = () => {
  const ctx = useContext(TechContext);
  if (!ctx) throw new Error('useTech must be used inside TechProvider');
  return ctx;
};

