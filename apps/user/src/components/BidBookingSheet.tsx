import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, FONTS, GlassIcon, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { BookingSentBox } from './DirectBookingSheet';
import { SlotPicker, slotIsPast, slotTime } from './SlotPicker';
import { useBids } from '../context/BidsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;
const STEPS = ['ලංසුව පිළිගත්තා', 'වේලාව තෝරන්න', 'ගරාජය තහවුරු කරයි'];

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
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(10);
  const [doorstep, setDoorstep] = useState(false);
  const [sent, setSent] = useState(false);

  // A new job starts the picker again.
  useEffect(() => {
    setDay(1);
    setHour(10);
    setDoorstep(!!job?.doorstep);
    setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const ready = !!job && !!bid && !!booking;
  const preferredAt = slotTime(day, hour);
  const past = slotIsPast(preferredAt);
  const when = (t: number) => `${formatDate(t)} ${formatTime(t)}`;
  const step = booking?.status === 'confirmed' ? 3 : booking?.status === 'choosing' ? 1 : 2;

  let footer: React.ReactNode = null;
  if (ready && booking) {
    if (booking.status === 'choosing') {
      footer = (
        <ActionButton
          label={`වේලාව ඉල්ලන්න · ${when(preferredAt)}`}
          icon="📅"
          variant="primary"
          disabled={past}
          onPress={() => {
            requestBidSlot(job.id, { preferredAt, doorstep });
            setSent(true);
          }}
        />
      );
    } else if (booking.status === 'proposed') {
      footer = (
        <View style={styles.footerRow}>
          <View style={styles.flex1}>
            <ActionButton label="වෙනත් වේලාවක්" variant="ghost" onPress={() => declineSlotProposal(job.id)} />
          </View>
          <View style={styles.flex1}>
            <ActionButton
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
      footer = <ActionButton label="ක්‍රියාකාරකම් බලන්න" icon="⏱️" variant="success" onPress={onViewActivity} />;
    } else {
      footer = <ActionButton label="වසන්න" variant="ghost" onPress={onClose} />;
    }
  }

  return (
    <Sheet
      visible={ready}
      fullScreen
      noDividers
      title="වේලාවක් වෙන් කරන්න"
      onClose={onClose}
      footer={footer}
      overlayExtra={
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
      {ready && job && bid && booking && (
        <>
          {/* The garage and the agreed price: nothing to ask again, the owner only picks a time. */}
          <View style={styles.garage}>
            <GlassIcon emoji="🛠️" small />
            <View style={styles.flex1}>
              <Text style={styles.name} numberOfLines={1}>{bid.garageName}</Text>
              <Text style={styles.sub} numberOfLines={1}>{categoryInfo(job.categoryId).name} · එකඟ වූ මිල {money(bid.price)}</Text>
            </View>
          </View>

          {/* Where the owner is in the booking. */}
          <View style={styles.steps} accessibilityLabel={`Step ${step} of 3`}>
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step || (n === 3 && step === 3);
              const on = n === step;
              return (
                <View key={label} style={styles.step}>
                  <View style={[styles.stepBar, (done || on) && styles.stepBarOn]} />
                  <Text style={[styles.stepText, on && styles.stepTextOn]} numberOfLines={2}>{label}</Text>
                </View>
              );
            })}
          </View>

          {booking.status === 'choosing' && (
            <>
              <Text style={styles.hint}>මිල තහවුරුයි. පැය {Math.max(1, Math.ceil((booking.chooseBy - Date.now()) / HOUR))} ඇතුළත වේලාවක් තෝරන්න; නැතිනම් ලංසුව නැවත විවෘත වේ.</Text>
              {!!booking.attempts && <Text style={styles.warn}>පෙර වේලාව ගැළපුණේ නැත. වෙනත් වේලාවක් තෝරන්න.</Text>}
              <SlotPicker day={day} hour={hour} onDay={setDay} onHour={setHour} doorstep={doorstep} onDoorstep={setDoorstep} />
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
    </Sheet>
  );
};

const doorstepText = (doorstep: boolean) => (doorstep ? 'නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ.' : 'නියමිත වේලාවට වාහනය ගරාජයට ගෙන යන්න.');

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    garage: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    name: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    steps: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 6 },
    step: { flex: 1, gap: 6 },
    stepBar: { height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    stepBarOn: { backgroundColor: '#1e3a8a' },
    stepText: { fontSize: 11, lineHeight: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepTextOn: { fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, marginTop: 8 },
    warn: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 18, marginTop: 8 },
    card: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    cardTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardLine: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    footerRow: { flexDirection: 'row', gap: 10 },
  })
);
