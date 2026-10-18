import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { openMartFor, openShopFor } from '../utils/martBridge';
import { openBookingFor } from '../utils/bookingBridge';
import { InquirySheet, type InquiryInput } from '../components/InquirySheet';
import { BasketSheet } from '../components/mart/BasketSheet';
import { GarageInquiryActions } from '../components/GarageInquiryActions';
import { inquiryText, decisionEdits, extraDecisionText, ownerEditKindOf, cancelRequestText, categoryInfo, ChatInboxSheet, jobRecordText, ChatSheet, JobReportSheet, useChatStore, workshopUpdateTexts, type ReportKind, type ChatMessage, type ChatVehicle, type InboxThread, type WorkshopProgress } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { ThreadSheet, type ThreadTarget } from '../components/mart/ThreadSheet';
import { Toast } from '../components/Toast';
import { ChatJobCards } from '../components/ChatJobCards';
import { ChatCancelAction } from '../components/ChatCancelAction';
import { ChatFitAction } from '../components/ChatFitAction';
import { ChatAskShopChip } from '../components/mart/ChatAskShopChip';
import { CancelJobSheet } from '../components/workshop/CancelJobSheet';
import { ApprovalSheet } from '../components/workshop/ApprovalSheet';
import { ReconSheet } from '../components/workshop/ReconSheet';
import { useBids } from './BidsContext';
import { useVehicles } from './VehiclesContext';
import { useBookings } from './BookingsContext';
import { useMart } from './MartContext';
import { useNotice } from './NoticeContext';
import { useSOSRecords } from './SOSRecordsContext';
import { useWorkshops } from './WorkshopContext';

/** One conversation: the job's id (a booking or an accepted bid's job) and who the owner is talking to. */
export type ChatTarget = { id: string; title: string; subtitle?: string; phone?: string; vehicle?: ChatVehicle; /** For a chat not tied to a job (a garage's or a shop's profile): which inbox filter it sits under. */ profile?: 'garage' | 'shop' | 'sos'; /** The job's record, put in the chat when it opens. */ record?: string; /** A chat with a garage opened from its card: the service the owner was browsing, and whether the inquiry form opens at once. */ inquiry?: { categoryId?: string; compose?: boolean } };

/** One row of the inbox. An OnMart row opens the shop's own conversation. */
export type ChatThreadInfo = InboxThread & { mart?: ThreadTarget };

type ChatApi = {
  /** Opens the chat of a job with its garage. */
  open: (target: ChatTarget) => void;
  /** Puts a chat in OnChat without opening it (a garage took the owner's SOS): it is listed even before the first message. */
  start: (target: ChatTarget) => void;
  /** Messages from the garage the owner has not read yet. */
  unread: (id: string) => number;
  /** The list of every conversation (the chat icon in the top bar). */
  openInbox: () => void;
  totalUnread: number;
  /** The owner rang the garage: written into the job's chat. */
  logCall: (id: string) => void;
  /** Opens the parts basket of a job: every part the owner has to buy, asked of OnMart together. */
  openBasket: (workshopId: string) => void;
};

const ChatContext = createContext<ChatApi | null>(null);

// The seeded brake job: the garage has already written.
const seed = (): Record<string, ChatMessage[]> => ({
  'db-seed': [{ id: 'm-seed', from: 'garage', text: 'ඔබගේ වාහනය ලැබුණා. බ්‍රේක් පෑඩ් ගලවලා පරීක්ෂා කරන්නයි යන්නේ — වාර්තාව ඉක්මනින් එවන්නම්.', at: Date.now() - 12 * 60 * 1000 }],
});

