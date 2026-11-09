import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * The towing jobs the owner has made in the new flow: scheduled holds (kept until the slot or cancelled) and finished tows.
 * Activity reads them. Held in memory until the backend exists, like the other demo contexts.
 */
export type TowRecord = {
  id: string;
  /** The saved vehicle's id, or null for a vehicle added for this job (it has no id in the owner's list). */
  vehicleId: string | null;
  vehicleLabel: string;
  condition: string;
  pickupText: string;
  dropText: string;
  bidName: string;
  /** Scheduled slot label, or null for a tow needed now. */
  slotLabel: string | null;
  agreedFee: number;
  /** The final amount paid (set when the tow finishes). */
  finalAmount: number | null;
  /** 'held' while a scheduled tow waits for its slot; 'done' when the driver scanned the code; 'cancelled' once cancelled. */
  status: 'held' | 'done' | 'cancelled';
  cancelFee: number;
  /** The owner's rating of the driver (1–5), and their comment; null and empty until the review is given. */
  rating: number | null;
  comment: string;
  createdAt: number;
};

type TowRecordsState = {
  records: TowRecord[];
  addRecord: (r: TowRecord) => void;
  updateRecord: (id: string, change: Partial<TowRecord>) => void;
};

const TowRecordsContext = createContext<TowRecordsState | null>(null);

export const TowRecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<TowRecord[]>([]);
  const addRecord = useCallback((r: TowRecord) => setRecords((list) => [r, ...list]), []);
  const updateRecord = useCallback((id: string, change: Partial<TowRecord>) => setRecords((list) => list.map((r) => (r.id === id ? { ...r, ...change } : r))), []);
  return <TowRecordsContext.Provider value={{ records, addRecord, updateRecord }}>{children}</TowRecordsContext.Provider>;
};

export const useTowRecords = () => {
  const ctx = useContext(TowRecordsContext);
  if (!ctx) throw new Error('useTowRecords must be used inside TowRecordsProvider');
  return ctx;
};
