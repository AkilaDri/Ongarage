import { useEffect, useRef } from 'react';
import { SERVICE_KINDS } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { useNotice } from '../context/NoticeContext';
import { useWorkshops } from '../context/WorkshopContext';
import { formatDate } from '../utils/format';
import { nextServiceOf, type ServiceRecord } from './ServiceRecordsSheet';

/**
 * Reminds the owner, once when the app opens, of every vehicle whose next service is near (within 14 days or 500 km), due or
 * overdue, from the record its garage wrote at the last service. Shows nothing itself.
 */
export const ServiceReminders: React.FC = () => {
  const { vehicles } = useVehicles();
  const { workshops } = useWorkshops();
  const { notify } = useNotice();
  const told = useRef(new Set<string>());

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const v of vehicles) {
        if (told.current.has(v.id)) continue;
        const records: ServiceRecord[] = Object.values(workshops)
          .filter((w) => w.progress.stage === 'closed' && w.vehicleId === v.id && w.progress.handover?.service)
          .sort((a, b) => (b.progress.closedAt ?? 0) - (a.progress.closedAt ?? 0))
          .map((w) => ({ id: w.id, icon: '🛠️', title: '', garage: w.garageName, at: w.progress.closedAt ?? 0, amount: 0, kind: 'job' as const, service: w.progress.handover?.service }));
        const next = nextServiceOf(records);
        if (!next || next.reminder.state === 'ok') continue;
        told.current.add(v.id);
        const when = [next.service.nextServiceAt ? formatDate(next.service.nextServiceAt) : '', next.service.nextServiceKm ? `${next.service.nextServiceKm.toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ');
        notify({
          icon: '🔔',
          title: next.reminder.state === 'overdue' ? `${v.name}: ඊළඟ සේවාව ප්‍රමාදයි` : `${v.name}: ඊළඟ සේවාව ළඟයි`,
          body: `${SERVICE_KINDS.find((k) => k.id === next.service.kind)?.label ?? 'සේවාව'} · ${when} — “Service” ප්‍රවර්ගයෙන් වෙන් කරන්න.`,
          tone: next.reminder.state === 'overdue' ? 'danger' : 'primary',
        });
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [vehicles, workshops, notify]);

  return null;
};
