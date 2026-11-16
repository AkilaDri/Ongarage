import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BOOKING_SLOT_HOURS, Colors, FONTS, GARAGE_CLOSE_HOUR, themedStyles } from '@ongarage/shared';
import { InlineCalendar } from './BookingCalendar';
import { formatTime } from '../utils/format';

const HOUR = 60 * 60 * 1000;
/** How far ahead a time can be booked: within a month from today. */
export const MAX_BOOKING_DAYS = 30;

/** The start of the day `offset` days from today. */
export const dayStart = (offset: number) => {
  const d = new Date(Date.now() + offset * 24 * HOUR);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
/** The moment of a day (offset from today) and a start hour. */
export const slotTime = (day: number, hour: number) => dayStart(day) + hour * HOUR;
/** A time less than an hour away cannot be asked for. */
export const slotIsPast = (at: number) => at <= Date.now() + HOUR;

/**
 * The day and time of a booking: the calendar, the start times, and (when `onDoorstep` is given) where the service is done.
 * The direct booking form and the booking of an accepted quote use this same picker, so the two always offer the same times.
 */
export const SlotPicker: React.FC<{
  day: number;
  hour: number;
  onDay: (day: number) => void;
  onHour: (hour: number) => void;
  doorstep?: boolean;
  onDoorstep?: (doorstep: boolean) => void;
}> = ({ day, hour, onDay, onHour, doorstep = false, onDoorstep }) => (
  <>
    <Text style={styles.label}>දිනය</Text>
    {/* The calendar is open on the page: pick the day on it, then the time below. */}
    <InlineCalendar selected={day} maxDays={MAX_BOOKING_DAYS} onPick={onDay} />

    <Text style={styles.label}>වේලාව</Text>
    <View style={styles.chips}>
      {BOOKING_SLOT_HOURS.map((h) => {
        const t = slotTime(day, h);
        const past = slotIsPast(t);
        return <Chip key={h} label={formatTime(t)} on={hour === h} disabled={past} onPress={() => onHour(h)} small />;
      })}
    </View>
    {hour >= GARAGE_CLOSE_HOUR && <Text style={styles.hint}>බොහෝ ගරාජ ප.ව. 5න් පසු වසා ඇත — ගරාජය වෙනත් වේලාවක් යෝජනා කළ හැක.</Text>}

    {!!onDoorstep && (
      <>
        <Text style={styles.label}>සේවාවක් ලබාගන්නා ස්ථානය</Text>
        <View style={styles.chips}>
          <Chip label="🏠 මම වාහනය ගරාජයට ගෙනෙන්නම්" on={!doorstep} onPress={() => onDoorstep(false)} />
          <Chip label="🚛 ගරාජය මා වෙත පැමිණිය යුතුයි" on={doorstep} onPress={() => onDoorstep(true)} />
        </View>
      </>
    )}
  </>
);

const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean; disabled?: boolean }> = ({ label, on, onPress, small, disabled }) => (
  <Pressable style={[styles.chip, small && styles.chipSmall, on && styles.chipOn, disabled && styles.chipOff]} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: on, disabled: !!disabled }}>
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipOff: { opacity: 0.35 },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
  })
);
