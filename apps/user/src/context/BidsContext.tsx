import { flyTo } from '../utils/fly';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_COORDS, MOCK_GARAGES } from '../constants/mockData';
import { useWorkshops } from './WorkshopContext';
import { useNotice } from './NoticeContext';
import { categoryInfo, garageAnswerFor, GARAGE_RESPOND_WITHIN_MS, offsetCoordinate, marketPrice, pickTimeDeadline, travelFeeFor } from '@ongarage/shared';
import type { Bid, JobBooking, RepairJob } from '@ongarage/shared';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Garages that bid on posted jobs. Rating, review count and level come from their
// profiles (MOCK_GARAGES), so a bid and the garage's page always agree.
const profile = (name: string) => {
  const g = MOCK_GARAGES.find((x) => x.name === name)!;
  return { garageId: g.id, garageName: g.name, level: g.level, rating: g.rating, reviews: g.reviews };
};
const BIDDING_GARAGES = [
  { ...profile('TOPCODE Tuning & Service'), distanceKm: 1.2, bearing: 300, warrantyMonths: 3, estHours: 1 },
  { ...profile('Apex Motors & Hybrid Hub'), distanceKm: 3.5, bearing: 40, warrantyMonths: 1, estHours: 2 },
  { ...profile('Lanka Auto Diagnostics'), distanceKm: 2.1, bearing: 160, warrantyMonths: 2, estHours: 3 },
  // Far away (beyond FAR_JOB_KM): its bid carries a travel compensation fee, and the owner sees it marked.
  { ...profile('Speed Works Garage'), distanceKm: 18.6, bearing: 220, warrantyMonths: 2, estHours: 3 },
];

/** How long the simulated garage takes to answer a requested time: 30 seconds (the same as a direct booking). */
const GARAGE_REPLY_SIM_MS = 30000;

const PRICE_FACTORS = [1.0, 0.82, 1.18];
const SIMULATED_BID_DELAYS_MS = [6000, 14000, 24000, 36000];

const makeBid = (job: Pick<RepairJob, 'categoryId' | 'coords'>, index: number, submittedAt: number): Bid => {
  const g = BIDDING_GARAGES[index % BIDDING_GARAGES.length];
  const base = marketPrice(job.categoryId);
  const travelFee = travelFeeFor(g.distanceKm);
  return {
    id: `bid-${submittedAt}-${index}`,
    garageId: g.garageId,
    garageName: g.garageName,
    level: g.level,
    rating: g.rating,
    reviews: g.reviews,
    distanceKm: g.distanceKm,
    coords: offsetCoordinate(job.coords, g.distanceKm, g.bearing),
    price: Math.round((base * PRICE_FACTORS[index % PRICE_FACTORS.length]) / 100) * 100 + travelFee,
    ...(travelFee ? { travelFee } : {}),
    warrantyMonths: g.warrantyMonths,
    estHours: g.estHours,
    submittedAt,
  };
};

const seedJobs = (now: number): RepairJob[] => {
  const base = { sparePart: 'Genuine' as const, doorstep: false, address: 'ගාල්ල', coords: DEFAULT_COORDS };
  const received: RepairJob = {
    ...base,
    id: 'job-seed-1',
    categoryId: '1',
    description: 'එන්ජිමෙන් ගැටෙන ශබ්දයක් ඇසේ, විශේෂයෙන් ධාවනය කරන විට.',
    vehicleId: 'premio',
    biddingHours: 12,
    submittedAt: now - 15 * MIN,
    bids: [],
  };
  received.bids = [makeBid(received, 0, now - 10 * MIN), makeBid(received, 1, now - 6 * MIN)];
  const list: RepairJob[] = [
    received,
    {
      ...base,
      id: 'job-seed-2',
      categoryId: '7',
      description: 'බ්‍රේක් තද කරන විට කෑගසන ශබ්දයක් ඇසේ.',
      vehicleId: 'alto',
      biddingHours: 6,
      submittedAt: now - 2 * MIN,
      bids: [],
    },
    {
      ...base,
      id: 'job-seed-3',
      categoryId: '4',
      description: 'වායු සමීකරණය (A/C) සීතල හුළඟ ලබා නොදේ.',
      vehicleId: 'vezel',
      biddingHours: 24,
      submittedAt: now - 5 * MIN,
      bids: [],
    },
    {
      ...base,
      id: 'job-seed-4',
      categoryId: '2',
      description: 'ඩෑෂ්බෝඩ් ලයිට් නිවි නිවී දැල්වේ.',
      vehicleId: 'premio',
      biddingHours: 12,
      submittedAt: now - 13 * HOUR,
      bids: [],
    },
    {
      ...base,
      id: 'job-seed-5',
      categoryId: '11',
      description: 'බැටරිය ඉක්මනින් බැස යයි, උදේට වාහනය පණගැන්වීම අපහසුයි.',
      vehicleId: 'march',
      biddingHours: 8,
      submittedAt: now - 10 * HOUR,
      bids: [],
    },
  ];
  // Nobody near picked the brake job up, but a garage far away did: its bid carries a travel fee.
  list[1].bids = [makeBid(list[1], 3, now - MIN)];
  return list;
};

