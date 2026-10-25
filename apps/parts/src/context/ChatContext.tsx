import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChatInboxSheet, ChatSheet, jobRecordText, martShop, replyMessage, useChatStore, type ChatMessage, type ChatSide, type ChatVehicle, type InboxFilter, type InboxThread } from '@ongarage/shared';
import { ChatJobActions } from '../components/ChatJobActions';
import { Toast } from '../components/Toast';
import { buyerLabel, useShop } from './ShopContext';
import type { ShopOrderStatus } from '../types';

/** One conversation: with a garage about its parts request (`g:`), or with a customer about an OnMart enquiry (`c:`). */
export type ChatTarget = { id: string; title: string; subtitle?: string; phone?: string; vehicle?: ChatVehicle; record?: string };
export type ChatThreadInfo = InboxThread;

type ChatApi = {
  open: (target: ChatTarget) => void;
  unread: (id: string) => number;
  openInbox: () => void;
  totalUnread: number;
  /** The shop rang the other side: written into the chat. */
  logCall: (id: string) => void;
};

const ChatContext = createContext<ChatApi | null>(null);

export const isGarageThread = (id: string) => id.startsWith('g:');
/** The request or enquiry a conversation belongs to: its id follows the "g:" / "c:" prefix. */
export const requestIdOf = (threadId: string) => threadId.slice(2);

/** The inbox filters a parts shop sees: all, garages, customers, orders. */
const FILTERS: InboxFilter[] = [
  { id: 'all', label: 'සියල්ල' },
  { id: 'garage', label: 'ගරාජ' },
  { id: 'customer', label: 'පාරිභෝගික' },
  { id: 'order', label: 'ඇණවුම්' },
  { id: 'done', label: 'අවසන්' },
];

const ORDER_TEXT: Partial<Record<ShopOrderStatus, { from: ChatSide; text: string }>> = {
  packing: { from: 'shop', text: '✅ තොගය තහවුරු කළා — ඇණවුම සූදානම් කරමින්.' },
  dispatched: { from: 'shop', text: '🛵 ඇණවුම යවා ඇත.' },
  ready: { from: 'shop', text: '📦 කොටස් කවුන්ටරයේ සූදානම් — ඔබගේ QR / ඉලක්කම් 6 කේතය පෙන්වන්න.' },
  arrived: { from: 'garage', text: '📍 කොටස් ගරාජයට ලැබුණා.' },
  received: { from: 'garage', text: '✅ කොටස් ලැබුණා — ස්තූතියි.' },
  problem: { from: 'garage', text: '⚠️ ලැබුණු කොටසේ ගැටලුවක් ඇත — ආපසු ගන්න.' },
  returned: { from: 'shop', text: '↩️ කොටස ආපසු ගත්තා.' },
  unavailable: { from: 'shop', text: '✖ කණගාටුයි, කොටස තොගයේ නැත.' },
};

const SALE_TEXT: Record<string, { from: ChatSide; text: string }> = {
  ready: { from: 'shop', text: '📦 කොටස කවුන්ටරයේ සූදානම් — ඔබගේ කේතය පෙන්වන්න.' },
  dispatched: { from: 'shop', text: '🛵 කොටස යවා ඇත.' },
  bought: { from: 'owner', text: '✅ කොටස මිලදී ගත්තා — ස්තූතියි.' },
  released: { from: 'shop', text: '✖ රඳවා ගැනීම අවසන් විය.' },
};

