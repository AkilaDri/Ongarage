import { formatDate, formatTime } from '../../utils/format';
import { vehicleIcon } from '../../constants/vehicles';

const PART_LABEL: Record<string, string> = { Genuine: 'Genuine', OEM: 'OEM', Recon: 'Recon', GarageChoice: 'ගරාජයේ තේරීම' };

type RecordVehicle = { name: string; plate: string; type: string; registrationNo?: string; make?: string; model?: string; color?: string; chassisNo?: string; engineNo?: string };

/**
 * The record of a job that goes into its chat the moment the job is given or taken, with everything known about it: what it
 * is, who, the vehicle in full, the owner's description, the part type, when, how it gets to the garage, where, the price,
 * what was attached and any note. Both sides read the same note. Lines with nothing to say are left out.
 */
export const jobRecordText = (job: {
  title: string;
  /** Who the other party is: the customer (garage side) or the garage (owner side). */
  who?: { label: string; name: string; phone?: string };
  vehicle?: RecordVehicle;
  description?: string;
  partType?: string;
  at?: number;
  /** true: the garage goes to the owner; false: the owner brings the vehicle in; undefined: not known. */
  doorstep?: boolean;
  place?: string;
  price?: number;
  priceLabel?: string;
  photos?: number;
  voiceNotes?: number;
  /** Anything else worth keeping (warranty, the garage's note, the call-out fee…). */
  notes?: string[];
}) => {
  const v = job.vehicle;
  const details = v ? [v.make && v.model ? `${v.make} ${v.model}` : '', v.color].filter(Boolean).join(' · ') : '';
  const numbers = v ? [v.chassisNo ? `Chassis ${v.chassisNo}` : '', v.engineNo ? `Engine No ${v.engineNo}` : ''].filter(Boolean).join(' · ') : '';
  const attached = [job.photos ? `📷 ඡායාරූප ${job.photos}` : '', job.voiceNotes ? `🎙️ හඬ පටිගත ${job.voiceNotes}` : ''].filter(Boolean).join('  ');
  return [
    '📋 Job Info',
    job.title,
    job.who ? `👤 ${job.who.label}: ${job.who.name}${job.who.phone ? ' · ' + job.who.phone : ''}` : '',
    v ? `${vehicleIcon(v.type)} ${v.name} · ${v.registrationNo || v.plate}` : '',
    details,
    numbers,
    job.description ? `📝 ${job.description}` : '',
    job.partType ? `⚙️ කොටස් වර්ගය: ${PART_LABEL[job.partType] ?? job.partType}` : '',
    job.at ? `📅 ${formatDate(job.at)} · ${formatTime(job.at)}` : '',
    job.doorstep === undefined ? '' : job.doorstep ? '🏠 ගරාජය වාහනය ඇති තැනට පැමිණේ' : '🏢 වාහනය ගරාජයට රැගෙන එන්න',
    job.place ? `📍 ${job.place}` : '',
    job.price ? `💰 ${job.priceLabel ?? 'මිල'}: රු. ${job.price.toLocaleString('en-US')}` : '',
    attached,
    ...(job.notes ?? []).map((n) => `ℹ️ ${n}`),
  ]
    .filter(Boolean)
    .join('\n');
};
