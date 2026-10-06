import type { BreakdownId } from '../constants/breakdowns';
import type { DisputeTopic } from '../types';

// The AI decisions layer: one contract for every "smart" suggestion in the apps.
// Today a keyword-rules provider answers (works offline, in the simulation); later the
// back end answers with Claude, and Laya can take over high-volume decisions — without
// the apps changing. Answers are always suggestions with a confidence: people confirm
// anything that matters, and money-affecting decisions are approved in the admin app.

export type AiSource = 'rules' | 'claude' | 'laya';

export type AiResult<T> = {
  value: T;
  /** 0–1. Below SUGGEST_MIN_CONFIDENCE the apps show nothing (or "not sure"). */
  confidence: number;
  source: AiSource;
  /** What the decision was based on (e.g. matched words), for "why?" in the UI and the decision log. */
  evidence: string[];
};

/** Below this the apps don't show a suggestion. */
export const SUGGEST_MIN_CONFIDENCE = 0.35;

export type Urgency = 'low' | 'normal' | 'high';

/** An owner's job description → service category, urgency, parts they named. */
export type JobClassification = { categoryId: string | null; urgency: Urgency; partsMentioned: string[] };

/** An owner's SOS note → breakdown type. */
export type SOSClassification = { breakdownId: BreakdownId | null };

/** Messages and reviews: is someone moving the deal off the app? */
export type OffPlatformCheck = { flagged: boolean; signals: ('phone' | 'payment' | 'externalChat')[] };

/** A complaint, dispute or problem report → topic and what it needs. */
export type ComplaintTriage = { topic: DisputeTopic; urgency: Urgency; refundAsked: boolean; needsHuman: boolean };

/** A technician's diagnosis note → part lines to put in the diagnosis report. */
export type PartSuggestion = { parts: { name: string; qty: number }[] };

/** Reviews and ad text before they're published. */
export type ModerationResult = { ok: boolean; reasons: ('abuse' | 'contact' | 'spam' | 'accusation')[] };

export interface AiProvider {
  readonly source: AiSource;
  classifyJob(text: string): Promise<AiResult<JobClassification>>;
  classifySOS(text: string): Promise<AiResult<SOSClassification>>;
  checkOffPlatform(text: string): Promise<AiResult<OffPlatformCheck>>;
  triageComplaint(text: string): Promise<AiResult<ComplaintTriage>>;
  suggestParts(diagnosisText: string): Promise<AiResult<PartSuggestion>>;
  moderate(text: string): Promise<AiResult<ModerationResult>>;
}
