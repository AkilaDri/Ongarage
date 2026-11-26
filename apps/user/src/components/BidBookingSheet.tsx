import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryInfo, Colors, FONTS, getThemeMode, LEVELS, MoneyText, themedStyles, type PickedLocation } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { outline, pageBg } from '../utils/material';
import { BookingSentBox } from './DirectBookingSheet';
import { BookingShell } from './BookingShell';
import { BookingSummaryCard } from './BookingSummaryCard';
import { TrackStep } from './TrackStep';
import { sparePartLabel } from '../constants/labels';
import { SOSMapPickerScreen } from '../screens/SOSMapPickerScreen';
import { slotIsPast, slotTime } from './SlotPicker';
import { DayStep, TimeStep, dayLabel } from './BidBookingSteps';
import { GarageHistoryTag } from './GarageHistory';
import { FlowButton } from './FlowButton';
import { garageForBid } from './GarageReviewsSheet';
import { GARAGE_COVERS } from '../constants/home';
import { useBids } from '../context/BidsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;
// Three steps, as in the garage booking: the day and time together, how the job is followed, then a check; where the work is done was already decided when the job was posted, so it is not asked again.
const PICK_STEPS = ['දිනය සහ වේලාව', 'හඹා යාම', 'පරීක්ෂා කර යවන්න'] as const;
type Phase = 'when' | 'track' | 'review';
const PHASES: Phase[] = ['when', 'track', 'review'];

/**
 * After the owner accepts a quote: book a time with that garage. The price is agreed, so the owner only picks a day and a time; the garage
 * confirms it or proposes another (the same rules as a direct booking). What the sheet shows follows the booking's status:
 * choosing (the picker), requested (waiting for the garage), proposed (the garage's other time) and confirmed.
 */
