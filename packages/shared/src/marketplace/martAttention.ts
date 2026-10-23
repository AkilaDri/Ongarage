import type { PartEnquiry, PartsThread, ShopOffer } from '../types';
import { offerReply } from './partsMart';

/**
 * What in OnMart needs the buyer's attention while they are somewhere else in the app: a shop says it has the part, a reply to a rare-part
 * post on the open wall, a shop writing back in a conversation the buyer started, or an order that moved (ready at the counter, sent, arrived).
 * Each such event is one item with a stable key; the buyer has "seen" an item once its page (My requests, Open wall, Orders) was open while it
 * was there. The OnMart tab in the bottom bar shows how many items are still unseen.
 */
export type AttentionKind = 'requests' | 'wall' | 'orders';
export type AttentionItem = { key: string; kind: AttentionKind };
export type AttentionCounts = { requests: number; wall: number; orders: number; total: number };

/** The order stages that are news for the buyer (the shop did something); a reservation is the buyer's own act. */
const ORDER_NEWS = ['ready', 'dispatched', 'arrived'];

export const martAttentionItems = (input: {
  enquiries: { enquiry: Pick<PartEnquiry, 'id' | 'audience'> }[];
  offers: Pick<ShopOffer, 'id' | 'enquiryId' | 'reply' | 'available'>[];
  purchases: { purchase: { id: string }; stage: string }[];
  threads: PartsThread[];
}): AttentionItem[] => {
  const kindOf = new Map<string, AttentionKind>();
  // A request that is also (or only) on the open wall is read on the wall page.
  for (const e of input.enquiries) kindOf.set(e.enquiry.id, e.enquiry.audience === 'shops' ? 'requests' : 'wall');
  const items: AttentionItem[] = [];
  // A shop that has the part (a "will check" that turned into a yes is a new key, so it is news again). A "none" is not news.
  for (const o of input.offers) {
    const kind = kindOf.get(o.enquiryId);
    if (kind && offerReply(o) === 'have') items.push({ key: `offer:${o.id}:have`, kind });
  }
  // A shop writing back in a conversation the buyer started (its first line is its own answer, already counted as the offer).
  for (const t of input.threads) {
    const kind = kindOf.get(t.enquiryId);
    const last = t.messages[t.messages.length - 1];
    if (kind && last && last.from === 'shop' && t.messages.some((m) => m.from === 'buyer')) items.push({ key: `msg:${t.id}:${last.id}`, kind });
  }
  for (const p of input.purchases) if (ORDER_NEWS.includes(p.stage)) items.push({ key: `buy:${p.purchase.id}:${p.stage}`, kind: 'orders' });
  return items;
};

/** How many items are not seen yet, per page and in all. */
export const countAttention = (items: AttentionItem[], seen: ReadonlySet<string>): AttentionCounts => {
  const c = { requests: 0, wall: 0, orders: 0, total: 0 };
  for (const i of items) {
    if (seen.has(i.key)) continue;
    c[i.kind] += 1;
    c.total += 1;
  }
  return c;
};

/** The keys of one page's items: opening that page marks exactly these as seen. */
export const keysOf = (items: AttentionItem[], kind: AttentionKind) => items.filter((i) => i.kind === kind).map((i) => i.key);
