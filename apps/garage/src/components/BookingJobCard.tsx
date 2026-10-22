import { CustomerHistoryTag } from './CustomerHistory';
import { VehicleIcon3D, VehicleLabel } from '@ongarage/shared';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  approvedLines,
  Colors,
  distanceKm,
  FONTS,
  getThemeMode,
  GoogleMap,
  LkPlate,
  PhotoStrip,
  themedStyles,
  vehicleIcon,
  VoiceNotePlayer,
  WORKSHOP_STAGE_TEXT,
  workshopBill,
  zoomToFit,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { callCustomer, serviceMode } from '../utils/contact';
import { formatDate, formatTime, money } from '../utils/format';
import { JobCardUpdates } from './JobCardUpdates';
import { ChatButton } from './ChatButton';
import { useChat } from '../context/ChatContext';
import { NoPhotoAnimation } from './NoPhotoAnimation';
import { ServiceModeNote } from './BookingActions';
import { WorkshopPanel } from './WorkshopPanel';
import type { Booking, JobDetails } from '../types';

const BOOKING_STATUS: Record<Booking['status'], string> = { scheduled: 'නියමිතයි', inProgress: 'වැඩ කරමින්', completed: 'සම්පූර්ණයි', cancelled: 'අවලංගුයි' };
const SOURCE: Record<Booking['source'], string> = { sos: 'SOS', direct: 'Direct booking', bid: 'ලංසු' };
const MAP_H = 110;

const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');
const hairline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed');

/**
 * A booked job laid out like a workshop job card: the card number and status, the vehicle and
 * the customer, the complaint, the work list with its bill, the progress, the garage's own
 * notes and the place.
 */
