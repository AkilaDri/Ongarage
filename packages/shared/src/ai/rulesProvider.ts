import type { BreakdownId } from '../constants/breakdowns';
import type { AiProvider, AiResult, ComplaintTriage, JobClassification, ModerationResult, OffPlatformCheck, PartSuggestion, SOSClassification, Urgency } from './types';
import {
  ABUSE_WORDS,
  ACCUSATION_WORDS,
  BREAKDOWN_WORDS,
  CATEGORY_WORDS,
  COMPLAINT_WORDS,
  ESCALATE_WORDS,
  LOW_URGENCY_WORDS,
  OFF_PLATFORM_CHAT_WORDS,
  OFF_PLATFORM_PAYMENT_WORDS,
  PART_WORDS,
  REFUND_WORDS,
  URGENT_WORDS,
} from './vocabulary';

// Keyword rules: the offline stand-in for Claude / Laya. Transparent (every answer lists
// the words it matched) and good enough for the simulation; not a substitute for a
// learned model on real, messy owner text.

/** Lower-case Latin, drop zero-width joiners (Sinhala conjuncts), collapse spaces. */
export const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‌‍]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const LATIN = /[a-z]/;
const patterns = new Map<string, RegExp>();
/**
 * English / Singlish words match whole words only (plus a plural ending), so "dent"
 * doesn't fire on "accident" or "abs" on "absolutely". Sinhala entries are stems and
 * match anywhere ("ටයර" in "ටයරය").
 */
const matches = (text: string, word: string) => {
  const w = normalise(word);
  if (!LATIN.test(w)) return text.includes(w);
  let re = patterns.get(w);
  if (!re) {
    re = new RegExp(`(^|[^a-z])${escape(w)}(e?s)?(?=[^a-z]|$)`);
    patterns.set(w, re);
  }
  return re.test(text);
};

/** Words from a list found in the text (multi-word phrases count double). */
const hits = (text: string, words: string[]) => words.filter((w) => matches(text, w));
const weight = (found: string[]) => found.reduce((s, w) => s + (w.includes(' ') ? 2 : 1), 0);

/** Pick the best-scoring key; confidence grows with the margin and the amount of evidence. */
const best = <K extends string>(text: string, table: Record<K, string[]>): { key: K | null; confidence: number; evidence: string[] } => {
  const scored = (Object.keys(table) as K[]).map((k) => {
    const found = hits(text, table[k]);
    return { key: k, score: weight(found), found };
  });
  scored.sort((a, b) => b.score - a.score);
  const [top, second] = scored;
  if (!top || top.score === 0) return { key: null, confidence: 0, evidence: [] };
  const margin = (top.score - (second?.score ?? 0)) / top.score;
  const confidence = Math.min(0.95, 0.35 + 0.15 * Math.min(top.score, 3) + 0.15 * margin);
  return { key: top.key, confidence: Number(confidence.toFixed(2)), evidence: top.found };
};

const urgencyOf = (text: string): { urgency: Urgency; evidence: string[] } => {
  const urgent = hits(text, URGENT_WORDS);
  if (urgent.length) return { urgency: 'high', evidence: urgent };
  const low = hits(text, LOW_URGENCY_WORDS);
  return { urgency: low.length ? 'low' : 'normal', evidence: low };
};

const PHONE = /(?:\+94|0)\s?7\d(?:[\s-]?\d){7}/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const LINK = /(https?:\/\/|www\.)\S+/;

const result = <T>(value: T, confidence: number, evidence: string[]): AiResult<T> => ({ value, confidence, source: 'rules', evidence });

