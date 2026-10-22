// A parts basket: several parts asked of OnMart together (a job's parts, a service kit). Each part is still its own request (the shops answer part by part), but they share a
// `batchId` so the buyer reads them as one group, and so the answers can later be compared shop by shop.

/** The most parts one basket takes. */
export const MAX_BASKET_PARTS = 10;

/** Groups a list of requests by their batch, keeping the order of first appearance; a request with no batch is a group of its own. */
export const groupByBatch = <T extends { enquiry: { id: string; batchId?: string } }>(list: T[]): { batchId?: string; items: T[] }[] => {
  const out: { batchId?: string; items: T[] }[] = [];
  const at = new Map<string, number>();
  for (const m of list) {
    const b = m.enquiry.batchId;
    if (!b) {
      out.push({ items: [m] });
    } else if (at.has(b)) {
      out[at.get(b)!].items.push(m);
    } else {
      at.set(b, out.length);
      out.push({ batchId: b, items: [m] });
    }
  }
  return out;
};

/** How far a basket has got: parts with at least one offer that has the part (or a shop checking), and parts asked. */
export const basketProgress = (items: { enquiry: { id: string } }[], offers: { enquiryId: string; available: boolean; reply?: string }[]) => {
  const answered = items.filter((m) => offers.some((o) => o.enquiryId === m.enquiry.id && (o.available || o.reply === 'check'))).length;
  return { total: items.length, answered };
};

// ---------- comparing the answers of a basket, shop by shop ----------

/** What the compare needs of a shop's answer to one part of the basket. */
export type BasketOffer = { enquiryId: string; available: boolean; reply?: string; unitPrice: number; total: number; shop: { id: string; name: string } };

export type ShopCoverage = {
  shopId: string;
  shopName: string;
  /** The parts (request ids) this shop says it has. */
  have: string[];
  /** The parts this shop will check. */
  checking: string[];
  /** The parts it has no answer with the part for (said none, or was not asked). */
  missing: string[];
  /** What the parts it has cost together (parts priced at the counter add nothing). */
  total: number;
  /** Parts it has but prices only at the counter. */
  unpriced: number;
  /** It has every part of the basket. */
  complete: boolean;
};

const hasIt = (o: BasketOffer) => o.available && o.reply !== 'none' && o.reply !== 'check';

/**
 * Each shop that answered any part, with what it covers of the basket: the shops that have every part first, then the ones that have most, the cheapest first.
 * `ids` are the basket's request ids (one per part).
 */
export const shopCoverage = (ids: string[], offers: BasketOffer[]): ShopCoverage[] => {
  const shops = new Map<string, { name: string; offers: BasketOffer[] }>();
  for (const o of offers) {
    if (!ids.includes(o.enquiryId)) continue;
    const s = shops.get(o.shop.id) ?? { name: o.shop.name, offers: [] };
    s.offers.push(o);
    shops.set(o.shop.id, s);
  }
  const out: ShopCoverage[] = [...shops.entries()].map(([shopId, s]) => {
    const have = ids.filter((id) => s.offers.some((o) => o.enquiryId === id && hasIt(o)));
    const checking = ids.filter((id) => !have.includes(id) && s.offers.some((o) => o.enquiryId === id && o.reply === 'check'));
    const missing = ids.filter((id) => !have.includes(id) && !checking.includes(id));
    const priced = have.map((id) => s.offers.find((o) => o.enquiryId === id && hasIt(o))!);
    return { shopId, shopName: s.name, have, checking, missing, total: priced.reduce((t, o) => t + o.total, 0), unpriced: priced.filter((o) => !o.total).length, complete: have.length === ids.length };
  });
  return out.sort((a, b) => Number(b.complete) - Number(a.complete) || b.have.length - a.have.length || a.total - b.total);
};

export type BasketMix = {
  /** For each part that someone has: the shop and the offer that is cheapest (a priced offer before one priced at the counter). */
  picks: { enquiryId: string; offer: BasketOffer }[];
  /** The parts nobody has answered with. */
  missing: string[];
  total: number;
  /** How many different shops the picks come from. */
  shops: number;
  complete: boolean;
};

/** The cheapest way to buy the basket part by part, whichever shop is cheapest for each. */
export const cheapestMix = (ids: string[], offers: BasketOffer[]): BasketMix => {
  const picks: BasketMix['picks'] = [];
  for (const id of ids) {
    const have = offers.filter((o) => o.enquiryId === id && hasIt(o));
    if (!have.length) continue;
    const priced = have.filter((o) => o.total > 0).sort((a, b) => a.total - b.total);
    picks.push({ enquiryId: id, offer: priced[0] ?? have[0] });
  }
  return {
    picks,
    missing: ids.filter((id) => !picks.some((p) => p.enquiryId === id)),
    total: picks.reduce((t, p) => t + p.offer.total, 0),
    shops: new Set(picks.map((p) => p.offer.shop.id)).size,
    complete: picks.length === ids.length,
  };
};

