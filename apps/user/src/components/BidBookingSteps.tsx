import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BOOKING_SLOT_HOURS, Colors, FONTS, GARAGE_CLOSE_HOUR, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { InlineCalendar } from './BookingCalendar';
import { dayStart, MAX_BOOKING_DAYS, slotIsPast, slotTime } from './SlotPicker';
import { formatTime } from '../utils/format';

// The steps of booking an accepted quote, one question each (as the quote request is): which day, what time, where the work is done.

const QUICK_DAYS = 5;

/** "Fri" / "20" / "Nov" for a day offset from today, and the label that stands in front of it ("අද", "හෙට"). */
const dayParts = (offset: number) => {
  const d = new Date(dayStart(offset));
  return {
    weekday: offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
  };
};
export const dayLabel = (offset: number) => {
  const p = dayParts(offset);
  return `${offset <= 1 ? p.weekday + ' · ' : p.weekday + ' '}${p.date} ${p.month}`;
};

/** Step 1: which day. The next seven days as cards; "වෙනත් දිනයක්" opens the calendar for any day within the month. */
export const DayStep: React.FC<{ day: number | null; onDay: (day: number) => void; /** Picks the first open day and time in one tap (the next step then asks only where). */ onSoonest?: (day: number, hour: number) => void; /** Sits at the right of the heading (the deadline). */ headerRight?: React.ReactNode }> = ({ day, onDay, onSoonest, headerRight }) => {
  const [calendar, setCalendar] = useState(false);
  // Today is only offered while a time is still left today.
  const todayOpen = BOOKING_SLOT_HOURS.some((h) => !slotIsPast(slotTime(0, h)));
  const offsets = Array.from({ length: QUICK_DAYS }, (_, i) => i).filter((o) => o !== 0 || todayOpen);
  // A day picked on the calendar beyond the quick row stands in front of the row, chosen.
  const extra = day !== null && day >= QUICK_DAYS ? day : null;
  // The first time still open, looking forward day by day: the one-tap choice for an owner who just wants the earliest slot.
  let soonest: { day: number; hour: number } | null = null;
  for (let d = 0; d < MAX_BOOKING_DAYS && !soonest; d++) {
    const h = BOOKING_SLOT_HOURS.find((x) => !slotIsPast(slotTime(d, x)));
    if (h !== undefined) soonest = { day: d, hour: h };
  }
  const first = soonest;
  return (
    <>
      <View style={[styles.headRow, styles.headTop]}>
        <Text style={styles.question}>කවදා ද?</Text>
        {headerRight}
      </View>
      {!!first && !!onSoonest && (
        <Pressable style={styles.soonest} onPress={() => onSoonest(first.day, first.hour)} accessibilityRole="button" accessibilityLabel="Take the soonest time">
          <View style={styles.flex1}>
            <Text style={styles.soonestLabel}>⚡ ඉක්මන්ම</Text>
            <Text style={styles.soonestValue}>{dayLabel(first.day)} · {formatTime(slotTime(first.day, first.hour))}</Text>
          </View>
          <Text style={styles.soonestGo}>තෝරන්න ›</Text>
        </Pressable>
      )}
      <View style={[styles.headRow, styles.headTop]}>
        <Text style={styles.orLabel}>නැතිනම් වෙනත් දිනයක්</Text>
        <Pressable onPress={() => setCalendar(true)} hitSlop={10} style={styles.calLink} accessibilityRole="button" accessibilityLabel="Pick another date">
          <Text style={styles.calLinkText}>📅 දින දර්ශනය</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {extra !== null && <DayCard offset={extra} on onPress={() => onDay(extra)} />}
        {offsets.map((o) => (
          <DayCard key={o} offset={o} on={day === o} onPress={() => onDay(o)} />
        ))}
      </ScrollView>
      <Sheet visible={calendar} title="" onClose={() => setCalendar(false)}>
        <InlineCalendar
          plain
          selected={day ?? 1}
          maxDays={MAX_BOOKING_DAYS}
          onPick={(d) => {
            onDay(d);
            setCalendar(false);
          }}
        />
      </Sheet>
    </>
  );
};

