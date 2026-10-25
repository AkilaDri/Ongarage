import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { breakdownInfo, categoryInfo, ChatSheet, JobReportSheet, isReceivedUpdate, ownerEditKindOf, jobRecordText, partsUpdateText, reportMessages, useChatStore, workshopUpdateTexts, type ChatMessage, type ChatVehicle, type ReportKind, type WorkshopProgress } from '@ongarage/shared';
import { openMartFor, openShopFor } from '../utils/martBridge';
import { ChatAskShopChip } from '../components/mart/ChatAskShopChip';
import { ChatInboxSheet } from '../components/ChatInboxSheet';
import { ThreadSheet, type ThreadTarget } from '../components/mart/ThreadSheet';
import { useMart } from './MartContext';
import { Toast } from '../components/Toast';
import { ChatJobActions } from '../components/ChatJobActions';
import { inquiryText, INQUIRY_REPLIES } from '@ongarage/shared';
import { useGarage } from './GarageContext';
import { useParts } from './PartsContext';

/** One conversation: the job's key and the customer the garage is talking to. */
export type ChatTarget = { id: string; title: string; subtitle?: string; phone?: string; vehicle?: ChatVehicle; /** The job's record, put in the chat when it opens. */ record?: string; /** A chat started from a shop's profile: not tied to a job, listed in OnChat once it has messages. */ profile?: 'shop' };

/** What a conversation is about: a customer's direct request, a booked (won) job, an accepted SOS, or a parts shop in OnMart. */
export type ChatKind = 'direct' | 'job' | 'sos' | 'mart' | 'inquiry';
export type ChatThreadInfo = ChatTarget & { kind: ChatKind; icon: string; /** The job is over: the inbox keeps the chat under "අවසන්". */ done?: boolean; last?: ChatMessage; unread: number; /** OnMart: the shop's conversation, which opens in OnMart's own chat. */ mart?: ThreadTarget };

/**
 * A job keeps the same conversation from the first request to the booking: a booking's id is "b-" plus the request's, so
 * the key leaves the "b-" off.
 */
export const chatKey = (id: string) => id.replace(/^b-/, '');

type ChatApi = {
  /** Opens the chat of a job with its customer. */
  open: (target: ChatTarget) => void;
  /** Opens a chat and sends a first message in it (a direct reply to a post on the On Feed). */
  openWith: (target: ChatTarget, text: string) => void;
  /** Messages from the customer the garage has not read yet. */
  unread: (id: string) => number;
  /** On the Jobs tab, backing out of a conversation opened from the inbox returns to the inbox (set by the app shell per tab). */
  setInboxReturn: (on: boolean) => void;
  /** The list of every conversation (the inbox in the top header). */
  openInbox: () => void;
  totalUnread: number;
  /** The message whose report (diagnosis, extra work) is being changed: its own form opens, not the typing box. */
  editReq: { id: string; kind: 'diagnosis' | 'extra' | 'checkin'; extraId?: string } | null;
  clearEditReq: () => void;
  /** After a report was changed: its messages in the chat are rewritten from the new progress. */
  rewriteReport: (id: string, kind: 'diagnosis' | 'extra', extraId: string | undefined, progress: WorkshopProgress) => void;
  /** After the condition photos of the received vehicle were changed: the "vehicle received" line carries the new photos. */
  rewriteCheckIn: (id: string, photos: string[]) => void;
  /** The garage rang the customer: written into the job's chat. */
  logCall: (id: string) => void;
};

const ChatContext = createContext<ChatApi | null>(null);

