import React, { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useTowRecords, type TowRecord } from '../../context/TowRecordsContext';
import { useVehicles } from '../../context/VehiclesContext';
import { TowVehicleScreen, type TowVehicleFull } from './TowVehicleScreen';
import { TowRouteScreen, type TowRouteDraft } from './TowRouteScreen';
import { TowBidsScreen, type TowBidsDraft } from './TowBidsScreen';
import { TowTrackingScreen, type TowFinalDraft, type TowTrackingStage } from './TowTrackingScreen';
import { TowPayScreen, type TowPaidDraft } from './TowPayScreen';
import { TowRateScreen } from './TowRateScreen';
import { TowHoldScreen, type TowHoldDraft } from './TowHoldScreen';
import { TowQrScreen } from './TowQrScreen';
import { makeCloseCode } from '@ongarage/shared';

/**
 * The towing flow, five steps: 1 the vehicle and what happened to it, 2 the two places and the time, 3 the bids, 4 the trip to the drop-off, then 5 the completion code and the rating. Each screen hands its result on and the flow moves to the next one by itself.
 * Back goes one screen; close is only offered before a truck has accepted (after that the job is locked, as in SOS).
 * A scheduled tow is held after the bid, and its record is kept in Activity until the slot or a cancellation.
 * Once a truck has accepted, the owner can minimise the tow: the flow keeps running and Home shows a return bar.
 */
type Phase =
  | { name: 'vehicle' }
  /** `start` is set when the owner came back from the bids to change the time or a place; the places and time so far are kept. */
  | { name: 'route'; vehicle: TowVehicleFull; start?: TowRouteDraft }
  | { name: 'bids'; vehicle: TowVehicleFull; route: TowRouteDraft }
  | { name: 'hold'; draft: TowBidsDraft }
  | { name: 'tracking'; draft: TowBidsDraft }
  | { name: 'pay'; draft: TowFinalDraft }
  | { name: 'qr'; draft: TowPaidDraft }
  | { name: 'rate'; draft: TowPaidDraft };

/** What the return bar on Home says about a running tow, and whether the owner must act now. */
export type TowStatus = { running: boolean; label: string; needsInput: boolean };
const IDLE: TowStatus = { running: false, label: '', needsInput: false };

const TRACK_LABEL: Record<TowTrackingStage, { label: string; needsInput: boolean }> = {
  requested: { label: 'ට්‍රක් පිළිගන්නා තුරු බලා සිටිනවා', needsInput: false },
  enroute: { label: 'ට්‍රක් එනවා', needsInput: false },
  arrived: { label: 'ට්‍රක් ආවා — තහවුරු කරන්න', needsInput: true },
  loading: { label: 'flatbed එකට — තහවුරු කරන්න', needsInput: true },
  loaded: { label: 'flatbed එකේ — තහවුරු කරන්න', needsInput: true },
  transporting: { label: 'වාහනය ගෙනයනවා', needsInput: false },
  dropping: { label: 'වාහනය බැස්සවෙමින්', needsInput: false },
  dropped: { label: 'බැස්සුවා — තහවුරු කරන්න', needsInput: true },
  atDrop: { label: 'ගමනාන්තයට ළඟා වුණා', needsInput: false },
};

const slotOf = (r: TowRouteDraft) => (r.timing.mode === 'scheduled' ? `${r.timing.dayOffset === 0 ? 'අද' : `+${r.timing.dayOffset} දින`} ${String(r.timing.hour).padStart(2, '0')}:00` : null);