const DayCard: React.FC<{ offset: number; on: boolean; onPress: () => void }> = ({ offset, on, onPress }) => {
  const p = dayParts(offset);
  return (
    <Pressable style={[styles.dayCard, on && styles.dayCardOn]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={dayLabel(offset)}>
      <Text style={[styles.dayWeek, on && styles.onText]}>{p.weekday}</Text>
      <Text style={[styles.dayNum, on && styles.onText]}>{p.date}</Text>
      <Text style={[styles.dayMonth, on && styles.onText]}>{p.month}</Text>
    </Pressable>
  );
};

/** Step 2: what time on that day (the day chosen stays in view above the times). */
export const TimeStep: React.FC<{ day: number; hour: number | null; onHour: (hour: number) => void; onChangeDay?: () => void; /** Sits at the right of the heading (the deadline). */ headerRight?: React.ReactNode }> = ({ day, hour, onHour, onChangeDay, headerRight }) => (
  <>
    <View style={[styles.headRow, styles.headTop]}>
      <Text style={styles.question}>කීයට ද?</Text>
      {headerRight}
    </View>
    <View style={styles.headRow}>
      <Text style={styles.chosen}>📅 {dayLabel(day)}</Text>
      {!!onChangeDay && (
        <Pressable onPress={onChangeDay} hitSlop={10} style={styles.calLink} accessibilityRole="button" accessibilityLabel="Change the day">
          <Text style={styles.calLinkText}>වෙනස් කරන්න</Text>
        </Pressable>
      )}
    </View>
    <View style={styles.timeGrid}>
      {BOOKING_SLOT_HOURS.map((h) => {
        const t = slotTime(day, h);
        const past = slotIsPast(t);
        const on = hour === h;
        return (
          <Pressable key={h} style={[styles.timeChip, on && styles.timeChipOn, past && styles.timeChipOff]} onPress={() => onHour(h)} disabled={past} accessibilityRole="button" accessibilityState={{ selected: on, disabled: past }}>
            <Text style={[styles.timeText, on && styles.onText]}>{formatTime(t)}</Text>
          </Pressable>
        );
      })}
    </View>
    {hour !== null && hour >= GARAGE_CLOSE_HOUR && <Text style={styles.hint}>බොහෝ ගරාජ ප.ව. 5න් පසු වසා ඇත — ගරාජය වෙනත් වේලාවක් යෝජනා කළ හැක.</Text>}
  </>
);

/** Step 3: where the work is done. */
export const WhereStep: React.FC<{ doorstep: boolean; onDoorstep: (doorstep: boolean) => void }> = ({ doorstep, onDoorstep }) => (
  <>
    <Text style={styles.question}>සේවාව ලබාගන්නේ කොහේ ද?</Text>
    <Pressable style={[styles.whereCard, !doorstep && styles.whereCardOn]} onPress={() => onDoorstep(false)} accessibilityRole="radio" accessibilityState={{ selected: !doorstep }}>
      <Text style={styles.whereIcon}>🏠</Text>
      <View style={styles.flex1}>
        <Text style={[styles.whereTitle, !doorstep && styles.onText]}>මම වාහනය ගරාජයට ගෙනෙන්නම්</Text>
        <Text style={[styles.whereSub, !doorstep && styles.onSub]}>නියමිත වේලාවට ගරාජයට පැමිණෙන්න</Text>
      </View>
    </Pressable>
    <Pressable style={[styles.whereCard, doorstep && styles.whereCardOn]} onPress={() => onDoorstep(true)} accessibilityRole="radio" accessibilityState={{ selected: doorstep }}>
      <Text style={styles.whereIcon}>🚛</Text>
      <View style={styles.flex1}>
        <Text style={[styles.whereTitle, doorstep && styles.onText]}>ගරාජය මා වෙත පැමිණිය යුතුයි</Text>
        <Text style={[styles.whereSub, doorstep && styles.onSub]}>ඔබගේ ස්ථානයට ගරාජය පැමිණේ</Text>
      </View>
    </Pressable>
  </>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    question: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    chosen: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    onText: { color: '#ffffff' },
    onSub: { color: 'rgba(255,255,255,0.85)' },
    hint: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    dayRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
    soonest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 26, backgroundColor: '#dbeafe', borderWidth: 1.5, borderColor: '#facc15', minHeight: 64 },
    soonestLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    soonestValue: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.titleBold, color: '#1e3a8a', marginTop: 2 },
    soonestGo: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    orLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    daySlots: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a', marginTop: 2 },
    dayCard: { width: 70, height: 88, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.borderColor },
    dayCardOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    dayWeek: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    dayNum: { fontSize: 24, lineHeight: 30, fontFamily: FONTS.titleBold, color: Colors.textMain },
    dayMonth: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    headTop: { marginTop: 12, marginBottom: 2 },
    calLink: { minHeight: 32, justifyContent: 'center' },
    calLinkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    moreCard: { width: 96, height: 92, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#e8edf8', borderWidth: 1.5, borderColor: '#facc15' },
    moreIcon: { fontSize: 22 },
    moreText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a', textAlign: 'center' },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timeChip: { width: '30.5%', height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.borderColor },
    timeChipOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    timeChipOff: { opacity: 0.35 },
    timeText: { fontSize: 14.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    whereCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: '#facc15' },
    whereCardOn: { backgroundColor: '#1e3a8a' },
    whereIcon: { fontSize: 28 },
    whereTitle: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    whereSub: { fontSize: 13, lineHeight: 19, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  })
);
