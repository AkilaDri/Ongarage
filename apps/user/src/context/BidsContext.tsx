import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_COORDS } from '../constants/mockData';
import { useWorkshops } from './WorkshopContext';
import { offsetCoordinate, marketPrice } from '@ongarage/shared';
import type { Bid, RepairJob } from '@ongarage/shared';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const BIDDING_GARAGES = [
  { garageName: 'TOPCODE Tuning & Service', level: 'trusted' as const, rating: 4.9, reviews: 120, distanceKm: 1.2, bearing: 300, warrantyMonths: 3, estHours: 1 },
  { garageName: 'Apex Motors & Hybrid Hub', level: 'verified' as const, rating: 4.6, reviews: 45, distanceKm: 3.5, bearing: 40, warrantyMonths: 1, estHours: 2 },
  { garageName: 'Lanka Auto Diagnostics', level: 'verified' as const, rating: 4.8, reviews: 76, distanceKm: 2.1, bearing: 160, warrantyMonths: 2, estHours: 3 },
];

const PRICE_FACTORS = [1.0, 0.82, 1.18];
const SIMULATED_BID_DELAYS_MS = [6000, 14000, 24000];

const makeBid = (job: Pick<RepairJob, 'categoryId' | 'coords'>, index: number, submittedAt: number): Bid => {
  const g = BIDDING_GARAGES[index % BIDDING_GARAGES.length];
  const base = marketPrice(job.categoryId);
  return {
    id: `bid-${submittedAt}-${index}`,
    garageName: g.garageName,
    level: g.level,
    rating: g.rating,
    reviews: g.reviews,
    distanceKm: g.distanceKm,
    coords: offsetCoordinate(job.coords, g.distanceKm, g.bearing),
    price: Math.round((base * PRICE_FACTORS[index % PRICE_FACTORS.length]) / 100) * 100,
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
  return [
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
};

export const biddingEndsAt = (job: RepairJob) => job.submittedAt + job.biddingHours * HOUR;
export const isExpired = (job: RepairJob, now: number) => job.bids.length === 0 && now >= biddingEndsAt(job);

export type NewJob = Omit<RepairJob, 'id' | 'submittedAt' | 'bids' | 'acceptedBidId'> & { replacesJobId?: string };

type BidsState = {
  jobs: RepairJob[];
  postJob: (job: NewJob) => RepairJob;
  acceptBid: (jobId: string, bidId: string) => void;
};

const BidsContext = createContext<BidsState | null>(null);

export const BidsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startWorkshop } = useWorkshops();
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

    // Demo: garages respond to a freshly posted job over the next ~25 seconds.
    SIMULATED_BID_DELAYS_MS.forEach((delay, i) => {
      timers.current.push(
        setTimeout(() => {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id && !j.acceptedBidId ? { ...j, bids: [...j.bids, makeBid(j, i, Date.now())] } : j
            )
          );
        }, delay)
      );
    });
    return job;
  }, []);

  const acceptBid = useCallback(
    (jobId: string, bidId: string) => {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, acceptedBidId: bidId } : j)));
      const job = live.current.find((j) => j.id === jobId);
      const bid = job?.bids.find((b) => b.id === bidId);
      // The winning garage takes the vehicle in and follows the workshop steps.
      if (job && bid) startWorkshop({ id: jobId, garageName: bid.garageName, categoryId: job.categoryId, agreedPrice: bid.price, scheduledAt: Date.now(), doorstep: job.doorstep, warrantyMonths: bid.warrantyMonths, vehicleId: job.vehicleId, partType: job.sparePart, protectedJob: bid.level === 'premier' });
    },
    [startWorkshop]
  );

  return <BidsContext.Provider value={{ jobs, postJob, acceptBid }}>{children}</BidsContext.Provider>;
};

export const useBids = () => {
  const ctx = useContext(BidsContext);
  if (!ctx) throw new Error('useBids must be used inside BidsProvider');
  return ctx;
};

export const lowestBidId = (bids: Bid[]) => (bids.length > 1 ? [...bids].sort((a, b) => a.price - b.price)[0].id : undefined);