export const TowFlow: React.FC<{
  onClose: () => void;
  onFinished?: (draft: TowPaidDraft) => void;
  /** The owner puts the running tow away: the app hides this flow and shows the return bar. */
  onMinimize?: () => void;
  /** Reports the tow's status to the app, so Home can show the return bar and hide the towing button. */
  onStatus?: (status: TowStatus) => void;
  /** False while the flow is put away: it then leaves the Android back button alone. */
  active?: boolean;
}> = ({ onClose, onFinished, onMinimize, onStatus, active = true }) => {
  const [phase, setPhase] = useState<Phase>({ name: 'vehicle' });
  const [trackStage, setTrackStage] = useState<TowTrackingStage>('enroute');
  const { addRecord } = useTowRecords();
  const { vehicles } = useVehicles();
  // One id for this booking, made when the flow opens, so the hold's record and its later cancel are the same record.
  const [bookingId] = useState(() => `tow-${Date.now()}`);

  // The status the return bar shows: running from the truck's acceptance until the rating.
  useEffect(() => {
    if (phase.name === 'bids') onStatus?.({ running: true, label: 'ට්‍රක් සොයමින්', needsInput: false });
    else if (phase.name === 'tracking') onStatus?.({ running: true, ...TRACK_LABEL[trackStage] });
    else if (phase.name === 'pay') onStatus?.({ running: true, label: 'ගෙවීම — ඔබේ ක්‍රියාව අවශ්‍යයි', needsInput: true });
    else if (phase.name === 'qr') onStatus?.({ running: true, label: 'QR ස්කෑන් කරන්න', needsInput: true });
    else if (phase.name === 'rate') onStatus?.({ running: true, label: 'ශ්‍රේණිගත කරන්න', needsInput: true });
    else onStatus?.(IDLE);
  }, [phase.name, trackStage]);
  // Closing the flow always clears the status.
  useEffect(() => () => onStatus?.(IDLE), []);

  // The Android back button goes one step back, like the Back arrow. Once a truck has accepted it puts the tow away (never cancels it).
  // A hidden (minimised) flow does not take the button: Home's own back handling applies then.
  // BackHandler exists only on Android, so the web build (used for testing) does not register it.
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      switch (phase.name) {
        case 'vehicle':
          onClose();
          break;
        case 'route':
          if (phase.start) setPhase({ name: 'bids', vehicle: phase.vehicle, route: phase.start });
          else setPhase({ name: 'vehicle' });
          break;
        case 'bids':
          setPhase({ name: 'route', vehicle: phase.vehicle, start: phase.route });
          break;
        case 'tracking':
        case 'pay':
        case 'qr':
        case 'rate':
          onMinimize?.();
          break;
        case 'hold':
          // The booking screen has no back: the owner keeps or cancels it there.
          break;
      }
      return true;
    });
    return () => sub.remove();
  }, [active, phase, onClose, onMinimize]);

  // The record kept in Activity: a saved vehicle shows its name, a temporary one its plate and make.
  const recordFrom = (draft: TowBidsDraft, status: TowRecord['status'], extra: Partial<TowRecord> = {}): TowRecord => ({
    id: bookingId,
    vehicleId: draft.vehicle.source === 'saved' ? draft.vehicle.vehicleId : null,
    vehicleLabel:
      draft.vehicle.source === 'saved'
        ? vehicles.find((v) => v.id === (draft.vehicle as { vehicleId: string }).vehicleId)?.name ?? 'ඔබේ වාහනය'
        : `${draft.vehicle.plate}${draft.vehicle.makeModel ? ` · ${draft.vehicle.makeModel}` : ''}`,
    condition: draft.vehicle.condition,
    pickupText: draft.route.pickup.address,
    dropText: draft.route.drop.name,
    bidName: draft.bid.name,
    slotLabel: slotOf(draft.route),
    agreedFee: draft.bid.quote.total,
    finalAmount: null,
    status,
    cancelFee: 0,
    rating: null,
    comment: '',
    createdAt: Date.now(),
    ...extra,
  });

  switch (phase.name) {
    case 'vehicle':
      return <TowVehicleScreen onClose={onClose} onNext={(vehicle) => setPhase({ name: 'route', vehicle })} />;
    case 'route':
      // The places and the time are one step: the trucks are asked once the owner has confirmed both.
      return (
        <TowRouteScreen
          onClose={onClose}
          start={phase.start}
          onBack={() => (phase.start ? setPhase({ name: 'bids', vehicle: phase.vehicle, route: phase.start }) : setPhase({ name: 'vehicle' }))}
          onNext={(route) => setPhase({ name: 'bids', vehicle: phase.vehicle, route })}
        />
      );
    case 'bids':
      return (
        <TowBidsScreen
          vehicle={phase.vehicle}
          route={phase.route}
          onClose={onClose}
          onMinimize={onMinimize}
          slotLabel={slotOf(phase.route) ?? undefined}
          onChangeTime={() => setPhase({ name: 'route', vehicle: phase.vehicle, start: phase.route })}
          // A scheduled tow is held until its slot; a tow needed now goes straight to tracking.
          onNext={(draft) => setPhase(draft.route.timing.mode === 'scheduled' ? { name: 'hold', draft } : { name: 'tracking', draft })}
        />
      );
    case 'hold':
      return (
        <TowHoldScreen
          draft={phase.draft}
          onDone={(d: TowHoldDraft) => {
            addRecord(recordFrom(d, d.cancelled ? 'cancelled' : 'held', { cancelFee: d.cancelFee }));
            onClose();
          }}
        />
      );
    case 'tracking':
      // No close once the truck has accepted; minimise puts it away instead.
      return (
        <TowTrackingScreen
          draft={phase.draft}
          onNext={(draft) => setPhase({ name: 'qr', draft: { ...draft, closeCode: makeCloseCode(), paid: false } })}
          onMinimize={onMinimize}
          onStage={setTrackStage}
          onCancel={(fee) => {
            addRecord(recordFrom(phase.draft, 'cancelled', { cancelFee: fee }));
            onClose();
          }}
        />
      );
    case 'pay':
      return <TowPayScreen draft={phase.draft} onNext={(draft) => setPhase({ name: 'qr', draft })} onMinimize={onMinimize} />;
    case 'qr':
      return <TowQrScreen draft={phase.draft} onNext={(draft) => setPhase({ name: 'rate', draft })} />;
    case 'rate':
      return (
        <TowRateScreen
          draft={phase.draft}
          onMinimize={onMinimize}
          onDone={(review) => {
            addRecord(recordFrom(phase.draft, 'done', { finalAmount: phase.draft.finalAmount, rating: review.stars || null, comment: review.comment }));
            if (onFinished) onFinished(phase.draft);
            else onClose();
          }}
        />
      );
  }
};
