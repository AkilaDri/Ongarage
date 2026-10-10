import React, { createContext, useCallback, useContext, useState } from 'react';

// Every SOS job that was carried right through (to the owner's rating) is kept here and listed in Activity as its own record.

export type SOSRecord = {
  id: string;
  completedAt: number;
  breakdown: { icon: string; label: string };
  vehicleName: string;
  vehiclePlate: string;
  address: string;
  /** Who took the job. */
  responder: { name: string; mechanic: string; kind: 'garage' | 'technician'; phone: string; rating: number };
  /** The repair charge, the call-out fee and (if one was ordered through OnMart) the part. */
  fees: { repair: number; callout: number; part?: { name: string; shop: string; amount: number } };
  total: number;
  /** The owner's rating of the technician (1-5) and the reasons they ticked. */
  rating: number;
  tags: string[];
};

type SOSRecordsState = {
  records: SOSRecord[];
  addRecord: (record: SOSRecord) => void;
};

const SOSRecordsContext = createContext<SOSRecordsState | null>(null);

export const SOSRecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<SOSRecord[]>([]);
  // A job is recorded once, however many times the rating is re-submitted.
  const addRecord = useCallback((record: SOSRecord) => setRecords((prev) => (prev.some((r) => r.id === record.id) ? prev : [record, ...prev])), []);
  return <SOSRecordsContext.Provider value={{ records, addRecord }}>{children}</SOSRecordsContext.Provider>;
};

export const useSOSRecords = () => {
  const ctx = useContext(SOSRecordsContext);
  if (!ctx) throw new Error('useSOSRecords must be used inside SOSRecordsProvider');
  return ctx;
};