/**
 * The owner's side of the chat: with the garage of each confirmed booking, of each accepted bid and of an SOS, and with the
 * OnMart shops that answered a request. The garage's replies are simulated until there is a backend.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode; /** The Home tab: backing out of a chat opened from the inbox returns to the inbox. */ inboxReturn?: boolean }> = ({ children, inboxReturn: returnToInbox = false }) => {
  const { notify } = useNotice();
  const { bookings } = useBookings();
  const { jobs } = useBids();
  const { records } = useSOSRecords();
  const { findVehicle } = useVehicles();
  const { workshops } = useWorkshops();
  const { offers, threads: martThreads } = useMart();
  const [target, setTarget] = useState<ChatTarget | null>(null);
  // When the owner last looked at the chat that is opening: what came after is shown as "new".
  const [newSince, setNewSince] = useState<number | undefined>(undefined);
  const [inbox, setInbox] = useState(false);
  // The owner's cancellation-request line was tapped to change: its form opens again (until the garage answers).
  const [editingCancel, setEditingCancel] = useState<string | null>(null);
  // An inquiry to a garage (chat opened from its card): the form, and what was last asked of each garage (a booking from the chat starts from it).
  const [composeInquiry, setComposeInquiry] = useState(false);
  // The parts basket of a job (opened from the tracker, the parts list, a report's chip in the chat).
  const [basketFor, setBasketFor] = useState<string | null>(null);
  const lastInquiry = useRef<Record<string, InquiryInput>>({});
  // An answer line of the owner (the diagnosis, extra work, Recon) was tapped to change: the same form opens again, while the repair is running.
  const [editingAnswer, setEditingAnswer] = useState<{ id: string; kind: 'diagnosis' | 'extra' | 'recon'; subId?: string } | null>(null);
  // On the Home / Jobs tab, backing out of a conversation opened from the inbox returns to the inbox; a second back closes the chat.
  const fromInbox = useRef(false);
  const inboxReturn = useRef(false);
  const closeConversation = useCallback((clear: () => void) => {
    clear();
    if (fromInbox.current && inboxReturn.current) setInbox(true);
    fromInbox.current = false;
  }, []);
  inboxReturn.current = returnToInbox;
  // A report opened from a message in the chat (the diagnosis, extra work, the handover).
  const [report, setReport] = useState<{ id: string; kind: ReportKind } | null>(null);
  const [martTarget, setMartTarget] = useState<ThreadTarget | null>(null);
  const [martSeen, setMartSeen] = useState<Record<string, number>>({});
  const names = useRef<Record<string, string>>({});
  // Chats started from a garage's or a shop's profile: not tied to a booking, so the inbox lists them once they have messages.
  const [extras, setExtras] = useState<Record<string, ChatTarget & { listed?: boolean }>>({});
  const initial = useMemo(seed, []);
  const store = useChatStore('owner', initial, (id, m) => notify({ icon: '💬', title: names.current[id] ?? 'ගරාජය', body: m.text ?? '📷', tone: 'primary' }));

  // Every conversation the owner can have: a confirmed direct booking, a won bid, a finished SOS, and the OnMart shops.
  const threads = useMemo<ChatThreadInfo[]>(() => {
    const list = new Map<string, Omit<ChatThreadInfo, 'last' | 'unread'>>();
    for (const b of bookings) {
      // A chat opens with the request itself, so the garage can be asked something while it answers.
      if (b.status === 'declined' || b.status === 'expired' || b.status === 'cancelled') continue;
      list.set(b.id, { id: b.id, kind: 'direct', icon: '📅', title: b.garage.name, subtitle: `ඍජු වෙන්කිරීම · ${categoryInfo(b.categoryId).name}`, phone: b.garage.phone, vehicle: findVehicle(b.vehicleId), record: jobRecordText({ title: `${categoryInfo(b.categoryId).name}${b.service ? ' · ' + b.service : ''} (ඍජු වෙන්කිරීම)`, who: { label: 'ගරාජය', name: b.garage.name, phone: b.garage.phone }, vehicle: findVehicle(b.vehicleId), description: b.description, at: b.scheduledAt ?? b.preferredAt, doorstep: b.doorstep, place: b.garage.address, price: b.estimate, priceLabel: 'ඇස්තමේන්තුව', photos: b.photos.length, voiceNotes: b.voiceNotes.length, notes: b.garageNote ? [`ගරාජයේ සටහන: ${b.garageNote}`] : undefined }) });
    }
    for (const j of jobs) {
      const bid = j.bids.find((x) => x.id === j.acceptedBidId);
      if (!bid) continue;
      list.set(j.id, { id: j.id, kind: 'job', icon: '🔧', title: bid.garageName, subtitle: `ලංසු · ${categoryInfo(j.categoryId).name}`, phone: MOCK_GARAGES.find((g) => g.name === bid.garageName)?.phone, vehicle: findVehicle(j.vehicleId), record: jobRecordText({ title: `${categoryInfo(j.categoryId).name} (ලංසුවෙන් ලැබුණු රැකියාව)`, who: { label: 'ගරාජය', name: bid.garageName, phone: MOCK_GARAGES.find((g) => g.name === bid.garageName)?.phone }, vehicle: findVehicle(j.vehicleId), description: j.description, partType: j.sparePart, doorstep: j.doorstep, price: bid.price, priceLabel: 'එකඟ වූ මිල', photos: j.photos?.length, voiceNotes: j.voiceNotes?.length, notes: [`වගකීම මාස ${bid.warrantyMonths}`, `ඇස්තමේන්තු කාලය පැය ${bid.estHours}`, ...(bid.travelFee ? [`දුර ගමන් ගාස්තුව රු. ${bid.travelFee.toLocaleString('en-US')} ඇතුළුව (රැකියාව රු. ${(bid.price - bid.travelFee).toLocaleString('en-US')})`] : []), ...(j.fitting ? [`සවි කළ යුතු කොටස: ${j.fitting.partName}`] : [])] }) });
    }
    for (const r of records) {
      list.set(r.id, { id: r.id, kind: 'sos', icon: r.breakdown.icon, title: r.responder.name, subtitle: `SOS · ${r.breakdown.label}`, phone: r.responder.phone, vehicle: { name: r.vehicleName, plate: r.vehiclePlate, type: 'Car' } });
    }
    for (const [id, t] of Object.entries(extras)) {
      if (list.has(id) || (!t.listed && !store.messages(id).length)) continue;
      list.set(id, { id, kind: t.profile === 'shop' ? 'mart' : t.profile === 'sos' ? 'sos' : t.profile === 'garage' ? 'inquiry' : 'direct', icon: t.profile === 'shop' ? '🏪' : t.profile === 'sos' ? '🚨' : t.profile === 'garage' ? '❓' : '🔧', title: t.title, subtitle: t.subtitle, phone: t.phone, vehicle: t.vehicle });
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
      const mapped: ChatMessage[] = messages.map((m) => ({ id: m.id, from: m.from === 'buyer' ? 'owner' : 'garage', text: m.text, photos: m.photos, at: m.at }));
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
    return [...people, ...shops.values()].sort((a, b) => b.unread - a.unread || (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }, [bookings, jobs, records, findVehicle, extras, offers, martThreads, martSeen, store.messages, store.unread, store.isFresh]);
  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unread, 0), [threads]);

  // A booking or a won bid: its record goes into the chat the moment it appears (not for the ones the app starts with).
  const known = useRef<Set<string> | null>(null);
  const later = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => later.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!known.current) {
      known.current = new Set(threads.map((t) => t.id));
      for (const t of threads) if (t.record) store.note(t.id, t.record);
      return;
    }
    for (const t of threads) {
      if (known.current.has(t.id)) continue;
      known.current.add(t.id);
      store.markFresh(t.id);
      // The garage that took the job says hello a moment later (a booking or a won bid; the SOS has its own flow).
      if (t.kind === 'direct' || t.kind === 'job') {
        later.current.push(setTimeout(() => store.postUpdate(t.id, '✅ ඔබගේ රැකියාව භාර ගත්තා. වාහනය ලැබුණු විට, පරීක්ෂා කළ පසු සහ අමතර වැඩක් හමු වුවහොත් මෙම චැට් එකෙන්ම දැනුම් දෙන්නම්.', 'garage'), 2500));
      }
      if (t.record) store.note(t.id, t.record);
    }
  }, [threads, store.note]);

  // What the garage does on a job goes into its chat as updates (the vehicle received, the diagnosis, parts, extra work and how
  // it was answered, ready, closed), and the parts the owner buys in OnMart for it.
  const seenProgress = useRef<Record<string, WorkshopProgress> | null>(null);
  const seenBought = useRef<Set<string> | null>(null);
  useEffect(() => {
    const list = Object.values(workshops);
    if (!seenProgress.current || !seenBought.current) {
      seenProgress.current = Object.fromEntries(list.map((w) => [w.id, w.progress] as const));
      seenBought.current = new Set(list.flatMap((w) => Object.keys(w.partsBought ?? {}).map((k) => `${w.id}:${k}`)));
      return;
    }
    for (const w of list) {
      for (const u of workshopUpdateTexts(seenProgress.current[w.id], w.progress)) store.postUpdate(w.id, u.text, u.from, u.photos, u.report);
      // An answer the owner changed: its line in the chat is rewritten.
      for (const e of decisionEdits(seenProgress.current[w.id], w.progress)) {
        const line = store.messages(w.id).find((m) => m.update && m.from === 'owner' && m.text === e.from);
        if (line) store.edit(w.id, line.id, e.to);
      }
      seenProgress.current[w.id] = w.progress;
      for (const [line, bought] of Object.entries(w.partsBought ?? {})) {
        const key = `${w.id}:${line}`;
        if (seenBought.current.has(key)) continue;
        seenBought.current.add(key);
        store.postUpdate(w.id, `🛒 කොටසක් මිලට ගත්තා (OnMart · ${bought.shopName}): රු. ${Math.round(bought.amount).toLocaleString('en-US')}.`, 'owner');
      }
    }
  }, [workshops, store.postUpdate]);

  // A part in the chat (one the garage asks for, or the owner must buy): close the chat and search it in OnMart.
  const openMartFromChat = useCallback(
    (part: string) => {
      fromInbox.current = false;
      const job = target?.id;
      setTarget(null);
      // "Part +N": several parts to buy, so the whole basket opens.
      if (/\s\+\d+$/.test(part) && job) setBasketFor(job);
      else openMartFor(part);
    },
    [target?.id]
  );

  // The inquiry goes into the chat with the garage as a message; the garage answers there.
  const sendInquiry = (r: InquiryInput) => {
    if (!target) return;
    lastInquiry.current[target.id] = r;
    const v = findVehicle(r.vehicleId);
    void store.send(target.id, { text: inquiryText({ category: categoryInfo(r.categoryId).name, service: r.service, vehicle: `${v.name} ${v.plate}`, text: r.text }), photos: r.photos });
    setComposeInquiry(false);
  };
  // Book the garage directly from its chat: the chat closes and the booking form opens with what was asked.
  const bookFromChat = () => {
    if (!target) return;
    const garageId = target.id.replace(/^garage:/, '');
    const last = lastInquiry.current[target.id];
    fromInbox.current = false;
    setTarget(null);
    openBookingFor(garageId, last?.categoryId ?? target.inquiry?.categoryId, last ? { description: last.text, vehicleId: last.vehicleId, service: last.service } : undefined);
  };

  const logCall = useCallback((id: string) => store.postUpdate(id, '📞 අයිතිකරු ගරාජයට ඇමතුවා.', 'owner'), [store.postUpdate]);

  const open = useCallback(
    (t: ChatTarget) => {
      names.current[t.id] = t.title;
      const record = t.record ?? threads.find((x) => x.id === t.id)?.record;
      if (record) store.note(t.id, record);
      setExtras((m) => (m[t.id] ? m : { ...m, [t.id]: t }));
      setNewSince(store.seenAt(t.id));
      setTarget(t);
      setComposeInquiry(!!t.inquiry?.compose);
      store.markRead(t.id);
    },
    [store.markRead, store.note, store.seenAt, threads]
  );

  const start = useCallback((t: ChatTarget) => {
    names.current[t.id] = t.title;
    store.markFresh(t.id);
    setExtras((m) => (m[t.id]?.listed ? m : { ...m, [t.id]: { ...t, listed: true } }));
    if (t.record) store.note(t.id, t.record);
  }, [store.note]);

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
  // The garage says it received the vehicle: until the owner confirms that, what it sends can be read but not answered.
  const tw = target ? workshops[target.id] : undefined;
  const receiptLocked = !!tw && !!tw.progress.receivedAt && !tw.receiptConfirmed && tw.progress.stage !== 'closed' && tw.progress.stage !== 'declined';
  const count = target ? store.messages(target.id).length : 0;
  useEffect(() => {
    if (target) store.markRead(target.id);
  }, [count, target, store.markRead]);

  return (
    <ChatContext.Provider value={{ open, start, unread: store.unread, openInbox: () => setInbox(true), totalUnread, logCall, openBasket: setBasketFor }}>
      {children}
      <ChatInboxSheet
        visible={inbox}
        onClose={() => setInbox(false)}
        overlay={<Toast topOffset={40} />}
        me="owner"
        threads={threads}
        onOpen={(t) => {
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
        me="owner"
        title={target?.title ?? ''}
        subtitle={target?.subtitle}
        phone={target?.phone}
        vehicle={target?.vehicle}
        messages={target ? store.messages(target.id) : []}
        onSend={(msg) => (target ? store.send(target.id, msg) : Promise.resolve(true))}
        onDelete={(id) => target && store.remove(target.id, id)}
        onEdit={(id, text) => target && store.edit(target.id, id, text)}
        onCall={() => target && logCall(target.id)}
        newSince={newSince}
        onOpenReport={(m) => target && m.report && setReport({ id: target.id, kind: m.report.kind })}
        composerLocked={receiptLocked ? '🔒 ගරාජයේ පණිවිඩ කියවන්න පුළුවන්. වාහනය භාර දුන් බව තහවුරු කරන තෙක් පිළිතුරු දීමට හෝ පණිවිඩ යැවීමට නොහැක.' : undefined}
        cards={target ? <ChatJobCards id={target.id} onUpdate={(text) => store.postUpdate(target.id, text, 'owner')} onOpenMart={openMartFromChat} onOpenBasket={setBasketFor} /> : undefined}
        vehicleAction={target ? <ChatCancelAction id={target.id} /> : undefined}
        martPartOf={(m) => {
          const p = target ? workshops[target.id]?.progress : undefined;
          if (!p || m.from === 'owner') return undefined;
          const lines = m.report?.kind === 'diagnosis' ? p.diagnosis?.lines : m.report?.kind === 'extra' ? p.extras?.find((x) => x.id === m.report!.id)?.lines : undefined;
          const parts = (lines ?? []).filter((l) => l.kind === 'part');
          // Several parts to buy: the chip reads "first +N" and opens the whole basket.
          const buys = parts.filter((l) => l.source === 'owner');
          const first = (buys[0] ?? parts[0])?.name;
          return buys.length > 1 && first ? `${first} +${buys.length - 1}` : first;
        }}
        martMustBuy={(m) => {
          const p = target ? workshops[target.id]?.progress : undefined;
          if (!p || m.from === 'owner') return false;
          const lines = m.report?.kind === 'diagnosis' ? p.diagnosis?.lines : m.report?.kind === 'extra' ? p.extras?.find((x) => x.id === m.report!.id)?.lines : undefined;
          return (lines ?? []).some((l) => l.kind === 'part' && l.source === 'owner');
        }}
        onOpenMart={openMartFromChat}
        shopTagging
        tagBarExtra={target ? target.profile === 'shop' ? <ChatAskShopChip onPress={() => { fromInbox.current = false; setTarget(null); openShopFor(target.id.slice(5), true); }} /> : target.profile === 'garage' ? <GarageInquiryActions onInquire={() => setComposeInquiry(true)} onBook={bookFromChat} /> : <ChatFitAction id={target.id} /> : undefined}
        onOpenShop={(shopId) => {
          fromInbox.current = false;
          setTarget(null);
          openShopFor(shopId);
        }}
        editFormFor={(m) => m.from === 'owner' && !!ownerEditKindOf(m.text)}
        onEditReport={(m) => {
          if (!target) return;
          const p = workshops[target.id]?.progress;
          const lock = (body: string) => notify({ icon: '🔒', title: 'වෙනස් කළ නොහැක', body, tone: 'danger' });
          const kind = ownerEditKindOf(m.text);
          if (kind === 'cancel') {
            if (p?.cancelRequest?.status !== 'requested') lock('ගරාජය ඔබගේ ඉල්ලීමට දැනටමත් පිළිතුරු දී ඇත.');
            else setEditingCancel(target.id);
          } else if (kind === 'diagnosis' || kind === 'extra' || kind === 'recon') {
            // An answer can be changed while the repair is running (before the job is ready for handover) and no cancellation is open.
            if (!p || p.stage !== 'repairing' || p.cancelRequest) return lock('වැඩ දැනටමත් ඉදිරියට ගොස් ඇත — මෙම තීරණය වෙනස් කළ නොහැක.');
            if (kind === 'diagnosis') setEditingAnswer({ id: target.id, kind });
            else if (kind === 'extra') {
              const x = (p.extras ?? []).find((e) => !!e.decision && extraDecisionText(e.lines.filter((l) => e.decision!.approvedLineIds.includes(l.id))) === m.text);
              if (x) setEditingAnswer({ id: target.id, kind, subId: x.id });
              else lock('මෙම තීරණය වෙනස් කළ නොහැක.');
            } else {
              const r = (p.recon ?? []).find((x) => x.status !== 'pending');
              if (r) setEditingAnswer({ id: target.id, kind, subId: r.id });
              else lock('මෙම තීරණය වෙනස් කළ නොහැක.');
            }
          }
        }}
        whatsapp
      />
      <InquirySheet
        visible={composeInquiry && target?.profile === 'garage'}
        garageName={target?.title ?? ''}
        categoryId={target?.inquiry?.categoryId}
        onClose={() => setComposeInquiry(false)}
        onSend={sendInquiry}
      />
      <BasketSheet workshopId={basketFor} onClose={() => setBasketFor(null)} onSent={(n) => basketFor && store.postUpdate(basketFor, `🛍️ අයිතිකරු කොටස් ${n} ක් OnMart හි ඉල්ලුවා — වෙළඳසැල් පිළිතුරු දෙන තෙක් බලා සිටී.`, 'owner')} />
      <CancelJobSheet
        editing
        workshop={editingCancel ? workshops[editingCancel] ?? null : null}
        onClose={() => setEditingCancel(null)}
        onSaved={(reason, note) => {
          const id = editingCancel;
          if (!id) return;
          store.messages(id).filter((m) => m.update && ownerEditKindOf(m.text) === 'cancel').forEach((m) => store.edit(id, m.id, cancelRequestText({ reason, note })));
        }}
      />
      <ApprovalSheet change workshop={editingAnswer?.kind === 'diagnosis' ? workshops[editingAnswer.id] ?? null : null} onClose={() => setEditingAnswer(null)} />
      <ApprovalSheet change extraId={editingAnswer?.subId} workshop={editingAnswer?.kind === 'extra' ? workshops[editingAnswer.id] ?? null : null} onClose={() => setEditingAnswer(null)} />
      <ReconSheet change reconId={editingAnswer?.subId} workshop={editingAnswer?.kind === 'recon' ? workshops[editingAnswer.id] ?? null : null} onClose={() => setEditingAnswer(null)} />
      <JobReportSheet
        visible={!!report}
        onClose={() => setReport(null)}
        overlay={<Toast topOffset={40} />}
        subject={{ title: report ? (workshops[report.id]?.title ?? categoryInfo(workshops[report.id]?.categoryId ?? '').name) : '', vehicle: report && workshops[report.id]?.vehicleId ? `${findVehicle(workshops[report.id]!.vehicleId!).name} · ${findVehicle(workshops[report.id]!.vehicleId!).plate}` : undefined }}
        progress={report ? workshops[report.id]?.progress : undefined}
        focus={report?.kind}
      />
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