export const BidBookingSheet: React.FC<{ jobId: string | null; onClose: () => void; onViewActivity: () => void }> = ({ jobId, onClose, onViewActivity }) => {
  const { jobs, requestBidSlot, acceptSlotProposal, declineSlotProposal } = useBids();
  const { findVehicle } = useVehicles();
  const job = jobs.find((j) => j.id === jobId);
  const bid = job?.bids.find((b) => b.id === job.acceptedBidId);
  const booking = job?.booking;
  // Nothing is preselected: the owner picks the day, then the time.
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('when');
  const [doorstep, setDoorstep] = useState(false);
  // Live tracking is on unless the owner turns it off, as in the garage booking.
  const [liveTrack, setLiveTrack] = useState(true);
  // True after a summary line was tapped: that step's button goes straight back to the summary.
  const [editing, setEditing] = useState(false);
  // Where the car is, when the garage comes to the owner (picked on a map).
  const [homeLoc, setHomeLoc] = useState<PickedLocation | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [sent, setSent] = useState(false);

  // A new job starts the picker again.
  useEffect(() => {
    setDay(null);
    setHour(null);
    setPhase('when');
    setDoorstep(!!job?.doorstep);
    setLiveTrack(true);
    setEditing(false);
    setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // The garage could not take the time and the owner asked for another: the picker starts again, from the day.
  const bookingStatus = booking?.status;
  const bookingAttempts = booking?.attempts ?? 0;
  useEffect(() => {
    if (bookingStatus !== 'choosing' || bookingAttempts === 0) return;
    setDay(null);
    setHour(null);
    setPhase('when');
    setSent(false);
  }, [bookingStatus, bookingAttempts]);

  const ready = !!job && !!bid && !!booking;
  const leftMs = booking ? booking.chooseBy - Date.now() : 0;
  const preferredAt = slotTime(day ?? 1, hour ?? 10);
  const past = day === null || hour === null || slotIsPast(preferredAt);
  const when = (t: number) => `${formatDate(t)} ${formatTime(t)}`;
  const choosing = booking?.status === 'choosing';
  const phaseIndex = PHASES.indexOf(phase);
  const step = choosing ? phaseIndex + 1 : 0;
  const statusLabel = booking?.status === 'confirmed' ? 'වෙන්කිරීම තහවුරුයි' : 'ගරාජයේ පිළිතුර';
  // Choosing a day again after a time was picked clears a time that is no longer possible.
  const pickDay = (d: number) => {
    setDay(d);
    if (hour !== null && slotIsPast(slotTime(d, hour))) setHour(null);
  };

  const deadlineChip = (
    <View style={[styles.deadline, leftMs < HOUR && styles.deadlineRed]} accessibilityLabel="Time left to choose">
                    <Text style={[styles.deadlineText, leftMs < HOUR && styles.deadlineTextRed]}>{leftMs <= 0 ? '⏱ කාලය ඉක්මවා ඇත' : `⏱️ ${leftLabel(leftMs)} ඉතිරියි`}</Text>
                  </View>
  );

  const backToSummary = () => {
    setEditing(false);
    setPhase('review');
  };
  const afterWhen = () => (editing ? backToSummary() : setPhase('track'));
  const editStep = (to: Phase) => {
    setEditing(true);
    setPhase(to);
  };

  let footer: React.ReactNode = null;
  if (ready && booking) {
    if (booking.status === 'choosing') {
      if (phase === 'when')
        footer = <FlowButton label={day === null ? 'දිනයක් තෝරන්න' : past ? 'වේලාවක් තෝරන්න' : editing ? 'සාරාංශයට ආපසු ›' : 'ඊළඟ ›'} variant="primary" disabled={past} onPress={afterWhen} />;
      else if (phase === 'track')
        footer = <FlowButton label={editing ? 'සාරාංශයට ආපසු ›' : 'ඊළඟ ›'} variant="primary" onPress={backToSummary} />;
      else
        footer = (
            <FlowButton
              label="වේලාව ඉල්ලන්න"
              icon="📅"
              variant="primary"
              disabled={past}
              onPress={() => {
                requestBidSlot(job.id, { preferredAt, doorstep, liveTrack });
                setSent(true);
              }}
            />
        );
    } else if (booking.status === 'proposed') {
      footer = (
        <View style={styles.footerRow}>
          <View style={styles.flex1}>
            <FlowButton label="වෙනත් වේලාවක්" variant="ghost" onPress={() => declineSlotProposal(job.id)} />
          </View>
          <View style={styles.flex1}>
            <FlowButton
              label="පිළිගන්න"
              icon="✓"
              variant="success"
              onPress={() => {
                acceptSlotProposal(job.id);
              }}
            />
          </View>
        </View>
      );
    } else if (booking.status === 'confirmed') {
      footer = <FlowButton label="ක්‍රියාකාරකම් බලන්න" icon="⏱️" variant="success" onPress={onViewActivity} />;
    } else {
      footer = <FlowButton label="වසන්න" variant="ghost" onPress={onClose} />;
    }
  }

  return (
    <BookingShell
      visible={ready}
      title="Ongarage වෙන්කිරීම"
      icon="📅"
      steps={PICK_STEPS}
      step={choosing ? phaseIndex : PICK_STEPS.length - 1}
      onStep={choosing ? (i) => setPhase(PHASES[i]) : undefined}
      onBack={choosing && phaseIndex > 0 ? (editing ? backToSummary : () => setPhase(PHASES[phaseIndex - 1])) : undefined}
      onClose={onClose}
      footer={footer}
      overlay={
        <BookingSentBox
          visible={sent}
          garageName={bid?.garageName ?? ''}
          when={when(preferredAt)}
          onViewActivity={() => {
            setSent(false);
            onViewActivity();
          }}
          onClose={() => {
            setSent(false);
            onClose();
          }}
        />
      }
    >
          <View style={styles.body}>
            {ready && job && bid && booking && (
              <>
                {/* The garage and the agreed price: nothing to ask again, the owner only picks a time (not on the summary step). */}
                {!(choosing && phase === 'review') && (
                  <View style={styles.garage}>
                    <View style={styles.garageTop}>
                      <Image source={GARAGE_COVERS[garageForBid(bid).id]} style={styles.avatar} accessibilityLabel={`${bid.garageName} photo`} />
                      <View style={styles.flex1}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.name, styles.nameText]}>
                            {bid.garageName}
                            {bid.level ? <Text>{` ${LEVELS.find((l) => l.id === bid.level)?.icon}`}</Text> : null}
                          </Text>
                          <GarageHistoryTag garage={garageForBid(bid)} part="tag" />
                        </View>
                        <Text style={styles.rating} numberOfLines={1}>
                          <Text style={styles.stars}>{'★'.repeat(Math.round(bid.rating))}{'☆'.repeat(5 - Math.round(bid.rating))}</Text> {bid.rating.toFixed(1)} ({bid.reviews}) · {categoryInfo(job.categoryId).name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>එකඟ වූ මිල</Text>
                      <MoneyText icon style={styles.priceValue}>{money(bid.price)}</MoneyText>
                    </View>
                  </View>
                )}
                {/* The real limit, up front: the bid reopens if no time is chosen by then (amber, red under an hour). */}
                {booking.status === 'choosing' && (
                  <>
                    {!!booking.attempts && <Text style={styles.warn}>පෙර වේලාව ගැළපුණේ නැත. වෙනත් වේලාවක් තෝරන්න.</Text>}
                    {phase === 'when' && (
                      <>
                        <DayStep
                          day={day}
                          onDay={pickDay}
                          headerRight={booking.status === 'choosing' ? deadlineChip : undefined}
                          onSoonest={(d, h) => {
                            setDay(d);
                            setHour(h);
                            afterWhen();
                          }}
                        />
                      </>
                    )}
                    {/* As in the garage booking: once a day is picked, its times show under it on the same page. */}
                    {phase === 'when' && day !== null && <TimeStep day={day} hour={hour} onHour={setHour} />}
                    {phase === 'when' && doorstep && day !== null && (
                      <Pressable onPress={() => setMapOpen(true)} accessibilityLabel="Pick my location on the map" style={{ marginTop: 10, paddingHorizontal: 14, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#1e3a8a', backgroundColor: '#eff6ff' }}>
                        <Text style={{ fontFamily: FONTS.bodyBold, color: '#1e3a8a', fontSize: 14 }}>📍 {homeLoc ? homeLoc.address : 'ඔබේ ස්ථානය map එකෙන් තෝරන්න'}</Text>
                      </Pressable>
                    )}
                    {phase === 'track' && <TrackStep live={liveTrack} onLive={setLiveTrack} />}
                    {phase === 'review' && day !== null && hour !== null && (
                      <>
                        {past && <Text style={styles.warn}>මෙම වේලාව ඉක්මවා ඇත. දිනය හෝ වේලාව වෙනස් කරන්න.</Text>}
                        <BookingSummaryCard
                          garage={garageForBid(bid)}
                          categoryId={job.categoryId}
                          title={categoryInfo(job.categoryId).name}
                          description={[job.fitting?.partName ? `🔩 ${job.fitting.partName}` : '', job.description?.trim() ?? ''].filter(Boolean).join(' · ')}
                          vehicle={findVehicle(job.vehicleId)}
                          price={money(bid.price)}
                          lines={[
                            { label: 'date and time', icon: '🗓', text: `${dayLabel(day)} · ${formatTime(preferredAt)}`, onChange: () => editStep('when') },
                            // The part type and the place were chosen when the job was posted: shown, not changed here.
                            { label: 'part type', icon: '🔧', text: sparePartLabel(job.sparePart) },
                            { label: 'place', icon: doorstep ? '🚛' : '🏠', text: doorstep ? 'ගරාජය මා වෙත පැමිණේ' : 'මම වාහනය ගරාජයට ගෙන යමි' },
                            ...(doorstep ? [{ label: 'my location', icon: '📍', text: homeLoc ? homeLoc.address : 'තවම තෝරා නැත', onChange: () => editStep('when') }] : []),
                            { label: 'tracking', icon: liveTrack ? '📡' : '📷', text: liveTrack ? 'Live track (හැම පියවරක්ම)' : 'Live නැත (ඡායාරූප + අවසානය)', onChange: () => editStep('track') },
                            ...((job.photos?.length ?? 0) + (job.voiceNotes?.length ?? 0) > 0 ? [{ label: 'attachments', icon: '📎', text: [job.photos?.length ? `ඡායාරූප ${job.photos.length}` : '', job.voiceNotes?.length ? `හඬ සටහන් ${job.voiceNotes.length}` : ''].filter(Boolean).join(' · ') }] : []),
                          ]}
                          note="ගරාජය පැය 2ක් ඇතුළත පිළිතුරු දෙයි. ඔබ ඉල්ලූ වේලාව නොගැළපුණොත් වෙනත් වේලාවක් යෝජනා කරයි."
                        />
                      </>
                    )}
                  </>
                )}

                {booking.status === 'requested' && !!booking.preferredAt && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>⏳ ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්</Text>
                    <Text style={styles.cardLine}>ඔබ ඉල්ලූ වේලාව: {when(booking.preferredAt)}</Text>
                    <Text style={styles.hint}>{bid.garageName} පැය 2ක් ඇතුළත පිළිතුරු දෙයි. පිළිතුර “ක්‍රියාකාරකම්” හි පෙන්වයි.</Text>
                  </View>
                )}

                {booking.status === 'proposed' && !!booking.proposal && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>🕘 ගරාජය වෙනත් වේලාවක් යෝජනා කළා</Text>
                    <Text style={styles.cardLine}>{when(booking.proposal.at)}</Text>
                    {!!booking.proposal.note && <Text style={styles.hint}>{booking.proposal.note}</Text>}
                  </View>
                )}

                {booking.status === 'confirmed' && !!booking.scheduledAt && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>✅ වෙන්කිරීම තහවුරුයි</Text>
                    <Text style={styles.cardLine}>{when(booking.scheduledAt)}</Text>
                    <Text style={styles.hint}>{doorstepText(booking.doorstep ?? job.doorstep)}</Text>
                  </View>
                )}
              </>
            )}
          </View>
      <Modal visible={mapOpen} animationType="fade" statusBarTranslucent onRequestClose={() => setMapOpen(false)}>
        {mapOpen && (
          <SOSMapPickerScreen
            initialLocation={homeLoc}
            title="ඔබ සිටින ස්ථානය"
            pinLabel="මෙතන"
            confirmLabel="ස්ථානය තහවුරු කරන්න"
            accent={{ color: '#1e3a8a', stops: [{ offset: '0', color: '#2748a8' }, { offset: '1', color: '#1e3a8a' }] }}
            onConfirm={(loc) => { setHomeLoc(loc); setMapOpen(false); }}
            onClose={() => setMapOpen(false)}
          />
        )}
      </Modal>
    </BookingShell>
  );
};

