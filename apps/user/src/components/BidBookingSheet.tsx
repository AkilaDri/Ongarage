import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryInfo, Colors, FONTS, getThemeMode, LEVELS, MoneyText, themedStyles } from '@ongarage/shared';
import { outline, pageBg } from '../utils/material';
import { BookingSentBox } from './DirectBookingSheet';
import { slotIsPast, slotTime } from './SlotPicker';
import { DayStep, TimeStep, dayLabel } from './BidBookingSteps';
import { GarageHistoryTag } from './GarageHistory';
import { FlowButton } from './FlowButton';
import { garageForBid } from './GarageReviewsSheet';
import { GARAGE_COVERS } from '../constants/home';
import { useBids } from '../context/BidsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;
// Picking a time is two questions and a check, one per step (counted like the quote request's 1/3 … 3/3); where the work is done was already decided when the job was posted, so it is not asked again. After it is sent the sheet only shows where the booking stands.
const PICK_STEPS = ['දිනය', 'වේලාව', 'පරීක්ෂා කර යවන්න'] as const;
type Phase = 'day' | 'time' | 'review';
const PHASES: Phase[] = ['day', 'time', 'review'];

/**
 * After the owner accepts a quote: book a time with that garage. The price is agreed, so the owner only picks a day and a time; the garage
 * confirms it or proposes another (the same rules as a direct booking). What the sheet shows follows the booking's status:
 * choosing (the picker), requested (waiting for the garage), proposed (the garage's other time) and confirmed.
 */
export const BidBookingSheet: React.FC<{ jobId: string | null; onClose: () => void; onViewActivity: () => void }> = ({ jobId, onClose, onViewActivity }) => {
  const { jobs, requestBidSlot, acceptSlotProposal, declineSlotProposal } = useBids();
  const job = jobs.find((j) => j.id === jobId);
  const bid = job?.bids.find((b) => b.id === job.acceptedBidId);
  const booking = job?.booking;
  // Nothing is preselected: the owner picks the day, then the time.
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('day');
  const [doorstep, setDoorstep] = useState(false);
  const [sent, setSent] = useState(false);

  // A new job starts the picker again.
  useEffect(() => {
    setDay(null);
    setHour(null);
    setPhase('day');
    setDoorstep(!!job?.doorstep);
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
    setPhase('day');
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

  let footer: React.ReactNode = null;
  if (ready && booking) {
    if (booking.status === 'choosing') {
      if (phase === 'day')
        footer = (
          <FlowButton label={day === null ? 'දිනයක් තෝරන්න' : 'ඊළඟ ›'} variant="primary" disabled={day === null} onPress={() => setPhase('time')} />
        );
      else if (phase === 'time')
        footer = <FlowButton label={hour === null ? 'වේලාවක් තෝරන්න' : 'ඊළඟ ›'} variant="primary" disabled={hour === null || past} onPress={() => setPhase('review')} />;
      else
        footer = (
          <View style={styles.sendBox}>
            <FlowButton
              label="වේලාව ඉල්ලන්න"
              icon="📅"
              variant="primary"
              disabled={past}
              onPress={() => {
                requestBidSlot(job.id, { preferredAt, doorstep });
                setSent(true);
              }}
            />
            <Text style={styles.sendNote}>ගරාජය පැය 2ක් ඇතුළත පිළිතුරු දෙයි. ඔබ ඉල්ලූ වේලාව නොගැළපුණොත් වෙනත් වේලාවක් යෝජනා කරයි.</Text>
          </View>
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
    <Modal visible={ready} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* The same top bar as the quote request: a round close button and a pill with the title, the step counter and the step's name. */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Pressable style={styles.topRoundBtn} onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.topRoundText}>✕</Text>
            </Pressable>
            <View style={styles.topPill}>
              <View style={styles.topPillIcon}>
                <Text style={styles.topPillEmoji}>📅</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.topPillTitle} numberOfLines={1}>Ongarage වෙන්කිරීම</Text>
                <View style={styles.topPillRow}>
                  <Text style={styles.topPillCount}>{choosing ? `${step}/${PHASES.length}` : '✓'}</Text>
                  <Text style={styles.topPillSub} numberOfLines={1}>{choosing ? PICK_STEPS[phaseIndex] : statusLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.topSlot} />
          </View>
        </View>

        <View style={styles.postSheet}>
          <View style={styles.progressWrap}>
            <View style={styles.progressRow} accessibilityLabel={choosing ? `Step ${step} of ${PHASES.length}` : statusLabel}>
              {PHASES.map((ph, i) => (
                <Pressable key={ph} style={styles.progressSeg} disabled={!choosing || i >= phaseIndex} onPress={() => setPhase(ph)} accessibilityLabel={PICK_STEPS[i]}>
                  <View style={[styles.progressBar, (!choosing || i <= phaseIndex) && styles.progressBarOn]} />
                </Pressable>
              ))}
            </View>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {ready && job && bid && booking && (
              <>
                {/* The garage and the agreed price: nothing to ask again, the owner only picks a time. */}
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
                {/* The real limit, up front: the bid reopens if no time is chosen by then (amber, red under an hour). */}
                {booking.status === 'choosing' && (
                  <>
                    {!!booking.attempts && <Text style={styles.warn}>පෙර වේලාව ගැළපුණේ නැත. වෙනත් වේලාවක් තෝරන්න.</Text>}
                    {phase === 'day' && (
                      <>
                        <DayStep
                          day={day}
                          onDay={pickDay}
                          headerRight={booking.status === 'choosing' ? deadlineChip : undefined}
                          onSoonest={(d, h) => {
                            setDay(d);
                            setHour(h);
                            setPhase('review');
                          }}
                        />
                      </>
                    )}
                    {phase === 'time' && day !== null && <TimeStep day={day} hour={hour} onHour={setHour} onChangeDay={() => setPhase('day')} headerRight={deadlineChip} />}
                    {phase === 'review' && day !== null && hour !== null && (
                      <>
                        <Text style={[styles.question, styles.headTop]}>පරීක්ෂා කර යවන්න</Text>
                        {past && <Text style={styles.warn}>මෙම වේලාව ඉක්මවා ඇත. දිනය හෝ වේලාව වෙනස් කරන්න.</Text>}
                        <View style={styles.review}>
                          <ReviewRow label="ගරාජය" value={bid.garageName} sub={`එකඟ වූ මිල ${money(bid.price)}`} />
                          <ReviewRow label="දිනය සහ වේලාව" value={`${dayLabel(day)} · ${formatTime(preferredAt)}`} onChange={() => setPhase('day')} />
                          <ReviewRow label="ස්ථානය" value={doorstep ? 'ගරාජය මා වෙත පැමිණේ' : 'මම වාහනය ගරාජයට ගෙන යමි'} last />
                        </View>
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
          </ScrollView>
        </View>

        <View style={styles.footer}>{footer}</View>

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
      </SafeAreaView>
    </Modal>
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
    topPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
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
    review: { borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', paddingHorizontal: 16, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
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