/**
 * The garage's side of the chat with its customers: those who sent a direct request, those whose bid it won (a booked job) and
 * the owner of an SOS it accepted. The customer's replies are simulated until there is a backend.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify, bookings, directs, activeJobs, inquiries } = useGarage();
  // OnMart's shop conversations belong in the same list.
  const { offers, threads: martThreads } = useMart();
  const { requests, orders } = useParts();
  const [martTarget, setMartTarget] = useState<ThreadTarget | null>(null);
  const [martSeen, setMartSeen] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<ChatTarget | null>(null);
  // When the owner last looked at the chat that is opening: what came after is shown as "new".
  const [newSince, setNewSince] = useState<number | undefined>(undefined);
  const [inbox, setInbox] = useState(false);
  // On the Home / Jobs tab, backing out of a conversation opened from the inbox returns to the inbox; a second back closes the chat.
  const fromInbox = useRef(false);
  const inboxReturn = useRef(false);
  const closeConversation = useCallback((clear: () => void) => {
    clear();
    if (fromInbox.current && inboxReturn.current) setInbox(true);
    fromInbox.current = false;
  }, []);
  // A report opened from a message in the chat (the diagnosis, extra work, the handover).
  const [report, setReport] = useState<{ id: string; kind: ReportKind } | null>(null);
  const reportBooking = report ? bookings.find((x) => chatKey(x.id) === report.id) : undefined;
  const names = useRef<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, ChatTarget>>({});
  // The first job still to do already has a message from its customer.
  const initial = useMemo<Record<string, ChatMessage[]>>(() => {
    const first = bookings.find((b) => b.status !== 'completed' && b.status !== 'cancelled');
    // The inquiries already waiting open with the customer's question as its first message.
    const asked: Record<string, ChatMessage[]> = Object.fromEntries(
      inquiries.map((q) => [`inq:${q.id}`, [{ id: `m-${q.id}`, from: 'owner' as const, text: inquiryText({ category: categoryInfo(q.categoryId).name, service: q.service, vehicle: `${q.vehicle.name} ${q.vehicle.plate}`, text: q.text }), at: q.at }]])
    );
    return first ? { ...asked, [chatKey(first.id)]: [{ id: 'm-seed', from: 'owner', text: 'වාහනය ගන්න එන්න ඕනේ වෙලාවක් කියන්න පුළුවන්ද?', at: Date.now() - 8 * 60 * 1000 }] } : {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const store = useChatStore('garage', initial, (id, m) => notify({ icon: '💬', title: names.current[id] ?? 'පාරිභෝගිකයා', body: m.text ?? '📷', tone: 'primary' }));

  // Every conversation the garage can have: an accepted SOS, a booked job (bid or direct), a direct request still waiting.
  const threads = useMemo<ChatThreadInfo[]>(() => {
    const list = new Map<string, Omit<ChatThreadInfo, 'last' | 'unread'>>();
    for (const d of directs) {
      list.set(chatKey(d.id), { id: chatKey(d.id), kind: 'direct', icon: '📅', title: d.customer.name, subtitle: `ඍජු ඉල්ලීම · ${categoryInfo(d.categoryId).name} · ${d.vehicle.plate}`, phone: d.customer.phone, vehicle: d.vehicle, record: jobRecordText({ title: `${categoryInfo(d.categoryId).name}${d.service ? ' · ' + d.service : ''} (ඍජු ඉල්ලීම)`, who: { label: 'Customer', name: d.customer.name, phone: d.customer.phone }, vehicle: d.vehicle, description: d.description, partType: d.sparePart, at: d.preferredAt, doorstep: d.doorstep, place: d.location.address, photos: d.photos?.length, voiceNotes: d.voiceNotes?.length }) });
    }
    for (const b of bookings) {
      // A finished or cancelled job keeps its conversation (under the "අවසන්" chip), if anything was ever written in it.
      const over = b.status === 'completed' || b.status === 'cancelled';
      if (over && !store.messages(chatKey(b.id)).length) continue;
      const sos = b.source === 'sos';
      list.set(chatKey(b.id), { id: chatKey(b.id), done: over, kind: sos ? 'sos' : 'job', icon: sos ? '🚨' : b.icon, title: b.customer.name, subtitle: `${sos ? 'SOS' : b.source === 'direct' ? 'ඍජු වෙන්කිරීම' : 'ලංසු'} · ${b.title} · ${b.vehicle.plate}`, phone: b.customer.phone, vehicle: b.vehicle, record: jobRecordText({ title: b.title, who: { label: 'Customer', name: b.customer.name, phone: b.customer.phone }, vehicle: b.vehicle, description: b.job?.description, partType: b.job?.sparePart, at: b.scheduledAt, doorstep: b.doorstep, place: b.address, price: b.price, priceLabel: b.calloutOnly ? 'ඇමතුම් ගාස්තුව' : 'එකඟ වූ මිල', photos: b.job?.photos?.length, voiceNotes: b.job?.voiceNotes?.length, notes: b.note ? [`ගරාජයේ සටහන: ${b.note}`] : undefined }) });
    }
    for (const j of activeJobs) {
      const r = j.request;
      list.set(chatKey(j.id), { id: chatKey(j.id), kind: 'sos', icon: breakdownInfo(r.breakdownId).icon, title: r.customer.name, subtitle: `SOS · ${breakdownInfo(r.breakdownId).label} · ${r.vehicle.plate}`, phone: r.customer.phone, vehicle: r.vehicle, record: jobRecordText({ title: `SOS · ${breakdownInfo(r.breakdownId).label}`, who: { label: 'Customer', name: r.customer.name, phone: r.customer.phone }, vehicle: r.vehicle, description: r.note, place: r.location.address, price: r.calloutFee, priceLabel: 'ඇමතුම් ගාස්තුව', notes: [`ස්ථානයට දුර ${r.distanceKm} km`] }) });
    }
    for (const q of inquiries) {
      list.set(`inq:${q.id}`, { id: `inq:${q.id}`, kind: 'inquiry', icon: '❓', title: q.customer.name, subtitle: `විමසීම · ${categoryInfo(q.categoryId).name}${q.service ? ` · ${q.service}` : ''} · ${q.vehicle.plate}`, phone: q.customer.phone, vehicle: q.vehicle });
    }
    for (const [id, t] of Object.entries(extras)) {
      if (list.has(id) || !store.messages(id).length) continue;
      list.set(id, { id, kind: 'mart', icon: '🏪', title: t.title, subtitle: t.subtitle, phone: t.phone });
    }
    const people: ChatThreadInfo[] = [...list.values()].map((t) => {
      const messages = store.messages(t.id);
      return { ...t, last: messages[messages.length - 1], unread: store.unread(t.id), isNew: store.isFresh(t.id) };
    });
    // Parts shops: every shop that has an offer on a request, with what has been written to it so far.
    const shops = new Map<string, ChatThreadInfo>();
    for (const o of offers) {
      if (!o.available) continue;
      const key = `${o.enquiryId}:${o.shop.id}`;
      if (shops.has(key)) continue;
      const messages = martThreads.find((t) => t.id === key)?.messages ?? [];
      const mapped: ChatMessage[] = messages.map((m) => ({ id: m.id, from: m.from === 'buyer' ? 'garage' : 'owner', text: m.text, photos: m.photos, at: m.at }));
      const seen = martSeen[key] ?? 0;
      shops.set(key, {
        id: key,
        kind: 'mart',
        icon: '🏪',
        title: o.shop.name,
        subtitle: `OnMart · ${o.shop.address}`,
        phone: o.shop.phone,
        last: mapped[mapped.length - 1],
        unread: messages.filter((m) => m.from === 'shop' && m.at > seen).length,
        mart: { enquiryId: o.enquiryId, shop: o.shop },
      });
    }
    return [...people, ...shops.values()]
      .sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0) || (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }, [directs, bookings, activeJobs, inquiries, store.messages, store.unread, store.isFresh, extras, offers, martThreads, martSeen]);

  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unread, 0), [threads]);

  // The moment the garage takes a job (a won bid, a confirmed direct booking, an accepted SOS) its chat with the customer is
  // in OnChat, with a toast; the customer writes the first word a few seconds later (simulated).
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!known.current) {
      known.current = new Set(threads.map((t) => t.id));
      for (const t of threads) if (t.record) store.note(t.id, t.record);
      return;
    }
    for (const t of threads) {
      if (known.current.has(t.id) || t.kind === 'mart') continue;
      known.current.add(t.id);
      store.markFresh(t.id);
      names.current[t.id] = t.title;
      if (t.record) store.note(t.id, t.record);
      if (t.kind === 'direct') continue;
      // A new inquiry: the customer's question is the first message.
      if (t.kind === 'inquiry') {
        const q = inquiries.find((x) => `inq:${x.id}` === t.id);
        if (q) later.current.push(setTimeout(() => store.receive(t.id, inquiryText({ category: categoryInfo(q.categoryId).name, service: q.service, vehicle: `${q.vehicle.name} ${q.vehicle.plate}`, text: q.text })), 800));
        continue;
      }
      notify({ icon: '💬', title: 'OnChat', body: `${t.title} සමඟ චැට් එකක් විවෘත විය`, tone: 'primary' });
      const first = t.kind === 'sos' ? 'මම ඉන්නේ ස්ථානයේ — ඉක්මනින් එන්න පුළුවන්ද?' : 'මෙම රැකියාව භාර ගත්තාට ස්තූතියි. වාහනය ගෙනෙන්න ඕන වෙලාව කියන්න.';
      later.current.push(setTimeout(() => store.receive(t.id, first), 4000));
    }
  }, [threads, notify, store.receive, store.note]);
  const later = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => later.current.forEach(clearTimeout), []);

  // Every step the garage takes on a job goes into its chat as an update: the vehicle received, the diagnosis, a new part asked for,
  // ordered, received or fitted, extra work and what the owner answered (also by phone), the job ready or closed.
  const seenProgress = useRef<Record<string, WorkshopProgress> | null>(null);
  useEffect(() => {
    if (!seenProgress.current) {
      seenProgress.current = Object.fromEntries(bookings.map((b) => [chatKey(b.id), b.progress] as const).filter(([, p]) => !!p)) as Record<string, WorkshopProgress>;
      return;
    }
    for (const b of bookings) {
      const key = chatKey(b.id);
      if (!b.progress) continue;
      const before = seenProgress.current[key];
      for (const u of workshopUpdateTexts(before, b.progress)) store.postUpdate(key, u.text, u.from, u.photos, u.report);
      if (before?.stage === 'booked' && b.progress.stage !== 'booked') {
        later.current.push(setTimeout(() => store.postUpdate(key, '✅ ඔව්, මගේ වාහනය භාර දුන්නා — තහවුරු කරමි.', 'owner'), 4000));
      }
      seenProgress.current[key] = b.progress;
    }
  }, [bookings, store.postUpdate]);

  // The parts the garage asks shops for, orders and receives for a job.
  const seenParts = useRef<{ requests: Set<string>; ordered: Set<string>; received: Set<string> } | null>(null);
  useEffect(() => {
    const names = (requestId: string) => (requests.find((r) => r.id === requestId)?.lines ?? []).map((l) => l.name);
    if (!seenParts.current) {
      seenParts.current = { requests: new Set(requests.map((r) => r.id)), ordered: new Set(orders.map((o) => o.requestId)), received: new Set(orders.filter((o) => o.status === 'received').map((o) => o.requestId)) };
      return;
    }
    const seen = seenParts.current;
    for (const r of requests) {
      if (!seen.requests.has(r.id) && r.status !== 'cancelled') {
        seen.requests.add(r.id);
        store.postUpdate(chatKey(r.bookingId), partsUpdateText('asked', r.lines.map((l) => l.name)), 'garage');
      }
    }
    for (const o of orders) {
      const req = requests.find((r) => r.id === o.requestId);
      if (!req) continue;
      if (!seen.ordered.has(o.requestId)) {
        seen.ordered.add(o.requestId);
        store.postUpdate(chatKey(req.bookingId), partsUpdateText('ordered', names(o.requestId)), 'garage');
      }
      if (o.status === 'received' && !seen.received.has(o.requestId)) {
        seen.received.add(o.requestId);
        store.postUpdate(chatKey(req.bookingId), partsUpdateText('received', names(o.requestId)), 'garage');
      }
    }
  }, [requests, orders, store.postUpdate]);

  const logCall = useCallback((id: string) => store.postUpdate(chatKey(id), '📞 ගරාජය පාරිභෝගිකයාට ඇමතුවා.', 'garage'), [store.postUpdate]);

  const open = useCallback(
    (t: ChatTarget) => {
      const id = chatKey(t.id);
      names.current[id] = t.title;
      const record = t.record ?? threads.find((x) => x.id === id)?.record;
      if (record) store.note(id, record);
      if (t.profile) setExtras((m) => (m[id] ? m : { ...m, [id]: { ...t, id } }));
      setNewSince(store.seenAt(id));
      setTarget({ ...t, id });
      store.markRead(id);
    },
    [store.markRead, store.note, store.seenAt, threads]
  );

  const openWith = useCallback(
    (t: ChatTarget, text: string) => {
      open(t);
      void store.send(chatKey(t.id), { text });
    },
    [open, store.send]
  );

  const openShop = useCallback((t: ThreadTarget) => {
    setMartTarget(t);
    setMartSeen((m) => ({ ...m, [`${t.enquiryId}:${t.shop.id}`]: Date.now() }));
  }, []);
  // A shop's reply that arrives while its chat is open is read as it arrives.
  const martCount = martTarget ? martThreads.find((t) => t.id === `${martTarget.enquiryId}:${martTarget.shop.id}`)?.messages.length ?? 0 : 0;
  useEffect(() => {
    if (martTarget) setMartSeen((m) => ({ ...m, [`${martTarget.enquiryId}:${martTarget.shop.id}`]: Date.now() }));
  }, [martCount, martTarget]);

  // What arrives while the chat is open is read as it arrives.
  // The vehicle has not been received yet (the garage has not confirmed it with its condition photos): no progress update can be given from the chat,
  // so the ready-made replies that announce one (received, extra work found, work finished) are not offered.
  const targetBooking = target ? bookings.find((x) => chatKey(x.id) === target.id) : undefined;
  const notReceived = !!targetBooking && targetBooking.progress?.stage === 'booked' && targetBooking.status !== 'completed' && targetBooking.status !== 'cancelled';
  const [editReq, setEditReq] = useState<{ id: string; kind: 'diagnosis' | 'extra' | 'checkin'; extraId?: string } | null>(null);
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
  const rewriteCheckIn = useCallback(
    (id: string, photos: string[]) => {
      store.messages(id).filter((m) => m.update && isReceivedUpdate(m.text)).forEach((m) => store.edit(id, m.id, m.text ?? '', photos));
    },
    [store.messages, store.edit]
  );
  const count = target ? store.messages(target.id).length : 0;
  useEffect(() => {
    if (target) store.markRead(target.id);
  }, [count, target, store.markRead]);

  return (
    <ChatContext.Provider value={{ open, openWith, unread: (id) => store.unread(chatKey(id)), editReq, clearEditReq, rewriteReport, rewriteCheckIn, openInbox: () => setInbox(true), setInboxReturn: (on: boolean) => { inboxReturn.current = on; }, totalUnread, logCall }}>
      {children}
      <ChatInboxSheet visible={inbox} onClose={() => setInbox(false)} threads={threads} onOpen={(t) => {
          fromInbox.current = true;
          setInbox(false);
          if (t.mart) openShop(t.mart);
          else open(t);
        }}
      />
      <ThreadSheet target={martTarget} onClose={() => closeConversation(() => setMartTarget(null))} />
      <ChatSheet
        visible={!!target}
        onClose={() => closeConversation(() => setTarget(null))}
        overlay={<Toast topOffset={40} />}
        me="garage"
        title={target?.title ?? ''}
        subtitle={target?.subtitle}
        phone={target?.phone}
        vehicle={target?.vehicle}
        messages={target ? store.messages(target.id) : []}
        onSend={(msg) => (target ? store.send(target.id, msg) : Promise.resolve(true))}
        onDelete={(id) => target && store.remove(target.id, id)}
        onEdit={(id, text) => target && store.edit(target.id, id, text)}
        martPartOf={(m) => {
          const p = targetBooking?.progress;
          if (!p) return undefined;
          // A part the garage has to buy itself: the one it asked for, or the one the owner allowed it to buy.
          const buy = (lines?: { kind: string; source?: string; name: string }[]) => (lines ?? []).find((l) => l.kind === 'part' && l.source === 'order')?.name;
          if (m.report?.kind === 'diagnosis') return buy(p.diagnosis?.lines);
          if (m.report?.kind === 'extra') return buy(p.extras?.find((x) => x.id === m.report!.id)?.lines);
          if (m.from === 'owner' && m.update) {
            const kind = ownerEditKindOf(m.text);
            if (kind === 'diagnosis') return buy(p.diagnosis?.lines.filter((l) => p.decision?.approvedLineIds.includes(l.id)));
            if (kind === 'extra') return buy((p.extras ?? []).flatMap((x) => x.lines.filter((l) => x.decision?.approvedLineIds.includes(l.id))));
          }
          return undefined;
        }}
        onOpenMart={(part) => {
          fromInbox.current = false;
          setTarget(null);
          openMartFor(part);
        }}
        shopTagging
        tagBarExtra={target?.profile === 'shop' ? <ChatAskShopChip onPress={() => { fromInbox.current = false; setTarget(null); openShopFor(target.id.slice(5), true); }} /> : undefined}
        onOpenShop={(shopId) => {
          fromInbox.current = false;
          setTarget(null);
          openShopFor(shopId);
        }}
        editFormFor={(m) => (!!m.report && (m.report.kind === 'diagnosis' || m.report.kind === 'extra')) || isReceivedUpdate(m.text)}
        onEditReport={(m) => {
          if (!target) return;
          if (m.report && (m.report.kind === 'diagnosis' || m.report.kind === 'extra')) setEditReq({ id: target.id, kind: m.report.kind, extraId: m.report.id });
          else if (isReceivedUpdate(m.text)) setEditReq({ id: target.id, kind: 'checkin' });
        }}
        onCall={() => target && logCall(target.id)}
        newSince={newSince}
        onOpenReport={(m) => target && m.report && setReport({ id: target.id, kind: m.report.kind })}
        actions={target ? <ChatJobActions id={target.id} /> : undefined}
        composerLocked={notReceived ? '🚗 මුලින් වාහනය ලැබුණු බව තහවුරු කරන්න (ඉහත බොත්තමෙන්, ඡායාරූප සමඟ). ඉන් පසුව පමණක් පරීක්ෂා වාර්තාව, අමතර වැඩ, අවසන් කිරීම වැනි updates යැවිය හැක.' : undefined}
        quickReplies={notReceived ? ['ඡායාරූපයක් එවන්න පුළුවන්ද?', 'ස්තූතියි!'] : target?.id.startsWith('inq:') ? INQUIRY_REPLIES : undefined}
        whatsapp
      />
      <JobReportSheet visible={!!report} onClose={() => setReport(null)} overlay={<Toast topOffset={40} />} subject={{ title: reportBooking?.title ?? '', vehicle: reportBooking ? `${reportBooking.vehicle.name} · ${reportBooking.vehicle.plate}` : undefined }} progress={reportBooking?.progress} focus={report?.kind} />
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
