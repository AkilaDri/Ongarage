import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChatInboxSheet, ChatSheet, JobReportSheet, jobRecordText, reportMessages, useChatStore, workshopUpdateTexts, type ReportKind, type ChatMessage, type ChatSide, type ChatVehicle, type InboxFilter, type InboxThread, type WorkshopProgress } from '@ongarage/shared';
import { ChatJobActions } from '../components/ChatJobActions';
import { Toast } from '../components/Toast';
import { useTech } from './TechContext';
import type { TechJob } from '../types';

/** One conversation about a job: with the customer (`c:`) or with the garage that assigned it (`g:`). */
export type ChatTarget = { id: string; title: string; subtitle?: string; phone?: string; vehicle?: ChatVehicle; record?: string };
export type ChatThreadInfo = InboxThread;

type ChatApi = {
  open: (target: ChatTarget) => void;
  unread: (id: string) => number;
  /** The message whose report (diagnosis, extra work) is being changed: its own form opens, not the typing box. */
  editReq: { id: string; kind: 'diagnosis' | 'extra'; extraId?: string } | null;
  clearEditReq: () => void;
  /** After a report was changed: its messages in the chat are rewritten from the new progress. */
  rewriteReport: (id: string, kind: 'diagnosis' | 'extra', extraId: string | undefined, progress: WorkshopProgress) => void;
  openInbox: () => void;
  totalUnread: number;
  /** The technician rang the other side: written into the chat. */
  logCall: (id: string) => void;
};

const ChatContext = createContext<ChatApi | null>(null);

/** The job a conversation belongs to: its id follows the "c:" / "g:" prefix. */
export const jobIdOf = (threadId: string) => threadId.slice(2);
const isGarageThread = (id: string) => id.startsWith('g:');

/** The inbox filters a technician sees: all, the customers, the garages. */
const FILTERS: InboxFilter[] = [
  { id: 'all', label: 'සියල්ල' },
  { id: 'customer', label: 'පාරිභෝගික' },
  { id: 'garage', label: 'ගරාජ' },
];

const SOS_STAGE_TEXT: Partial<Record<TechJob['stage'], string>> = {
  enroute: '🚗 ඔබ වෙත පිටත් වුණා — මගදී.',
  arrived: '📍 ස්ථානයට ළඟා වුණා.',
  inspecting: '🔍 වාහනය පරීක්ෂා කරමින් සිටී.',
  approval: '⏳ අලුත්වැඩියා ගාස්තුව ගරාජයේ අනුමැතියට.',
  repairing: '🔧 අලුත්වැඩියාව ආරම්භ කළා.',
  awaitingConfirm: '✅ වැඩ අවසන් — ඔබගේ තහවුරු කිරීම අවශ්‍යයි.',
  qr: '🔑 ඔබගේ QR / කේතය පෙන්වන්න.',
  done: '✅ රැකියාව අවසන් කළා.',
};

/** The record that opens a conversation about a job, for the customer or for the garage. */
const recordFor = (j: TechJob, side: 'customer' | 'garage') =>
  jobRecordText({
    title: `${j.sos ? '🚨 ' : ''}${j.title}`,
    who: side === 'customer' ? { label: 'Customer', name: j.customer.name, phone: j.customer.phone } : { label: 'ගරාජය', name: j.garage.name, phone: j.garage.phone },
    vehicle: j.vehicle,
    description: j.workshop?.description ?? j.sos?.note,
    at: j.workshop?.scheduledAt ?? j.assignedAt,
    doorstep: j.workshop?.doorstep,
    place: j.location.address,
    price: j.pay,
    priceLabel: 'ඔබේ ආදායම',
    photos: j.workshop?.photos?.length,
    voiceNotes: j.workshop?.voiceNotes?.length,
    notes: j.sos ? [`ඇමතුම් ගාස්තුව රු. ${j.sos.calloutFee.toLocaleString('en-US')}`, `ගරාජයේ ඇස්තමේන්තුව ${j.sos.quote ? `රු. ${j.sos.quote.toLocaleString('en-US')}` : 'පරීක්ෂා කළ පසු'}`] : undefined,
  });

