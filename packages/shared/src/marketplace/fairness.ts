import type { IntakeStatus, SubscriptionPlanId } from '../types';

// Fair share: stop a few famous garages taking every job, without punishing size or
// owners' choices. Only garages flagged by monitoring are limited; the limit is in job
// value (so small jobs don't use up the day) and grows with real capacity. Direct
// bookings over the limit are offered the next free day, never refused.

export const INTAKE = {
  /** LKR of new work per day for a limited garage. */
  baseDailyValue: 75000,
  /** Extra daily value per mechanic present beyond the first three (real capacity). */
  perExtraMechanic: 15000,
  /** Jobs below this value don't count towards the limit. */
  lowValueThreshold: 3000,
};

/** Newer garages with a good score see new bid jobs this many minutes before others. */
export const RISING_HEAD_START_MIN = 10;
export const isRisingGarage = (s: { monthsOnApp: number; score: number; closedJobs: number }) => s.monthsOnApp < 6 && s.score >= 4.3 && s.closedJobs >= 3;

export const computeIntake = (i: { limited: boolean; mechanicsPresent: number; todaysJobValues: number[]; planMultiplier?: number }): IntakeStatus => {
  const used = i.todaysJobValues.filter((v) => v >= INTAKE.lowValueThreshold).reduce((s, v) => s + v, 0);
  if (!i.limited) return { limited: false, limit: Infinity, used, remaining: Infinity, reached: false };
  const base = INTAKE.baseDailyValue + Math.max(0, i.mechanicsPresent - 3) * INTAKE.perExtraMechanic;
  const limit = i.planMultiplier === Infinity ? Infinity : base * (i.planMultiplier ?? 1);
  const remaining = Math.max(0, limit - used);
  return { limited: true, limit, used, remaining, reached: remaining <= 0 };
};

// ---------- Monitoring (runs on the back end; the admin app reviews the flags) ----------

export const FAIRNESS = {
  /** Share of a job category in one area over the window. */
  maxAreaShare: 0.25,
  /** Average monthly earnings through the app. */
  maxMonthlyEarnings: 400000,
  windowMonths: 3,
  /** Notice before limits apply. */
  graceDays: 30,
};

export type FairnessStats = { areaShareByCategory: Record<string, number>; avgMonthlyEarnings: number; monthsObserved: number };

/** Why a garage would be flagged (empty = not flagged). A person approves in the admin app. */
export const fairnessFlags = (s: FairnessStats, categoryName: (id: string) => string): string[] => {
  if (s.monthsObserved < FAIRNESS.windowMonths) return [];
  const flags = Object.entries(s.areaShareByCategory)
    .filter(([, share]) => share > FAIRNESS.maxAreaShare)
    .map(([cat, share]) => `ප්‍රදේශයේ ${categoryName(cat)} රැකියාවලින් ${Math.round(share * 100)}%`);
  if (s.avgMonthlyEarnings > FAIRNESS.maxMonthlyEarnings) flags.push(`යෙදුමෙන් මාසික සාමාන්‍ය ආදායම රු. ${Math.round(s.avgMonthlyEarnings).toLocaleString()}`);
  return flags;
};

// ---------- Subscription: priced by what the app earns the garage, with a value guarantee ----------

export type SubscriptionPlan = { id: SubscriptionPlanId; name: string; minMonthlyEarnings: number; fee: number; intakeMultiplier: number; perks: string[] };

export const PLANS: SubscriptionPlan[] = [
  { id: 'growth', name: 'Growth', minMonthlyEarnings: 0, fee: 4900, intakeMultiplier: 2, perks: ['දෛනික සීමාව 2×', 'ඉහළ වටිනාකමැති රැකියා'] },
  { id: 'pro', name: 'Pro', minMonthlyEarnings: 400000, fee: 9900, intakeMultiplier: 3, perks: ['දෛනික සීමාව 3×', 'ආරක්ෂිත රැකියා', 'දැන්වීම් ණය රු. 2,000'] },
  { id: 'premier', name: 'Premier', minMonthlyEarnings: 1000000, fee: 19900, intakeMultiplier: Infinity, perks: ['සීමාවක් නැත', 'ආරක්ෂිත රැකියා', 'දැන්වීම් ණය රු. 5,000', 'වාර්තා'] },
];

/** The plan for a garage's average monthly app earnings (highest band it reaches). */
export const planFor = (avgMonthlyEarnings: number): SubscriptionPlan => [...PLANS].reverse().find((p) => avgMonthlyEarnings >= p.minMonthlyEarnings) ?? PLANS[0];

/** If the month's won work is below this multiple of the fee, the shortfall is credited. */
export const GUARANTEE_MULTIPLE = 5;

export const valueGuarantee = (fee: number, wonValue: number) => {
  const target = fee * GUARANTEE_MULTIPLE;
  const met = wonValue >= target;
  return { target, met, credit: met ? 0 : Math.round(fee * (1 - wonValue / target)) };
};