export const biddingEndsAt = (job: RepairJob) => job.submittedAt + job.biddingHours * HOUR;
/**
 * An accepted quote moves from Bids to Activity once the garage has confirmed the time. Until then it is still being arranged (picking a time, waiting, another
 * time offered), so it stays in Bids; after that it is a repair. One place at a time.
 */
export const isHandedOver = (job: RepairJob) => !!job.acceptedBidId && (!job.booking || job.booking.status === 'confirmed');
export const isExpired = (job: RepairJob, now: number) => job.bids.length === 0 && now >= biddingEndsAt(job);

export type NewJob = Omit<RepairJob, 'id' | 'submittedAt' | 'bids' | 'acceptedBidId'> & { replacesJobId?: string };

type BidsState = {
  jobs: RepairJob[];
  postJob: (job: NewJob) => RepairJob;
  /** The owner accepts a quote: the price is agreed, and the owner then has to pick a time (the workshop starts when the garage confirms it). */
  acceptBid: (jobId: string, bidId: string) => void;
  /** The owner asks the winning garage for a time; the garage confirms it or proposes another. */
  requestBidSlot: (jobId: string, input: { preferredAt: number; doorstep?: boolean; stays?: boolean; note?: string }) => void;
  /** The owner takes the other time the garage proposed. */
  acceptSlotProposal: (jobId: string) => void;
  /** The owner turns the proposed time down and goes back to picking a time with the same garage. */
  declineSlotProposal: (jobId: string) => void;
  /** Dismiss a received bid that has not been accepted. */
  removeBid: (jobId: string, bidId: string) => void;
  /** Deletes a posted job that has no bids to accept (waiting or expired). */
  removeJob: (jobId: string) => void;
  /** Gives a job that is still open more time to collect bids. */
  extendBidding: (jobId: string, hours: number) => void;
};

const BidsContext = createContext<BidsState | null>(null);

