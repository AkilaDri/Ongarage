import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  approvedLines,
  DEFAULT_WARRANTY_MONTHS,
  INSPECTION_FEE,
  newWorkshopProgress,
  partMarketPrice,
  STANDARD_HANDOVER_CHECKS,
  warrantyEnd,
  workshopBill,
  type DiagnosisLine,
  type DiagnosisReport,
  type Dispute,
  type DisputeTopic,
  type WorkshopProgress,
} from '@ongarage/shared';
import { useNotice } from './NoticeContext';
import { MOCK_GARAGES, SAMPLE_UPLOAD_PHOTOS } from '../constants/mockData';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Simulated garage (compressed). The garage app does these steps for real once there's a backend.
const RECEIVE_MS = 4000;
const DIAGNOSE_MS = 6000;
const REPAIR_MS = 8000;
const SCAN_MS = 5000;
const REWORK_MS = 4000;
const CLAIM_REPLY_MS = 5000;

/** One workshop job the owner follows: a confirmed direct booking or an accepted bid. */
export type OwnerWorkshop = {
  /** The direct booking's or posted job's id. */
  id: string;
  garageName: string;
  categoryId: string;
  /** The agreed price: the bid, or the garage's estimate for a direct booking. */
  agreedPrice: number;
  scheduledAt: number;
  doorstep: boolean;
  warrantyMonths: number;
  progress: WorkshopProgress;
  /** The owner saw the job close (it then moves to their completed list). */
  acknowledged?: boolean;
};

export type WorkshopStart = Omit<OwnerWorkshop, 'progress' | 'warrantyMonths' | 'acknowledged'> & { warrantyMonths?: number };

type WorkshopState = {
  workshops: Record<string, OwnerWorkshop>;
  /** A booking was confirmed / a bid accepted: the job follows the workshop steps. */
  startWorkshop: (start: WorkshopStart) => void;
  /** Approve some or all diagnosis lines (none = only the agreed work). */
  approveDiagnosis: (id: string, approvedLineIds: string[]) => void;
  /** Decline the diagnosis: the job ends and only the inspection fee is due. */
  declineDiagnosis: (id: string) => void;
  /** The owner opened their code at handover; the garage scans it (simulated). */
  showCloseCode: (id: string) => void;
  /** The owner dismissed the closing screen. */
  acknowledgeClosed: (id: string) => void;
  reportProblem: (id: string, topic: DisputeTopic, text: string, photos?: string[]) => void;
  /** Rework didn't fix it, or the garage won't: OnGarage steps in (admin app). */
  escalate: (id: string) => void;
  claimWarranty: (id: string, text: string, photos?: string[]) => void;
};

const WorkshopContext = createContext<WorkshopState | null>(null);

// What the simulated garage finds, by service category.
const FINDINGS: Record<string, { findings: string; part: string; labour?: [string, number] }> = {
  '1': { findings: 'එන්ජින් මවුන්ට් එක ඉරිතලා ඇත, ඔයිල් ෆිල්ටරයද මාරු කළ යුතුයි.', part: 'Engine mount', labour: ['Engine bay cleaning', 1500] },
  '2': { findings: 'ඇල්ටනේටරය චාජ් කරන්නේ අඩුවෙන්. වයරින් කනෙක්ටරයක් දිරාපත් වී ඇත.', part: 'Wiring connector', labour: ['Charging system test', 1200] },
  '4': { findings: 'AC ගෑස් අඩුයි, කැබින් ෆිල්ටරය අපිරිසිදුයි.', part: 'Cabin filter', labour: ['AC gas refill', 3500] },
  '5': { findings: 'O2 සෙන්සරය දෝෂ කේතයක් පෙන්වයි (P0135). ECU remap එකට පෙර මාරු කළ යුතුයි.', part: 'O2 sensor' },
  '7': { findings: 'ඉදිරිපස බ්‍රේක් පෑඩ් 2mm දක්වා ගෙවී ඇත, බ්‍රේක් ද්‍රවය අඳුරුයි.', part: 'Brake pads (front)', labour: ['Brake fluid flush', 1800] },
  '11': { findings: 'බැටරිය 9.8V දක්වා බැස ඇත, ටර්මිනල් මලකඩ කා ඇත.', part: 'Battery terminals' },
};
const findingFor = (categoryId: string) => FINDINGS[categoryId] ?? { findings: 'ඔයිල් ෆිල්ටරය සහ එයාර් ෆිල්ටරය මාරු කළ යුතුයි.', part: 'Oil filter', labour: ['General inspection', 1000] };