const ReviewRow: React.FC<{ label: string; value: string; sub?: string; onChange?: () => void; last?: boolean }> = ({ label, value, sub, onChange, last }) => (
  <View style={[styles.reviewRow, !last && styles.reviewRowLine]}>
    <View style={styles.flex1}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
      {!!sub && <Text style={styles.reviewSub}>{sub}</Text>}
    </View>
    {!!onChange && (
      <Pressable onPress={onChange} hitSlop={8} style={styles.reviewChange} accessibilityRole="button" accessibilityLabel={`Change ${label}`}>
        <Text style={styles.reviewChangeText}>වෙනස් කරන්න</Text>
      </Pressable>
    )}
  </View>
);


/** The same wording as the Bids card's countdown: hours and minutes left. */
const leftLabel = (ms: number) => {
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / 60000);
  return h > 0 ? `පැය ${h} ක් ${m} මිනි.` : `මිනි. ${m}`;
};

const doorstepText = (doorstep: boolean) => (doorstep ? 'නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ.' : 'නියමිත වේලාවට වාහනය ගරාජයට ගෙන යන්න.');

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    garage: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    name: { fontSize: 15, lineHeight: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.subtleFill },
    nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    nameText: { flexShrink: 1 },
    rating: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyMedium, color: Colors.textMain, marginTop: 1 },
    stars: { color: '#f5a623', letterSpacing: 1 },
    garageTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderColor },
    priceLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceValue: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.success },
    deadline: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.16)' },
    deadlineRed: { backgroundColor: 'rgba(239,68,68,0.14)' },
    deadlineText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    deadlineTextRed: { color: '#b91c1c' },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    container: { flex: 1, backgroundColor: pageBg() },
    header: { flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingHorizontal: 16, paddingVertical: 9, overflow: 'hidden', paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    topRoundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
    topRoundText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    topSlot: { width: 46 },
    topPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, marginLeft: 4, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    topPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe', justifyContent: 'center', alignItems: 'center' },
    topPillEmoji: { fontSize: 18 },
    topPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    topPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    topPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1d4ed8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#dbeafe' },
    topPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    postSheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    progressWrap: { gap: 6, paddingHorizontal: 8, marginTop: 14, marginBottom: 8 },
    progressRow: { flexDirection: 'row', gap: 6 },
    progressSeg: { flex: 1, paddingVertical: 6 },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    body: { paddingHorizontal: 8, paddingTop: 10, gap: 12, paddingBottom: 24 },
    footer: { paddingHorizontal: 8, paddingBottom: 12, paddingTop: 10, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: outline(), shadowColor: '#3c4043', shadowOffset: { width: 0, height: -1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.12, shadowRadius: 3, elevation: 4 },
    question: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    headTop: { marginTop: 12, marginBottom: 2 },
    review: { borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#f1f3f4', paddingHorizontal: 16, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    reviewRowLine: { borderBottomWidth: 1, borderBottomColor: Colors.subtleBorder },
    reviewLabel: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    reviewValue: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 2 },
    reviewSub: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.success, marginTop: 2 },
    reviewChange: { minHeight: 44, justifyContent: 'center' },
    reviewChangeText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    sendBox: { gap: 8 },
    sendNote: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, marginTop: 8 },
    warn: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 18, marginTop: 8 },
    card: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    cardTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardLine: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    footerRow: { flexDirection: 'row', gap: 10 },
  })
);
