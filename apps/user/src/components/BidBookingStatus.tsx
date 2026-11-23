import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import type { JobBooking, RepairJob } from '@ongarage/shared';
import { formatDate, formatTime } from '../utils/format';

const when = (t: number) => `${formatDate(t)} ${formatTime(t)}`;

/** The short status of an accepted quote while its time is not yet agreed (used on the cards). `undefined` once the time is confirmed. */
export const bookingStatusText = (booking?: JobBooking): string | undefined => {
  if (!booking || booking.status === 'confirmed') return undefined;
  if (booking.status === 'choosing') return 'වේලාවක් තෝරන්න';
  if (booking.status === 'requested') return 'බලාපොරොත්තුවෙන්';
  return 'වේලාවක් යෝජනා කළා';
};

/** What an accepted quote waits for, and the button that opens the booking sheet. Shown instead of the workshop steps until the time is confirmed. */
export const BidBookingStatus: React.FC<{ job: RepairJob; onPickTime: (jobId: string) => void }> = ({ job, onPickTime }) => {
  const b = job.booking;
  if (!b || b.status === 'confirmed') return null;
  const line =
    b.status === 'choosing'
      ? 'ඔබ තවම වේලාවක් තෝරා නැත. මිල තහවුරුයි.'
      : b.status === 'requested' && b.preferredAt
        ? `${when(b.preferredAt)} සඳහා ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්.`
        : b.proposal
          ? `ගරාජය ${when(b.proposal.at)} යෝජනා කළා.`
          : 'ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්.';
  const label = b.status === 'choosing' ? '📅 වේලාව තෝරන්න' : b.status === 'proposed' ? '🕘 යෝජිත වේලාව බලන්න' : '⏳ බලන්න';
  return (
    <View style={styles.wrap} accessibilityLabel="Time of the booking">
      <Text style={styles.line}>{line}</Text>
      <Pressable style={[styles.btn, b.status === 'requested' && styles.btnQuiet]} onPress={() => onPickTime(job.id)} accessibilityRole="button" accessibilityLabel="Open the booking time">
        <Text style={[styles.btnText, b.status === 'requested' && styles.btnTextQuiet]}>{label}</Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    line: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    btn: { alignSelf: 'flex-start', paddingHorizontal: 16, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a8a' },
    btnQuiet: { backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.subtleBorder },
    btnText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    btnTextQuiet: { color: Colors.textMain },
  })
);