/**
 * The parts shop's side of the chat: a conversation with each garage that sent a parts request and with each customer that asked
 * the shop through OnMart. The shop's steps (a quote, stock confirmed, sent, ready at the counter, handed over) and the buyer's
 * (chosen, received, a problem) are written into them as messages; replies are simulated until there is a backend.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { requests, orders, quotes, customerRequests, offers, sales, notify } = useShop();
  const [target, setTarget] = useState<ChatTarget | null>(null);
  // When the owner last looked at the chat that is opening: what came after is shown as "new".
  const [newSince, setNewSince] = useState<number | undefined>(undefined);
  const [inbox, setInbox] = useState(false);
  const names = useRef<Record<string, string>>({});
  const store = useChatStore(
    'shop',
    {},
    (id, m) => notify({ icon: '💬', title: names.current[id] ?? 'OnChat', body: m.text ?? '📷', tone: 'primary' }),
    (id): ChatSide => (isGarageThread(id) ? 'garage' : 'owner')
  );

  const threads = useMemo<ChatThreadInfo[]>(() => {
    const list: ChatThreadInfo[] = [];
    for (const r of requests) {
      if (r.passed) continue;
      const id = `g:${r.id}`;
      const ordered = orders.some((o) => o.quote.request.id === r.id);
      // Every order of this request is finished (the garage has the parts, or sent them back, or the shop had none): the chat is kept under "අවසන්".
      const mine = orders.filter((o) => o.quote.request.id === r.id);
      const finished = mine.length > 0 && mine.every((o) => o.status === 'received' || o.status === 'returned' || o.status === 'unavailable');
      const messages = store.messages(id);
      const parts = r.lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(', ');
      list.push({
        id,
        done: finished,
        kind: ordered ? 'order' : 'garage',
        icon: '🔧',
        title: r.garage.name,
        subtitle: `කොටස් ඉල්ලීම · ${parts} · ${r.vehicle.plate}`,
        phone: r.garage.phone,
        vehicle: r.vehicle,
        record: jobRecordText({
          title: `🔩 කොටස් ඉල්ලීම · ${parts}`,
          who: { label: 'ගරාජය', name: r.garage.name, phone: r.garage.phone },
          vehicle: r.vehicle,
          description: r.note,
          partType: r.partType,
          at: r.needBy,
          place: r.garage.address,
          photos: r.photos?.length ?? (r.oldPartPhoto ? 1 : 0),
          notes: [`ගරාජයට ලැබිය යුත්තේ ${new Date(r.needBy).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ට පෙර`, `ගරාජයේ දුර කි.මී. ${r.distanceKm}`],
        }),
        last: messages[messages.length - 1],
        unread: store.unread(id),
        isNew: store.isFresh(id),
      });
    }
    for (const cr of customerRequests) {
      const answered = offers.some((o) => o.request.id === cr.id);
      // The open wall never shows who asked: only enquiries sent to this shop, or wall posts it answered, have a chat.
      if (cr.passed || (cr.via === 'wall' && !answered)) continue;
      const id = `c:${cr.id}`;
      const sold = sales.some((s) => s.offer.request.id === cr.id);
      // Every sale to this customer is over (bought and handed over, or the hold ended).
      const theirs = sales.filter((s) => s.offer.request.id === cr.id);
      const settled = theirs.length > 0 && theirs.every((s) => s.stage === 'bought' || s.stage === 'released');
      const messages = store.messages(id);
      const briefs = cr.enquiry.briefs;
      const parts = briefs.map((b) => (b.qty > 1 ? `${b.name} ×${b.qty}` : b.name)).join(', ');
      const v = briefs[0]?.vehicle;
      list.push({
        id,
        done: settled,
        kind: sold ? 'order' : 'customer',
        icon: '🛍️',
        title: buyerLabel(cr),
        subtitle: `OnMart ඉල්ලීම · ${parts}${v ? ` · ${v.plate}` : ''}`,
        phone: cr.via === 'shop' ? cr.enquiry.buyer.phone : undefined,
        vehicle: v,
        record: jobRecordText({
          title: `🛍️ OnMart ඉල්ලීම · ${parts}`,
          who: cr.via === 'shop' ? { label: 'Customer', name: cr.enquiry.buyer.name, phone: cr.enquiry.buyer.phone } : undefined,
          vehicle: v,
          description: briefs.map((b) => b.note).filter(Boolean).join(' · ') || undefined,
          partType: briefs[0]?.partType,
          photos: briefs.reduce((n, b) => n + (b.photos?.length ?? 0), 0),
          notes: [cr.via === 'wall' ? 'විවෘත දුර්ලභ කොටස් පෝස්ට් එකක් (ගැනුම්කරුගේ විස්තර සඟවා ඇත)' : 'ඔබෙන් කෙලින්ම ඇසූ ඉල්ලීමක්', `ගැනුම්කරුට දුර කි.මී. ${cr.distanceKm}`],
        }),
        last: messages[messages.length - 1],
        unread: store.unread(id),
        isNew: store.isFresh(id),
      });
    }
    return list.sort((a, b) => b.unread - a.unread || (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }, [requests, orders, customerRequests, offers, sales, store.messages, store.unread, store.isFresh]);
  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unread, 0), [threads]);

  // The steps of each request, quote, order and sale go into its chat as messages from whoever did them.
  const seen = useRef<{ quotes: Set<string>; orders: Record<string, string>; offers: Set<string>; sales: Record<string, string> } | null>(null);
  const later = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => later.current.forEach(clearTimeout), []);
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!known.current) known.current = new Set(threads.map((t) => t.id));
    else for (const t of threads) if (!known.current.has(t.id)) { known.current.add(t.id); store.markFresh(t.id); }
    if (!seen.current) {
      seen.current = {
        quotes: new Set(quotes.map((q) => q.request.id)),
        orders: Object.fromEntries(orders.map((o) => [o.id, o.status])),
        offers: new Set(offers.map((o) => o.request.id)),
        sales: Object.fromEntries(sales.map((s) => [s.id, s.stage])),
      };
      for (const t of threads) if (t.record) store.note(t.id, t.record);
      return;
    }
    const s = seen.current;
    for (const t of threads) if (t.record) store.note(t.id, t.record);
    for (const q of quotes) {
      if (s.quotes.has(q.request.id)) continue;
      s.quotes.add(q.request.id);
      const id = `g:${q.request.id}`;
      store.postUpdate(id, `💰 මිල ගණන් එවා ඇත — ${q.partType} · කොටස් රු. ${q.partsTotal.toLocaleString('en-US')}${q.deliveryFee ? ` + ඩිලිවරි රු. ${q.deliveryFee.toLocaleString('en-US')}` : ''} = රු. ${q.total.toLocaleString('en-US')} · වගකීම මාස ${q.warrantyMonths}.`, 'shop');
    }
    for (const o of orders) {
      const id = `g:${o.quote.request.id}`;
      const before = s.orders[o.id];
      if (before === undefined) {
        store.postUpdate(id, '🎉 ඔබගේ මිල තෝරා ගත්තා — ඇණවුම තහවුරු කරන්න.', 'garage');
      } else if (before !== o.status && ORDER_TEXT[o.status]) {
        store.postUpdate(id, ORDER_TEXT[o.status]!.text, ORDER_TEXT[o.status]!.from);
      }
      s.orders[o.id] = o.status;
    }
    for (const o of offers) {
      if (s.offers.has(o.request.id)) continue;
      s.offers.add(o.request.id);
      store.postUpdate(`c:${o.request.id}`, replyMessage(o, (o.suggestedShopIds ?? []).map((id) => martShop(id)?.name).filter((n): n is string => !!n)), 'shop');
    }
    for (const sale of sales) {
      const id = `c:${sale.offer.request.id}`;
      const before = s.sales[sale.id];
      if (before === undefined) store.postUpdate(id, '🔒 ගැනුම්කරු කොටස රඳවා ගත්තා.', 'owner');
      else if (before !== sale.stage && SALE_TEXT[sale.stage]) store.postUpdate(id, SALE_TEXT[sale.stage].text, SALE_TEXT[sale.stage].from);
      s.sales[sale.id] = sale.stage;
    }
  }, [threads, quotes, orders, offers, sales, store.note, store.postUpdate, store.markFresh]);

  const logCall = useCallback((id: string) => store.postUpdate(id, '📞 වෙළඳසැල ඇමතුවා.', 'shop'), [store.postUpdate]);

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

  const count = target ? store.messages(target.id).length : 0;
  useEffect(() => {
    if (target) store.markRead(target.id);
  }, [count, target, store.markRead]);

  return (
    <ChatContext.Provider value={{ open, unread: store.unread, openInbox: () => setInbox(true), totalUnread, logCall }}>
      {children}
      <ChatInboxSheet visible={inbox} onClose={() => setInbox(false)} overlay={<Toast topOffset={40} />} me="shop" filters={FILTERS} threads={threads} onOpen={(t) => { setInbox(false); open(t); }} />
      <ChatSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        overlay={<Toast topOffset={40} />}
        me="shop"
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
        actions={target ? <ChatJobActions threadId={target.id} /> : undefined}
        whatsapp
      />
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