/** How much the part-by-part mix saves against the best single shop that has everything (0 when there is no such shop, or no saving). */
export const mixSavings = (cov: ShopCoverage[], mix: BasketMix) => {
  const best = cov.find((c) => c.complete && !c.unpriced);
  return best && mix.complete && best.total > mix.total ? best.total - mix.total : 0;
};

/** How far the parts reserved together (one `groupId`, one purchase code) have got: parts in the group, and how many are bought. */
export const purchaseGroupProgress = (purchases: { stage: string; purchase: { groupId?: string } }[], groupId?: string) => {
  const inGroup = groupId ? purchases.filter((p) => p.purchase.groupId === groupId) : [];
  return { total: inGroup.length, bought: inGroup.filter((p) => p.stage === 'bought').length };
};

export type RequestSections<G> = { current: G[]; successful: G[]; closed: G[] };

/**
 * Sorts the owner's requests (each a single request or a basket, see `groupByBatch`) into: the ones still going (open or reserved), the ones that ended in a purchase, and the
 * ones that ended without one (cancelled or expired). A basket sits in the first section that has any of its parts: still going if any part is, else bought if any part was.
 */
export const splitRequests = <T extends { enquiry: { status: string } }>(groups: { batchId?: string; items: T[] }[]): RequestSections<{ batchId?: string; items: T[] }> => {
  const out: RequestSections<{ batchId?: string; items: T[] }> = { current: [], successful: [], closed: [] };
  for (const g of groups) {
    const has = (...s: string[]) => g.items.some((m) => s.includes(m.enquiry.status));
    (has('open', 'reserved') ? out.current : has('bought') ? out.successful : out.closed).push(g);
  }
  return out;
};

/** How long a shop can ask for to find a part it will check for (the buyer waits for its answer meanwhile). */
export const CHECK_WINDOWS: { min: number; label: string }[] = [
  { min: 30, label: 'මිනිත්තු 30' },
  { min: 60, label: 'පැය 1' },
  { min: 180, label: 'පැය 3' },
  { min: 1440, label: 'හෙට දක්වා' },
];

/** What the buyer reads for a shop that will check: when it said it would answer by. */
export const checkWindowText = (until: number, now: number) => {
  const left = until - now;
  if (left <= 0) return 'පිළිතුර ඉක්මනින්';
  const min = Math.ceil(left / 60000);
  if (min < 60) return `මිනිත්තු ${min}ක් ඇතුළත දන්වයි`;
  const hours = Math.ceil(min / 60);
  return hours <= 24 ? `පැය ${hours}ක් ඇතුළත දන්වයි` : 'හෙට දක්වා දන්වයි';
};

// ---------- the cart: the shop picked for each part, to be confirmed within the hour ----------

/** A part picked for the cart stays there this long (minutes); after that it has to be picked again. */
export const CART_HOLD_MIN = 60;

export const cartExpiresAt = (addedAt: number) => addedAt + CART_HOLD_MIN * 60000;
export const cartExpired = (addedAt: number, now: number) => now >= cartExpiresAt(addedAt);
/** Minutes left to confirm (rounded up; 0 when over). */
export const cartLeftMin = (addedAt: number, now: number) => Math.max(0, Math.ceil((cartExpiresAt(addedAt) - now) / 60000));

/** The cart's lines grouped by the shop they are to be bought from, in the order the shops first appear. */
export const groupCartByShop = <T extends { shopId: string }>(lines: T[]): { shopId: string; lines: T[] }[] => {
  const out: { shopId: string; lines: T[] }[] = [];
  for (const l of lines) {
    const g = out.find((x) => x.shopId === l.shopId);
    if (g) g.lines.push(l);
    else out.push({ shopId: l.shopId, lines: [l] });
  }
  return out;
};

/**
 * The simulation of shops having a basket's parts, so that several shops answer with parts and the comparison has something to compare: of the shops asked, nearest first,
 * the 1st has every part, the 2nd every other part (1, 3, 5…), the 3rd the others (2, 4…), the 4th all but the last, the 5th only the first; the rest answer as the stock lists say.
 * `rank` is the shop's place among the shops asked, `index` the part's place in the basket. undefined = no say.
 */
export const demoCoverage = (rank: number, index: number, count: number): boolean | undefined => {
  switch (rank) {
    case 0:
      return true;
    case 1:
      return index % 2 === 0;
    case 2:
      return count === 1 ? true : index % 2 === 1;
    case 3:
      return count === 1 ? true : index < count - 1;
    case 4:
      return index === 0;
    default:
      return undefined;
  }
};
