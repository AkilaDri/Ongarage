import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { canCancelTow, finalNeedsApproval, type TowCondition, type TowOption, type TowRequest, type TowStage, type LatLng } from '@ongarage/shared';
import { TOW_OPERATORS } from '../constants/towOperators';
import { useNotice } from './NoticeContext';

/** The simulated operator moves through its steps this many seconds apart (the drive to the pickup takes `ENROUTE_SEC`). */
const STEP_SEC = 4;
const ENROUTE_SEC = 8;

export type TowInput = { pickup: LatLng; pickupText: string; destination: LatLng; destinationText: string; condition: TowCondition; vehicleId?: string; note?: string };

type Api = {
  /** The request in progress (or the last one finished) — one at a time. */
  request: TowRequest | null;
  start: (option: TowOption, input: TowInput) => void;
  cancel: () => void;
  /** The owner's answer to a final price above the estimate's limit. */
  answerPrice: (approve: boolean) => void;
  rate: (stars: number) => void;
  dismiss: () => void;
};

const TowContext = createContext<Api | null>(null);

const NEXT: Partial<Record<TowStage, TowStage>> = { searching: 'accepted', accepted: 'enroute', enroute: 'arrived', arrived: 'loading', loading: 'transporting', transporting: 'delivered' };
const TEXT: Partial<Record<TowStage, { title: string; body: (n: string) => string }>> = {
  accepted: { title: 'Tow truck එක පිළිගත්තා', body: (n) => `${n} ඔබ වෙත එනවා.` },
  enroute: { title: 'Truck එක මග', body: (n) => `${n} ඔබ වෙත පැමිණෙමින් සිටී.` },
  arrived: { title: 'Truck එක ළඟා වුණා', body: (n) => `${n} ඔබ සිටින තැනට පැමිණියා.` },
  transporting: { title: 'වාහනය රැගෙන යනවා', body: () => 'ඔබේ වාහනය ගමනාන්තය බලා යමින් පවතී.' },
  delivered: { title: 'වාහනය බාගත්තා', body: () => 'ගමනාන්තයට ළඟා වුණා.' },
};

export const TowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const [request, setRequest] = useState<TowRequest | null>(null);
  const live = useRef(request);
  live.current = request;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const opName = (r: TowRequest) => TOW_OPERATORS.find((o) => o.id === r.operatorId)?.name ?? 'Operator';

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const r = live.current;
    if (!r || r.cancelled || r.stage === 'delivered') return;
    const next = NEXT[r.stage];
    if (!next) return;
    timer.current = setTimeout(() => {
      const cur = live.current;
      if (!cur || cur.cancelled || cur.stage !== r.stage) return;
      // On delivery the operator states its final price. The demo adds a recovery overrun on a pulled-out vehicle, which needs the owner's approval.
      const overrun = cur.condition === 'stuck' || cur.condition === 'accident';
      const final = next === 'delivered' ? (overrun ? Math.round((cur.quote.total * 1.22) / 10) * 10 : cur.quote.total) : undefined;
      const approval = final !== undefined && finalNeedsApproval(cur.quote, final) ? ('pending' as const) : undefined;
      const updated: TowRequest = { ...cur, stage: next, ...(final !== undefined ? { finalPrice: final, approval } : {}) };
      setRequest(updated);
      live.current = updated;
      const t = TEXT[next];
      if (t) notify({ icon: '🛻', title: t.title, body: t.body(opName(cur)), tone: 'primary' });
      if (approval) notify({ icon: '💰', title: 'අවසන් මිල ඇස්තමේන්තුවට වඩා වැඩියි', body: `රු. ${final} — ඔබේ අනුමැතිය අවශ්‍යයි.`, tone: 'danger' });
      schedule();
    }, (r.stage === 'enroute' ? ENROUTE_SEC : STEP_SEC) * 1000);
  }, [notify]);

  const start = useCallback(
    (option: TowOption, input: TowInput) => {
      const now = Date.now();
      const r: TowRequest = { id: `tow${now}`, operatorId: option.op.id, ...input, quote: option.quote, etaMin: option.etaMin, stage: 'searching', createdAt: now };
      setRequest(r);
      live.current = r;
      schedule();
    },
    [schedule]
  );

  const cancel = useCallback(() => {
    const r = live.current;
    if (!r || !canCancelTow(r)) return;
    if (timer.current) clearTimeout(timer.current);
    setRequest({ ...r, cancelled: true });
    notify({ icon: '✖️', title: 'Tow request එක අවලංගු කළා', body: 'නොමිලේ අවලංගු කළා.', tone: 'primary' });
  }, [notify]);

  const answerPrice = useCallback(
    (approve: boolean) => {
      const r = live.current;
      if (!r || r.approval !== 'pending') return;
      setRequest({ ...r, approval: approve ? 'approved' : 'disputed' });
      notify(approve ? { icon: '✓', title: 'මිල අනුමත කළා', body: 'Operator ට කෙලින්ම ගෙවන්න.', tone: 'success' } : { icon: '⚠️', title: 'මිල ගැන ගැටලුවක් වාර්තා කළා', body: 'OnGarage මෙය සමාලෝචනය කරයි; ගෙවීම ස්ථිර වන තුරු ඉන්න.', tone: 'primary' });
    },
    [notify]
  );

  const rate = useCallback((stars: number) => setRequest((r) => (r ? { ...r, rating: stars } : r)), []);
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRequest(null);
  }, []);

  const value = useMemo<Api>(() => ({ request, start, cancel, answerPrice, rate, dismiss }), [request, start, cancel, answerPrice, rate, dismiss]);
  return <TowContext.Provider value={value}>{children}</TowContext.Provider>;
};

export const useTow = () => {
  const ctx = useContext(TowContext);
  if (!ctx) throw new Error('useTow must be used inside TowProvider');
  return ctx;
};