const simulatedDiagnosis = (w: OwnerWorkshop): DiagnosisReport => {
  const f = findingFor(w.categoryId);
  const lines: DiagnosisLine[] = [{ id: `${w.id}-l1`, kind: 'part', name: f.part, qty: 1, partType: 'OEM', source: 'order', price: partMarketPrice(f.part, 'OEM') }];
  if (f.labour) lines.push({ id: `${w.id}-l2`, kind: 'labour', name: f.labour[0], qty: 1, price: f.labour[1] });
  return {
    findings: f.findings,
    photos: [SAMPLE_UPLOAD_PHOTOS[0]],
    lines,
    revisedTotal: w.agreedPrice + lines.reduce((s, l) => s + l.price, 0),
    finishBy: Date.now() + 6 * HOUR,
    sentAt: Date.now(),
  };
};

/** Seed: a direct booking (see BookingsContext) whose diagnosis waits for the owner. */
export const SEED_WORKSHOP_ID = 'db-seed';
const seedWorkshop = (): OwnerWorkshop => {
  const base: OwnerWorkshop = {
    id: SEED_WORKSHOP_ID,
    garageName: MOCK_GARAGES[3].name,
    categoryId: '7',
    agreedPrice: 3800,
    scheduledAt: Date.now() - 2 * HOUR,
    doorstep: false,
    warrantyMonths: DEFAULT_WARRANTY_MONTHS,
    progress: newWorkshopProgress(),
  };
  return {
    ...base,
    progress: {
      ...base.progress,
      stage: 'awaitingApproval',
      receivedAt: Date.now() - 100 * MIN,
      checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1),
      diagnosis: { ...simulatedDiagnosis(base), sentAt: Date.now() - 20 * MIN },
    },
  };
};

/**
 * Workshop jobs as the owner follows them: received → diagnosis → the owner approves
 * all, some or none → repair → handover → closed with the owner's code → warranty.
 * The garage's side is simulated with the same rules as the garage app.
 */