/**
 * The technician's side of the chat: for each job they work, a conversation with the customer and one with the garage that
 * assigned it. The steps of the job are written into them as messages (the vehicle received, the diagnosis, extra work, on the
 * way, arrived…); the other side's replies are simulated until there is a backend.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jobs, notify } = useTech();
  const [target, setTarget] = useState<ChatTarget | null>(null);
  // When the owner last looked at the chat that is opening: what came after is shown as "new".
  const [newSince, setNewSince] = useState<number | undefined>(undefined);
  const [inbox, setInbox] = useState(false);
  // A report opened from a message in the chat (the diagnosis, extra work, the handover).
  const [report, setReport] = useState<{ id: string; kind: ReportKind } | null>(null);
  const reportJob = report ? jobs.find((x) => x.id === jobIdOf(report.id)) : undefined;
  const names = useRef<Record<string, string>>({});
  const store = useChatStore(
    'tech',
    {},
    (id, m) => notify({ icon: '💬', title: names.current[id] ?? 'OnChat', body: m.text ?? '📷', tone: 'primary' }),
    (id): ChatSide => (isGarageThread(id) ? 'garage' : 'owner')
  );

  // A job the technician has taken (or was assigned) has its two conversations; offers and declined jobs have none.
  const live = useMemo(() => jobs.filter((j) => j.stage !== 'offered' && j.stage !== 'declined'), [jobs]);
  const threads = useMemo<ChatThreadInfo[]>(() => {
    const list: ChatThreadInfo[] = [];
    for (const j of live) {
      for (const side of ['customer', 'garage'] as const) {
        const id = `${side === 'customer' ? 'c' : 'g'}:${j.id}`;
        const messages = store.messages(id);
        list.push({
          id,
          kind: side,
          icon: j.icon,
          title: side === 'customer' ? j.customer.name : j.garage.name,
          subtitle: `${j.sos ? 'SOS' : 'වැඩමුළු රැකියාව'} · ${j.title} · ${j.vehicle.plate}`,
          phone: side === 'customer' ? j.customer.phone : j.garage.phone,
          vehicle: j.vehicle,
          record: recordFor(j, side),
          last: messages[messages.length - 1],
          unread: store.unread(id),
          isNew: store.isFresh(id),
        });
      }
    }
    return list.sort((a, b) => b.unread - a.unread || (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }, [live, store.messages, store.unread, store.isFresh]);
  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unread, 0), [threads]);

  // The steps of each job go into its chats as messages from the technician (what they do), with the customer's answers as theirs.
  const seen = useRef<Record<string, { stage: TechJob['stage']; progress?: WorkshopProgress }> | null>(null);
  const known = useRef<Set<string> | null>(null);
  const later = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => later.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!seen.current || !known.current) {
      seen.current = Object.fromEntries(live.map((j) => [j.id, { stage: j.stage, progress: j.workshop?.progress }]));
      known.current = new Set(threads.map((t) => t.id));
      for (const t of threads) if (t.record) store.note(t.id, t.record);
      return;
    }
    for (const j of live) {
      const prev = seen.current[j.id];
      const cust = `c:${j.id}`;
      const garage = `g:${j.id}`;
      // New jobs: their record opens both chats, with a toast, and the customer says a first word a little later.
      if (!prev) {
        for (const id of [cust, garage]) {
          const info = threads.find((t) => t.id === id);
          if (info?.record) store.note(id, info.record);
          known.current.add(id);
          store.markFresh(id);
          names.current[id] = info?.title ?? 'OnChat';
        }
        notify({ icon: '💬', title: 'OnChat', body: `${j.customer.name} සහ ${j.garage.name} සමඟ චැට් විවෘත විය`, tone: 'primary' });
        later.current.push(setTimeout(() => store.receive(cust, j.sos ? 'මම ඉන්නේ ස්ථානයේ — ඉක්මනින් එන්න පුළුවන්ද?' : 'වාහනය ගෙනාවාම මට කියන්න, ස්තූතියි.'), 4000));
      } else {
        // Workshop steps: the garage's steps are the technician's here; the owner's answers stay the owner's.
        if (j.workshop?.progress) {
          for (const u of workshopUpdateTexts(prev.progress, j.workshop.progress)) store.postUpdate(cust, u.text, u.from === 'garage' ? 'tech' : u.from, u.photos, u.report);
        }
        // SOS steps, to the customer and (the money ones) to the garage.
        if (j.sos && prev.stage !== j.stage && SOS_STAGE_TEXT[j.stage]) {
          store.postUpdate(cust, SOS_STAGE_TEXT[j.stage]!, 'tech');
          if (j.stage === 'approval' || j.stage === 'done' || j.stage === 'arrived') store.postUpdate(garage, SOS_STAGE_TEXT[j.stage]!, 'tech');
        }
      }
      seen.current[j.id] = { stage: j.stage, progress: j.workshop?.progress };
    }
  }, [live, threads, store.note, store.postUpdate, store.receive, notify]);

  const logCall = useCallback((id: string) => store.postUpdate(id, '📞 කාර්මිකයා ඇමතුවා.', 'tech'), [store.postUpdate]);

  const open = useCallback(
    (t: ChatTarget) => {
      names.current[t.id] = t.title;
      const record = t.record ?? threads.find((x) => x.id === t.id)?.record;
      if (record) store.note(t.id, record);
      setNewSince(store.seenAt(t.id));
      setTarget(t);
      store.markRead(t.id);
    },
    [store.markRead, store.note, store.seenAt, threads]
  );

  const [editReq, setEditReq] = useState<{ id: string; kind: 'diagnosis' | 'extra'; extraId?: string } | null>(null);
  const clearEditReq = useCallback(() => setEditReq(null), []);
  const rewriteReport = useCallback(
    (id: string, kind: 'diagnosis' | 'extra', extraId: string | undefined, progress: WorkshopProgress) => {
      const updates = reportMessages(progress, kind, extraId);
      const mine = store.messages(id).filter((m) => m.report?.kind === kind && (kind === 'diagnosis' || m.report?.id === extraId));
      mine.forEach((m, i) => {
        const first = (m.text ?? '').split('\n')[0];
        const u = updates.find((x) => x.text.split('\n')[0] === first) ?? (updates.length === 1 ? updates[0] : updates[i]);
        if (u) store.edit(id, m.id, u.text, u.photos ?? []);
      });
    },
    [store.messages, store.edit]
  );
  const count = target ? store.messages(target.id).length : 0;
  useEffect(() => {
    if (target) store.markRead(target.id);
  }, [count, target, store.markRead]);

  return (
    <ChatContext.Provider value={{ open, unread: store.unread, editReq, clearEditReq, rewriteReport, openInbox: () => setInbox(true), totalUnread, logCall }}>
      {children}
      <ChatInboxSheet visible={inbox} onClose={() => setInbox(false)} overlay={<Toast topOffset={40} />} me="tech" filters={FILTERS} threads={threads} onOpen={(t) => { setInbox(false); open(t); }} />
      <ChatSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        overlay={<Toast topOffset={40} />}
        me="tech"
        title={target?.title ?? ''}
        subtitle={target?.subtitle}
        phone={target?.phone}
        vehicle={target?.vehicle}
        messages={target ? store.messages(target.id) : []}
        onSend={(msg) => (target ? store.send(target.id, msg) : Promise.resolve(true))}
        onDelete={(id) => target && store.remove(target.id, id)}
        onEdit={(id, text) => target && store.edit(target.id, id, text)}
        onEditReport={(m) => target && m.report && (m.report.kind === 'diagnosis' || m.report.kind === 'extra') && setEditReq({ id: target.id, kind: m.report.kind, extraId: m.report.id })}
        onCall={() => target && logCall(target.id)}
        newSince={newSince}
        onOpenReport={(m) => target && m.report && setReport({ id: target.id, kind: m.report.kind })}
        actions={target && !isGarageThread(target.id) ? <ChatJobActions jobId={jobIdOf(target.id)} /> : undefined}
        whatsapp
      />
      <JobReportSheet visible={!!report} onClose={() => setReport(null)} overlay={<Toast topOffset={40} />} subject={{ title: reportJob?.title ?? '', vehicle: reportJob ? `${reportJob.vehicle.name} · ${reportJob.vehicle.plate}` : undefined }} progress={reportJob?.workshop?.progress} focus={report?.kind} />
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};