export const BidsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startWorkshop } = useWorkshops();
  const { notify } = useNotice();
  const [jobs, setJobs] = useState<RepairJob[]>(() => seedJobs(Date.now()));
  const live = useRef(jobs);
  live.current = jobs;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const postJob = useCallback((input: NewJob) => {
    const { replacesJobId, ...rest } = input;
    const now = Date.now();
    const job: RepairJob = { ...rest, id: `job-${now}`, submittedAt: now, bids: [] };
    setJobs((prev) => [job, ...prev.filter((j) => j.id !== replacesJobId)]);
    flyTo('posted');

    // Demo: garages respond to a freshly posted job over the next ~25 seconds.
    SIMULATED_BID_DELAYS_MS.forEach((delay, i) => {
      timers.current.push(
        setTimeout(() => {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id && !j.acceptedBidId ? { ...j, bids: [...j.bids, makeBid(j, i, Date.now())] } : j
            )
          );
          // the first bid in: the job's bids are ready
          if (i === 0) flyTo('bidReady');
        }, delay)
      );
    });
    return job;
  }, []);

  /** The garage takes the vehicle in at the agreed time and follows the workshop steps. */
  const beginWorkshop = useCallback(
    (job: RepairJob, bid: Bid, scheduledAt: number, doorstep: boolean, stays?: boolean) => {
      startWorkshop({ id: job.id, garageId: bid.garageId, garageName: bid.garageName, categoryId: job.categoryId, agreedPrice: bid.price, scheduledAt, doorstep, warrantyMonths: bid.warrantyMonths, vehicleId: job.vehicleId, partType: job.sparePart, protectedJob: bid.level === 'premier', stays });
    },
    [startWorkshop]
  );
  const patchBooking = useCallback((jobId: string, change: (b: JobBooking) => JobBooking) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId && j.booking ? { ...j, booking: change(j.booking) } : j)));
  }, []);

  // The owner accepted a quote: the price is agreed, but there is no time yet. The owner picks one and the garage confirms it before the workshop starts.
  const acceptBid = useCallback((jobId: string, bidId: string) => {
    const now = Date.now();
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, acceptedBidId: bidId, booking: { status: 'choosing', chooseBy: pickTimeDeadline(now), attempts: 0 } } : j)));
  }, []);

  const requestBidSlot = useCallback(
    (jobId: string, input: { preferredAt: number; doorstep?: boolean; stays?: boolean; note?: string }) => {
      const now = Date.now();
      patchBooking(jobId, (b) => ({ ...b, status: 'requested', preferredAt: input.preferredAt, doorstep: input.doorstep, stays: input.stays, note: input.note, requestedAt: now, respondBy: now + GARAGE_RESPOND_WITHIN_MS, proposal: undefined }));
      timers.current.push(
        setTimeout(() => {
          const job = live.current.find((j) => j.id === jobId);
          const bid = job?.bids.find((b) => b.id === job.acceptedBidId);
          if (!job || !bid || job.booking?.status !== 'requested' || job.booking.preferredAt !== input.preferredAt) return;
          const answer = garageAnswerFor(input.preferredAt);
          if (answer.kind === 'confirm') {
            patchBooking(jobId, (b) => ({ ...b, status: 'confirmed', scheduledAt: input.preferredAt, confirmedAt: Date.now() }));
            flyTo('booked');
            beginWorkshop(job, bid, input.preferredAt, input.doorstep ?? job.doorstep, input.stays);
            notify({ icon: '✅', title: `${bid.garageName} වෙන්කිරීම තහවුරු කළා`, body: `දැන් “ක්‍රියාකාරකම්” හි ඇත. ${(input.doorstep ?? job.doorstep) ? 'නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ.' : `${categoryInfo(job.categoryId).name} · ගරාජයේ ස්ථානය එහි ඇත.`}`, tone: 'success' });
          } else {
            patchBooking(jobId, (b) => ({ ...b, status: 'proposed', proposal: { at: answer.at, note: 'එම වේලාවේ ගරාජය වසා ඇත.' } }));
            notify({ icon: '🕘', title: `${bid.garageName} වෙනත් වේලාවක් යෝජනා කළා`, body: 'පිළිගන්න හෝ වෙනත් වේලාවක් තෝරන්න.', tone: 'primary' });
          }
        }, GARAGE_REPLY_SIM_MS)
      );
    },
    [beginWorkshop, notify, patchBooking]
  );

  const acceptSlotProposal = useCallback(
    (jobId: string) => {
      const job = live.current.find((j) => j.id === jobId);
      const bid = job?.bids.find((b) => b.id === job.acceptedBidId);
      const proposal = job?.booking?.proposal;
      if (!job || !bid || !proposal) return;
      patchBooking(jobId, (b) => ({ ...b, status: 'confirmed', scheduledAt: proposal.at, proposal: undefined, confirmedAt: Date.now() }));
      flyTo('booked');
      beginWorkshop(job, bid, proposal.at, job.booking?.doorstep ?? job.doorstep, job.booking?.stays);
      notify({ icon: '✅', title: 'වෙන්කිරීම තහවුරුයි', body: `දැන් “ක්‍රියාකාරකම්” හි ඇත · ${bid.garageName} · ${categoryInfo(job.categoryId).name}`, tone: 'success' });
    },
    [beginWorkshop, notify, patchBooking]
  );

  // A turned-down time goes back to picking another one with the same garage; the quote and its price stay.
  const declineSlotProposal = useCallback(
    (jobId: string) => {
      patchBooking(jobId, (b) => ({ ...b, status: 'choosing', proposal: undefined, preferredAt: undefined, attempts: (b.attempts ?? 0) + 1 }));
    },
    [patchBooking]
  );

  // Two things lapse with time: a quote whose time was never picked (the acceptance is undone and the other quotes reopen),
  // and a requested time the garage never answered (it goes back to picking a time).
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setJobs((prev) => {
        const needs = prev.some((j) => j.booking && ((j.booking.status === 'choosing' && j.booking.chooseBy <= now) || (j.booking.status === 'requested' && (j.booking.respondBy ?? Infinity) <= now)));
        if (!needs) return prev;
        return prev.map((j) => {
          const b = j.booking;
          if (!b) return j;
          if (b.status === 'choosing' && b.chooseBy <= now) {
            const { acceptedBidId, booking, ...rest } = j;
            return rest as RepairJob;
          }
          if (b.status === 'requested' && (b.respondBy ?? Infinity) <= now) return { ...j, booking: { ...b, status: 'choosing', preferredAt: undefined, attempts: (b.attempts ?? 0) + 1 } };
          return j;
        });
      });
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const removeBid = useCallback((jobId: string, bidId: string) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId && !j.acceptedBidId ? { ...j, bids: j.bids.filter((b) => b.id !== bidId) } : j)));
  }, []);


  const extendBidding = useCallback((jobId: string, hours: number) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId && !j.acceptedBidId ? { ...j, biddingHours: j.biddingHours + hours } : j)));
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId || j.acceptedBidId));
  }, []);

  return <BidsContext.Provider value={{ jobs, postJob, acceptBid, requestBidSlot, acceptSlotProposal, declineSlotProposal, removeBid, removeJob, extendBidding }}>{children}</BidsContext.Provider>;
};

export const useBids = () => {
  const ctx = useContext(BidsContext);
  if (!ctx) throw new Error('useBids must be used inside BidsProvider');
  return ctx;
};

export const lowestBidId = (bids: Bid[]) => (bids.length > 1 ? [...bids].sort((a, b) => a.price - b.price)[0].id : undefined);