export const WorkshopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const [workshops, setWorkshops] = useState<Record<string, OwnerWorkshop>>(() => ({ [SEED_WORKSHOP_ID]: seedWorkshop() }));
  const live = useRef(workshops);
  live.current = workshops;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback(
    (id: string, change: Partial<WorkshopProgress>) =>
      setWorkshops((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], progress: { ...prev[id].progress, ...change } } } : prev)),
    []
  );
  const stageOf = (id: string) => live.current[id]?.progress.stage;

  /** Simulated garage: repair, then hand over with a report and the bill. */
  const repairThenHandover = useCallback(
    (id: string) => {
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'repairing') return;
        const lines = approvedLines(w.progress);
        patch(id, {
          stage: 'readyForHandover',
          handover: {
            checklist: [...lines.map((l) => l.name), ...STANDARD_HANDOVER_CHECKS].map((label) => ({ label, done: true })),
            beforePhotos: w.progress.checkInPhotos,
            afterPhotos: [SAMPLE_UPLOAD_PHOTOS[2]],
            oldPartsKept: lines.some((l) => l.kind === 'part'),
            bill: workshopBill(w.agreedPrice, w.progress),
            readyAt: Date.now(),
          },
        });
        notify({ icon: '🔑', title: `${w.garageName}: භාරදීමට සූදානම්`, body: 'වාහනය පරීක්ෂා කර, හරි නම් ඔබගේ කේතය පෙන්වන්න.', tone: 'success' });
      }, REPAIR_MS);
    },
    [later, notify, patch]
  );

  const diagnose = useCallback(
    (id: string) => {
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'diagnosing') return;
        patch(id, { stage: 'awaitingApproval', diagnosis: simulatedDiagnosis(w) });
        notify({ icon: '🔍', title: `${w.garageName}: පරීක්ෂා වාර්තාව`, body: 'ඔබ අනුමත කරන කොටස් / වැඩ පමණක් කෙරේ.', tone: 'primary' });
      }, DIAGNOSE_MS);
    },
    [later, notify, patch]
  );

  const startWorkshop = useCallback(
    (start: WorkshopStart) => {
      if (live.current[start.id]) return;
      const w: OwnerWorkshop = { ...start, warrantyMonths: start.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS, progress: newWorkshopProgress() };
      setWorkshops((prev) => ({ ...prev, [w.id]: w }));
      // The garage receives the vehicle at the booked time.
      later(() => {
        if (stageOf(w.id) !== 'booked') return;
        patch(w.id, { stage: 'diagnosing', receivedAt: Date.now(), checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1) });
        notify({ icon: '🚗', title: `${w.garageName}: වාහනය ලැබුණා`, body: w.doorstep ? 'ගරාජය ඔබ වෙත පැමිණ පරීක්ෂාව ඇරඹුවා.' : 'තත්ත්වයේ ඡායාරූප ගෙන පරීක්ෂාව ඇරඹුවා.', tone: 'primary' });
        diagnose(w.id);
      }, Math.max(0, w.scheduledAt - Date.now()) + RECEIVE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagnose, later, notify, patch]
  );

  const approveDiagnosis = useCallback(
    (id: string, approvedLineIds: string[]) => {
      const w = live.current[id];
      if (!w?.progress.diagnosis || w.progress.stage !== 'awaitingApproval') return;
      const declinedLineIds = w.progress.diagnosis.lines.map((l) => l.id).filter((x) => !approvedLineIds.includes(x));
      patch(id, { stage: 'repairing', decision: { approvedLineIds, declinedLineIds, decidedAt: Date.now() } });
      notify({ icon: '✅', title: 'අනුමැතිය යැව්වා', body: `${w.garageName} අලුත්වැඩියාව අරඹයි${approvedLineIds.length ? ' — අවශ්‍ය කොටස් දැන් ඇණවුම් කරයි' : ''}.`, tone: 'success' });
      repairThenHandover(id);
    },
    [notify, patch, repairThenHandover]
  );

  const declineDiagnosis = useCallback(
    (id: string) => {
      const w = live.current[id];
      if (!w || w.progress.stage !== 'awaitingApproval') return;
      patch(id, { stage: 'declined', closedAt: Date.now() });
      notify({ icon: '↩️', title: 'රැකියාව අවලංගු කළා', body: `පරීක්ෂා ගාස්තුව රු. ${INSPECTION_FEE.toLocaleString()} පමණක් ගෙවිය යුතුයි.`, tone: 'primary' });
    },
    [notify, patch]
  );

  const showCloseCode = useCallback(
    (id: string) => {
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'readyForHandover') return;
        const now = Date.now();
        patch(id, {
          stage: 'closed',
          closedAt: now,
          warrantyUntil: warrantyEnd(now, w.warrantyMonths),
          dispute: w.progress.dispute ? { ...w.progress.dispute, status: 'resolved' } : undefined,
        });
        notify({ icon: '🎉', title: 'රැකියාව අවසන්', body: `${w.garageName} ඔබගේ කේතය තහවුරු කළා · මාස ${w.warrantyMonths} වගකීම ආරම්භ විය.`, tone: 'success' });
      }, SCAN_MS);
    },
    [later, notify, patch]
  );

  const acknowledgeClosed = useCallback(
    (id: string) => setWorkshops((prev) => (prev[id]?.progress.stage === 'closed' && !prev[id].acknowledged ? { ...prev, [id]: { ...prev[id], acknowledged: true } } : prev)),
    []
  );

  const reportProblem = useCallback(
    (id: string, topic: DisputeTopic, text: string, photos?: string[]) => {
      const w = live.current[id];
      if (!w || w.progress.stage !== 'readyForHandover') return;
      const dispute: Dispute = { id: `dp-${id}-${Date.now()}`, topic, text, photos, raisedAt: Date.now(), status: 'open' };
      patch(id, { stage: 'disputed', dispute });
      notify({ icon: '📨', title: 'ගැටලුව ගරාජයට යැව්වා', body: 'ඔවුන් නැවත පරීක්ෂා කර හදයි. විසඳුණේ නැත්නම් OnGarage වෙත යොමු කරන්න.', tone: 'primary' });
      // Simulated garage: takes it back for rework, then hands over again.
      later(() => {
        const cur = live.current[id];
        if (cur?.progress.stage !== 'disputed' || cur.progress.dispute?.status !== 'open') return;
        patch(id, { stage: 'repairing', dispute: { ...cur.progress.dispute, status: 'rework' } });
        notify({ icon: '🔧', title: `${cur.garageName} නැවත හදමින්`, body: `“${text.slice(0, 60)}”`, tone: 'primary' });
        repairThenHandover(id);
      }, REWORK_MS);
    },
    [later, notify, patch, repairThenHandover]
  );

  const escalate = useCallback(
    (id: string) => {
      const w = live.current[id];
      const d = w?.progress.dispute;
      if (!w || !d || d.status === 'resolved' || d.status === 'escalated') return;
      patch(id, { stage: 'disputed', dispute: { ...d, status: 'escalated' } });
      notify({ icon: '⚖️', title: 'OnGarage වෙත යොමු කළා', body: 'අපගේ කණ්ඩායම පැය 24ක් ඇතුළත ඔබ දෙපාර්ශ්වයම අමතයි.', tone: 'primary' });
    },
    [notify, patch]
  );

  const claimWarranty = useCallback(
    (id: string, text: string, photos?: string[]) => {
      const w = live.current[id];
      const p = w?.progress;
      if (!w || !p || p.stage !== 'closed' || !p.warrantyUntil || p.warrantyUntil < Date.now() || p.warrantyClaim?.status === 'open') return;
      patch(id, { warrantyClaim: { id: `wc-${id}-${Date.now()}`, text, photos, raisedAt: Date.now(), status: 'open' } });
      notify({ icon: '🛡️', title: 'වගකීම් ඉල්ලීම යැව්වා', body: `${w.garageName} පිළිතුරු දෙනු ඇත.`, tone: 'primary' });
      later(() => {
        const claim = live.current[id]?.progress.warrantyClaim;
        if (claim?.status !== 'open') return;
        patch(id, { warrantyClaim: { ...claim, status: 'accepted' } });
        notify({ icon: '✅', title: `${w.garageName} වගකීම පිළිගත්තා`, body: 'නොමිලේ නැවත හදයි — පහසු වේලාවක වාහනය ගෙන එන්න.', tone: 'success' });
      }, CLAIM_REPLY_MS);
    },
    [later, notify, patch]
  );

  return (
    <WorkshopContext.Provider value={{ workshops, startWorkshop, approveDiagnosis, declineDiagnosis, showCloseCode, acknowledgeClosed, reportProblem, escalate, claimWarranty }}>
      {children}
    </WorkshopContext.Provider>
  );
};

export const useWorkshops = () => {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error('useWorkshops must be used inside WorkshopProvider');
  return ctx;
};
