import type { GarageRef, TechAssignment, TechLinkKind, TechRates, TechSOSStage, TechWorkshopStage } from '@ongarage/shared';

// Technician-side views of the work garages assign (see the shared TechAssignment
// contract). When a backend exists these are what the technician's phone receives.

export type { Notice } from '@ongarage/shared';

/** A garage this technician works for: as its employee, or as a freelancer. */
export type GarageLink = { garage: GarageRef; kind: TechLinkKind; rates: TechRates; since: number; jobsDone: number };

/** A garage asking the technician to join its team. */
export type Invite = { id: string; garage: GarageRef; kind: TechLinkKind; rates: TechRates; code: string; message?: string };

/**
 * Where the technician is working right now. Checked in to one garage at a time,
 * so a freelancer counts towards one garage's SOS capacity, never two.
 */
export type Duty = { garageId: string | null; since?: number; onBreak: boolean; breakSince?: number };

export type TechJob = TechAssignment & {
  kind: 'sos' | 'workshop';
  stage: TechSOSStage | TechWorkshopStage;
  /** Checklist ticks (SOS: inspect / repair / hand over; workshop: its own list). */
  tasks: boolean[];
  /** SOS: the final repair charge recorded after inspection. */
  repair?: { amount: number; needed: boolean };
  /** SOS: a repair charge above the quote waits for the garage manager. */
  approval?: { amount: number; status: 'pending' | 'approved' | 'rejected' };
  enrouteAt?: number;
  startedAt?: number;
  completedAt?: number;
  /** Cash the technician took from the owner on the garage's behalf. */
  collected?: number;
  paidOnline?: boolean;
  notes?: string;
  declineReason?: string;
};

/** What a job earned the technician, and the cash they hold for the garage. */
export type EarningEntry = {
  id: string;
  jobId: string;
  garageId: string;
  garageName: string;
  title: string;
  icon: string;
  at: number;
  pay: number;
  collected: number;
  /** The garage paid the technician and took the cash: settled outside the app. */
  settled: boolean;
  rating?: number;
};

/** Vehicle owners rate the technician as well as the garage. */
export type OwnerReview = { id: string; customer: string; garage: string; rating: number; text: string; at: number };

export type TechProfile = {
  id: string;
  name: string;
  role: string;
  phone: string;
  skills: string[];
  nicVerified: boolean;
  /** Shown to garages that want to invite this technician. */
  techCode: string;
  joinedAt: number;
};
