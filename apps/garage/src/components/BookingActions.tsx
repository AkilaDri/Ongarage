import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  approvedLines,
  CheckInSheet,
  CloseJobSheet,
  Colors,
  DiagnosisSheet,
  FONTS,
  HandoverSheet,
  StepProgress,
  themedStyles,
  WORKSHOP_STAGE_TEXT,
  WORKSHOP_STEP_LABELS,
  workshopBill,
  workshopStepIndex,
  partMarketPrice,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { useParts } from '../context/PartsContext';
import { JOB_PHOTOS } from '../constants/mockData';
import { Toast } from './Toast';
import { callCustomer, openDirections, sendGarageLocation, serviceMode } from '../utils/contact';
import { ago, formatDate, formatTime } from '../utils/format';
import type { Booking } from '../types';
/** Who travels, in one line, so every booking reads the same way. */
export const ServiceModeNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const mode = serviceMode(b);
  if (mode === 'roadside') {
    return (
      <View style={[styles.note, styles.noteRoadside]}>
        <Text style={styles.noteTitle}>🚨 මාර්ගයේදීම සේවාව (SOS)</Text>
      </View>
    );
  }
  if (mode === 'doorstep') {
    return (
      <View style={[styles.note, styles.noteDoorstep]}>
        <Text style={styles.noteTitle}>🚛 නිවසටම පැමිණීම — ඔබ පාරිභෝගිකයා වෙත යා යුතුයි</Text>
        <Text style={styles.noteSub}>📍 {b.address}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.note, styles.noteWalkin]}>
      <Text style={styles.noteTitle}>🏠 පාරිභෝගිකයා වාහනය ගරාජයට ගෙන එයි</Text>
      <Text style={styles.noteSub}>
        {b.locationSharedAt
          ? `✓ ඔබගේ ස්ථානය සහ දුරකථන අංකය යවා ඇත · ${ago(Date.now() - b.locationSharedAt)} — මගදී ඔවුන්ට ඔබව ඇමතිය හැක.`
          : 'ඔබගේ ස්ථානය තවම යවා නැත.'}
      </Text>
    </View>
  );
};

/** Where a workshop job is: the step bar and one line of what's happening. */
export const WorkshopStatus: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const p = b.progress;
  if (!p) return null;
  const alert = p.stage === 'awaitingApproval' || p.stage === 'disputed';
  return (
    <View style={styles.status}>
      <StepProgress steps={WORKSHOP_STEP_LABELS} current={workshopStepIndex(p.stage)} alert={alert} />
      <Text style={[styles.statusText, alert && { color: Colors.warning }]}>{WORKSHOP_STAGE_TEXT[p.stage]}</Text>
    </View>
  );
};

type SheetId = 'checkIn' | 'diagnosis' | 'handover' | 'close' | null;

/**
 * The same controls on every upcoming booking: call the customer, then either
 * directions (garage goes to them) or send the garage's location (they come in),
 * then the next workshop step — receive, diagnose, hand over, close with the owner's code.
 */
