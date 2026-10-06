import type { Feature, LevelId } from '../types';

// The progression ladder garages (and technicians) climb by doing good work through
// the app. Higher levels unlock features; locked ones stay visible so garages know
// what they're working towards. Premier is by invitation (after fairness monitoring)
// and needs a subscription.

export type LevelRequirement = {
  documents?: boolean;
  minClosedJobs: number;
  minScore: number;
  maxDisputeRate: number;
  minMonths: number;
  subscription?: boolean;
};

export type Level = { id: LevelId; name: string; icon: string; requires: LevelRequirement; unlocks: Feature[]; note: string };

export const LEVELS: Level[] = [
  {
    id: 'registered', name: 'ලියාපදිංචි', icon: '🔰',
    requires: { minClosedJobs: 0, minScore: 0, maxDisputeRate: 1, minMonths: 0 },
    unlocks: ['sos', 'bids', 'directBookings'],
    note: 'SOS, ලංසු සහ ඍජු වෙන්කිරීම්',
  },
  {
    id: 'verified', name: 'තහවුරු කළ', icon: '✅',
    requires: { documents: true, minClosedJobs: 10, minScore: 4.0, maxDisputeRate: 0.05, minMonths: 0 },
    unlocks: ['verifiedBadge'],
    note: 'තහවුරු කළ ලාංඡනය',
  },
  {
    id: 'trusted', name: 'විශ්වාසනීය', icon: '🛡️',
    requires: { documents: true, minClosedJobs: 50, minScore: 4.5, maxDisputeRate: 0.02, minMonths: 3 },
    unlocks: ['priorityPlacement', 'highValueJobs', 'analytics'],
    note: 'ඉහළ ස්ථානගත කිරීම සහ ඉහළ වටිනාකමැති රැකියා',
  },
  {
    id: 'premier', name: 'ප්‍රිමියර්', icon: '👑',
    requires: { documents: true, minClosedJobs: 150, minScore: 4.6, maxDisputeRate: 0.02, minMonths: 6, subscription: true },
    unlocks: ['protectedJobs', 'adCredits'],
    note: 'ආරක්ෂිත රැකියා (OnGarage Guarantee) සහ දැන්වීම් ණය',
  },
];

/** A level that drops below its requirements is kept this long, with a warning, before it's lost. */
export const DEMOTION_GRACE_DAYS = 30;

export type LevelStats = {
  documents: boolean;
  closedJobs: number;
  score: number;
  disputeRate: number;
  monthsOnApp: number;
  subscribed: boolean;
};

export type LevelProgressItem = { label: string; have: string; need: string; met: boolean };

const meets = (r: LevelRequirement, s: LevelStats) =>
  (!r.documents || s.documents) &&
  s.closedJobs >= r.minClosedJobs &&
  s.score >= r.minScore &&
  s.disputeRate <= r.maxDisputeRate &&
  s.monthsOnApp >= r.minMonths &&
  (!r.subscription || s.subscribed);

/** The highest level whose requirements (and every lower level's) are met. */
export const currentLevel = (s: LevelStats): Level => {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (!meets(l.requires, s)) break;
    level = l;
  }
  return level;
};

export const nextLevel = (id: LevelId): Level | undefined => LEVELS[LEVELS.findIndex((l) => l.id === id) + 1];

/** What is still missing for a level, item by item (for progress bars). */
export const levelProgress = (target: Level, s: LevelStats): LevelProgressItem[] => {
  const r = target.requires;
  const items: LevelProgressItem[] = [];
  if (r.documents) items.push({ label: 'ලේඛන තහවුරු කිරීම', have: s.documents ? '✓' : '—', need: '✓', met: s.documents });
  if (r.minClosedJobs) items.push({ label: 'QR මගින් අවසන් කළ රැකියා', have: String(s.closedJobs), need: String(r.minClosedJobs), met: s.closedJobs >= r.minClosedJobs });
  if (r.minScore) items.push({ label: 'විශ්වාස ලකුණු', have: s.score.toFixed(1), need: r.minScore.toFixed(1), met: s.score >= r.minScore });
  if (r.maxDisputeRate < 1)
    items.push({ label: 'ආරවුල් අනුපාතය', have: `${(s.disputeRate * 100).toFixed(1)}%`, need: `≤ ${(r.maxDisputeRate * 100).toFixed(0)}%`, met: s.disputeRate <= r.maxDisputeRate });
  if (r.minMonths) items.push({ label: 'යෙදුමේ මාස', have: String(s.monthsOnApp), need: String(r.minMonths), met: s.monthsOnApp >= r.minMonths });
  if (r.subscription) items.push({ label: 'දායකත්වය (ආරාධනාවෙන්)', have: s.subscribed ? '✓' : '—', need: '✓', met: s.subscribed });
  return items;
};

/** Every feature unlocked up to and including a level. */
export const entitlementsFor = (id: LevelId): Set<Feature> => {
  const upTo = LEVELS.slice(0, LEVELS.findIndex((l) => l.id === id) + 1);
  return new Set(upTo.flatMap((l) => l.unlocks));
};

/** The level that unlocks a feature (to show "🔒 unlocks at …"). */
export const levelForFeature = (f: Feature): Level => LEVELS.find((l) => l.unlocks.includes(f)) ?? LEVELS[0];