export const rulesProvider: AiProvider = {
  source: 'rules',

  async classifyJob(raw) {
    const text = normalise(raw);
    const cat = best(text, CATEGORY_WORDS);
    const u = urgencyOf(text);
    const parts = Object.entries(PART_WORDS)
      .filter(([, words]) => hits(text, words).length)
      .map(([name]) => name);
    const value: JobClassification = { categoryId: cat.key, urgency: u.urgency, partsMentioned: parts };
    return result(value, cat.confidence, [...cat.evidence, ...u.evidence]);
  },

  async classifySOS(raw) {
    const b = best(normalise(raw), BREAKDOWN_WORDS);
    const value: SOSClassification = { breakdownId: b.key as BreakdownId | null };
    return result(value, b.confidence, b.evidence);
  },

  async checkOffPlatform(raw) {
    const text = normalise(raw);
    const signals: OffPlatformCheck['signals'] = [];
    const evidence: string[] = [];
    const phone = raw.match(PHONE);
    if (phone) {
      signals.push('phone');
      evidence.push(phone[0]);
    }
    const pay = hits(text, OFF_PLATFORM_PAYMENT_WORDS);
    if (pay.length) {
      signals.push('payment');
      evidence.push(...pay);
    }
    const chat = hits(text, OFF_PLATFORM_CHAT_WORDS);
    if (chat.length) {
      signals.push('externalChat');
      evidence.push(...chat);
    }
    // A phone number alone is weaker than an explicit "pay outside the app".
    const confidence = signals.includes('payment') ? 0.9 : signals.length >= 2 ? 0.8 : signals.length ? 0.55 : 0.9;
    return result({ flagged: signals.length > 0, signals }, confidence, evidence);
  },

  async triageComplaint(raw) {
    const text = normalise(raw);
    let topic: ComplaintTriage['topic'] = 'other';
    let evidence: string[] = [];
    for (const [t, words] of COMPLAINT_WORDS) {
      const found = hits(text, words);
      if (found.length) {
        topic = t;
        evidence = found;
        break;
      }
    }
    const refund = hits(text, REFUND_WORDS);
    const escalate = hits(text, ESCALATE_WORDS);
    const u = urgencyOf(text);
    const value: ComplaintTriage = {
      topic,
      urgency: escalate.length || topic === 'damage' ? 'high' : u.urgency,
      refundAsked: refund.length > 0,
      // Damage, refunds, conduct and legal threats always go to a person.
      needsHuman: topic === 'damage' || topic === 'behaviour' || refund.length > 0 || escalate.length > 0,
    };
    return result(value, topic === 'other' ? 0.3 : Math.min(0.9, 0.55 + 0.1 * evidence.length), [...evidence, ...refund, ...escalate]);
  },

  async suggestParts(raw) {
    const text = normalise(raw);
    const parts: PartSuggestion['parts'] = [];
    const evidence: string[] = [];
    for (const [name, words] of Object.entries(PART_WORDS)) {
      const found = hits(text, words);
      if (!found.length) continue;
      // "two pads", "pads x2", "2 ක්" → quantity.
      const qty = /(?:x\s?|×\s?)(\d)|(\d)\s?(?:x|ක්|pcs)/.exec(text);
      parts.push({ name, qty: qty ? Number(qty[1] ?? qty[2]) : 1 });
      evidence.push(...found);
    }
    return result({ parts }, parts.length ? 0.6 : 0, evidence);
  },

  async moderate(raw) {
    const text = normalise(raw);
    const reasons: ModerationResult['reasons'] = [];
    const abuse = hits(text, ABUSE_WORDS);
    if (abuse.length) reasons.push('abuse');
    if (PHONE.test(raw) || EMAIL.test(raw)) reasons.push('contact');
    if (LINK.test(raw) || /(.)\1{5,}/.test(text) || (raw.length > 20 && raw === raw.toUpperCase() && /[A-Z]/.test(raw))) reasons.push('spam');
    const accusation = hits(text, ACCUSATION_WORDS);
    if (accusation.length) reasons.push('accusation');
    // Accusations may be a genuine complaint: they go to a person but don't block on their own.
    const ok = !reasons.some((r) => r === 'abuse' || r === 'contact' || r === 'spam');
    return result({ ok, reasons }, reasons.length ? 0.7 : 0.6, [...abuse, ...accusation]);
  },
};