export const BookingJobCard: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { profile } = useGarage();
  const { logCall } = useChat();
  const p = b.progress;
  // Older bookings (and SOS jobs) may not carry the owner's original post.
  const job: JobDetails = b.job ?? {
    id: b.id,
    categoryId: '',
    description: b.title + ' — ' + b.customer.name + ' ගේ ' + b.vehicle.name,
    customer: b.customer,
    vehicle: b.vehicle,
    sparePart: 'GarageChoice',
    doorstep: b.doorstep,
    location: { address: b.address, coords: b.coords },
    distanceKm: Number(distanceKm(profile.coords, b.coords).toFixed(1)),
  };
  const lines = p ? approvedLines(p) : [];
  const bill = p ? workshopBill(b.price, p, b.partsCost) : { labour: b.price, parts: b.partsCost ?? 0, total: b.price + (b.partsCost ?? 0), ownerParts: 0 };
  const photos = job.photos ?? [];
  const voices = job.voiceNotes ?? [];
  const walkIn = serviceMode(b) === 'walkin';
  const mid = {
    latitude: (profile.coords.latitude + job.location.coords.latitude) / 2,
    longitude: (profile.coords.longitude + job.location.coords.longitude) / 2,
  };
  const stage = p ? WORKSHOP_STAGE_TEXT[p.stage] : BOOKING_STATUS[b.status];

  return (
    <>
      {/* Card number, status and the vehicle */}
      <View style={styles.sheet}>
        <View style={styles.topRow}>
          <Text style={styles.cardLabel}>JOB CARD · #{b.id.slice(-6).toUpperCase()}</Text>
          <View style={styles.status}>
            <Text style={styles.statusText}>{BOOKING_STATUS[b.status]}</Text>
          </View>
        </View>
        {/* The OnChat icon (the Home page's blue bubble) stands at the right end of the number plate's line. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LkPlate plate={b.vehicle.plate} stacked={b.vehicle.type === 'Motorbike'} />
          {/* At the right end: the call icon, and the OnChat icon right after it. */}
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' }}
              onPress={() => {
                callCustomer(b.customer.phone);
                logCall(b.id);
              }}
              accessibilityLabel="Call customer"
            >
              <Text style={{ fontSize: 20 }}>📞</Text>
            </Pressable>
            <ChatButton solid size={54} booking={b} />
          </View>
        </View>
        <VehicleLabel type={b.vehicle.type} style={styles.vehicle}>{b.vehicle.name} · {b.vehicle.type}
        </VehicleLabel>
        <View style={styles.rule} />
        <Field label="සේවාව" value={b.icon + ' ' + b.title} />
        <Field label="මූලාශ්‍රය" value={SOURCE[b.source]} />
        <Field label="වෙන් කළ වේලාව" value={formatDate(b.scheduledAt) + ' · ' + formatTime(b.scheduledAt)} />
        <Field label="තත්ත්වය" value={stage} />
        <View style={styles.rule} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>පාරිභෝගිකයා</Text>
          <View style={styles.nameWithTag}>
            <Text style={styles.fieldValue}>{b.customer.name}</Text>
            <CustomerHistoryTag customer={b.customer} />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>දුරකථනය</Text>
          <Text style={styles.fieldValue}>{b.customer.phone}</Text>
        </View>
      </View>

      {/* The vehicle, as the owner registered it in their app */}
      <Text style={styles.section}>වාහන විස්තර</Text>
      <View style={styles.sheet}>
        <Field label="වර්ගය" value={b.vehicle.type} />
        <Field label="Make" value={b.vehicle.make ?? '—'} />
        <Field label="Model" value={b.vehicle.model ?? b.vehicle.name} />
        <Field label="වර්ණය" value={b.vehicle.color ?? '—'} />
        <View style={styles.rule} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ලියාපදිංචි අංකය</Text>
          <LkPlate plate={b.vehicle.registrationNo ?? b.vehicle.plate} stacked={b.vehicle.type === 'Motorbike'} small />
        </View>
        <Field label="Chassis අංකය" value={b.vehicle.chassisNo ?? '—'} />
        <Field label="Engine අංකය" value={b.vehicle.engineNo ?? '—'} />
        <Field label="රක්ෂණ අංකය" value={b.vehicle.insuranceNo ?? '—'} />
        {!b.vehicle.chassisNo && !b.vehicle.engineNo && <Text style={styles.empty}>පාරිභෝගිකයා මෙම වාහනයේ ලියාපදිංචි විස්තර ඇතුළත් කර නැත.</Text>}
      </View>

      {/* The complaint, as the owner sent it */}
      <Text style={styles.section}>පාරිභෝගික පැමිණිල්ල</Text>
      <View style={styles.sheet}>
        <Text style={styles.desc}>{job.description}</Text>
        {!!job.buddySummary && (
          <View style={styles.buddy}>
            <Text style={styles.buddyText}>🤖 Buddy: {job.buddySummary}</Text>
          </View>
        )}
        {photos.length > 0 ? <PhotoStrip photos={photos} height={84} /> : <NoPhotoAnimation emoji={b.icon} height={96} />}
        {voices.length > 0 && (
          <View style={styles.voices}>
            <Text style={styles.voiceLabel}>🎙️ Voice note ({voices.length})</Text>
            {voices.map((n, i) => (
              <VoiceNotePlayer key={n.id} note={n} index={i} compact />
            ))}
          </View>
        )}
      </View>

      {/* The work list and what the owner pays */}
      <Text style={styles.section}>වැඩ ලැයිස්තුව සහ බිල</Text>
      <View style={styles.sheet}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.flex1]}>විස්තරය</Text>
          <Text style={styles.th}>මිල</Text>
        </View>
        <View style={styles.tr}>
          <Text style={[styles.td, styles.flex1]}>🔧 {b.title} (එකඟ වූ වැඩ)</Text>
          <Text style={styles.td}>{money(b.price)}</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={styles.tr}>
            <Text style={[styles.td, styles.flex1]}>
              {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
              {l.qty > 1 ? ' × ' + l.qty : ''}
              {l.source === 'owner' ? ' (පාරිභෝගිකයා මිලදී ගනී)' : ''}
            </Text>
            <Text style={styles.td}>{money(l.price)}</Text>
          </View>
        ))}
        {!lines.length && <Text style={styles.empty}>අනුමත කළ අමතර පේළි නැත. පරීක්ෂා වාර්තාව අනුමත වූ පසු ඒවා මෙහි එකතු වේ.</Text>}
        <View style={styles.rule} />
        <View style={styles.tr}>
          <Text style={[styles.td, styles.flex1]}>වැඩ ගාස්තුව</Text>
          <Text style={styles.td}>{money(bill.labour)}</Text>
        </View>
        <View style={styles.tr}>
          <Text style={[styles.td, styles.flex1]}>කොටස් (වෙනම බිල්පත)</Text>
          <Text style={styles.td}>{money(bill.parts)}</Text>
        </View>
        <View style={styles.tr}>
          <Text style={[styles.total, styles.flex1]}>හිමිකරු ගෙවන මුළු මුදල</Text>
          <Text style={styles.total}>{money(bill.total)}</Text>
        </View>
      </View>

      {/* Progress: diagnosis, approvals, repair, handover */}
      <ServiceModeNote booking={b} />
      {p && <WorkshopPanel booking={b} />}

      {/* The garage's own details for this job */}
      <JobCardUpdates booking={b} />
      {!!b.note && <Text style={styles.empty}>📝 ඔබගේ සටහන: {b.note}</Text>}

      {/* Place */}
      <Text style={styles.section}>ස්ථානය</Text>
      <GoogleMap
        style={[styles.map, { height: MAP_H }]}
        center={mid}
        zoom={zoomToFit(job.distanceKm, mid.latitude, MAP_H)}
        fallbackColor={Colors.primary}
        renderOverlay={(project) => {
          const g = project(profile.coords);
          const c = project(job.location.coords);
          return (
            <>
              {g && (
                <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                  <View style={[styles.pin, { backgroundColor: Colors.success }]}>
                    <Text style={styles.pinEmoji}>🛠️</Text>
                  </View>
                </View>
              )}
              {c && (
                <View style={[styles.pinAnchor, { left: c.x, top: c.y }]} pointerEvents="none">
                  <View style={[styles.pin, { backgroundColor: Colors.primary }]}>
                    <VehicleIcon3D type={job.vehicle.type} size={26} />
                  </View>
                </View>
              )}
            </>
          );
        }}
      />
      <Text style={styles.empty}>
        📍 {job.location.address} · ගරාජයේ සිට කි.මී. {job.distanceKm}
      </Text>
      {walkIn && <Text style={styles.empty}>🏠 පාරිභෝගිකයා පැමිණෙන්නේ: {profile.address}</Text>}
    </>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    nameWithTag: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    sheet: {
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: outline(),
      borderRadius: 12,
      padding: 16,
      gap: 10,
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15,
      shadowRadius: 3,
      elevation: 1,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardLabel: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMuted, letterSpacing: 1 },
    status: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 6, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe' },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    vehicle: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    rule: { height: 1, backgroundColor: hairline() },
    field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fieldLabel: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, width: 112 },
    fieldValue: { flex: 1, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    callBtn: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#e6f4ea' },
    callText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 8, letterSpacing: 0.2 },
    desc: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 22 },
    buddy: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe', borderLeftWidth: 3, borderLeftColor: Colors.primary },
    buddyText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    voices: { gap: 8 },
    voiceLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19 },
    tableHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: hairline() },
    th: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    tr: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    td: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
    total: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
    map: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: outline() },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    pin: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    pinEmoji: { fontSize: 13 },
  })
);