export const BookingActions: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { profile, shareLocation, receiveVehicle, sendDiagnosis, markReadyForHandover, startRework, closeWorkshopJob } = useGarage();
  const { requestFor } = useParts();
  const mode = serviceMode(b);
  const [sheet, setSheet] = useState<SheetId>(null);
  const close = () => setSheet(null);
  const p = b.progress;
  const subject = { title: b.title, vehicle: `${b.vehicle.name} · ${b.vehicle.plate}` };
  const parts = requestFor(b.id);
  const partsPending = !!parts && parts.status !== 'received';

  if (b.status === 'completed') {
    return <ActionButton label="පාරිභෝගිකයා අමතන්න" icon="📞" variant="ghost" compact onPress={() => callCustomer(b.customer.phone)} />;
  }

  const lines = p ? approvedLines(p) : [];
  const bill = p ? workshopBill(b.price, p, parts?.status === 'received' ? b.partsCost : undefined) : { labour: b.price, parts: 0, total: b.price };

  const step = () => {
    if (!p) return null;
    switch (p.stage) {
      case 'booked':
        return <ActionButton label={mode === 'doorstep' ? 'අයිතිකරු වෙත පැමිණියා' : 'වාහනය ලැබුණා'} icon="🚗" variant="primary" compact onPress={() => setSheet('checkIn')} />;
      case 'received':
      case 'diagnosing':
        return <ActionButton label="පරීක්ෂා වාර්තාව ලියන්න" icon="🔍" variant="primary" compact onPress={() => setSheet('diagnosis')} />;
      case 'awaitingApproval':
        return <Text style={styles.waiting}>⏳ {b.customer.name} වාර්තාව කියවමින් — අනුමත කළ පේළි පමණක් අය කෙරේ.</Text>;
      case 'repairing':
        return <ActionButton label="භාරදීමට සූදානම්" icon="✓" variant="success" compact onPress={() => setSheet('handover')} />;
      case 'readyForHandover':
        return <ActionButton label="අයිතිකරුගේ කේතයෙන් අවසන් කරන්න" icon="🔳" variant="success" compact onPress={() => setSheet('close')} />;
      case 'disputed':
        return (
          <View style={styles.dispute}>
            <Text style={styles.disputeTitle}>⚠️ {b.customer.name}: “{p.dispute?.text}”</Text>
            <ActionButton label="නැවත පරීක්ෂා කර හදන්න" icon="🔧" variant="primary" compact onPress={() => startRework(b.id)} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => callCustomer(b.customer.phone)} />
        </View>
        <View style={styles.flex1}>
          {mode === 'walkin' ? (
            <ActionButton
              label="ස්ථානය යවන්න"
              icon="📍"
              variant="ghost"
              compact
              onPress={() => {
                sendGarageLocation(profile, b, `${formatDate(b.scheduledAt)} · ${formatTime(b.scheduledAt)}`);
                shareLocation(b.id);
              }}
            />
          ) : (
            <ActionButton label="දිශාවන්" icon="🗺️" variant="ghost" compact onPress={() => openDirections(b, profile)} />
          )}
        </View>
      </View>
      {p?.dispute?.status === 'rework' && p.stage === 'repairing' && <Text style={styles.waiting}>🔧 නැවත හදමින්: “{p.dispute.text}”</Text>}
      {step()}

      {p && (
        <>
          <CheckInSheet visible={sheet === 'checkIn'} onClose={close} overlay={<Toast topOffset={40} />} subject={subject} doorstep={b.doorstep} samplePhotos={JOB_PHOTOS} onConfirm={(photos) => receiveVehicle(b.id, photos)} />
          <DiagnosisSheet
            visible={sheet === 'diagnosis'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={b.price}
            ownerPartType={b.job?.sparePart}
            priceFor={partMarketPrice}
            samplePhotos={JOB_PHOTOS}
            onSend={(r) => sendDiagnosis(b.id, r)}
          />
          <HandoverSheet
            visible={sheet === 'handover'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            lines={lines}
            bill={bill}
            beforePhotos={p.checkInPhotos}
            samplePhotos={JOB_PHOTOS}
            partsPending={partsPending}
            onSubmit={(r) => markReadyForHandover(b.id, r)}
          />
          <CloseJobSheet
            visible={sheet === 'close'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            expectedCode={p.closeCode}
            total={p.handover?.bill.total ?? bill.total}
            showSimulatedCode
            onConfirmed={() => closeWorkshopJob(b.id)}
          />
        </>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    note: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 2 },
    noteDoorstep: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.4)' },
    noteWalkin: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)' },
    noteRoadside: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.35)' },
    noteTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 16 },
    status: { gap: 4 },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    waiting: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    dispute: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    disputeTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 17 },
    noteSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
