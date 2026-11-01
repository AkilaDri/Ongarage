import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_MS = 24 * 60 * 60 * 1000;
const midnight = (t: number | Date) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

type Pick = { selected: number; maxDays: number; onPick: (offset: number) => void };

/**
 * The month grid itself: round month arrows, the weekday letters and the days, today with a dot under it and the chosen day on a soft round marker. Today up to
 * `maxDays` ahead can be picked; earlier and later days are faded. The day comes back as the number of days from today (0 = today), the way the booking form keeps it.
 */
export const CalendarBody: React.FC<Pick & { visible?: boolean; compact?: boolean }> = ({ selected, maxDays, onPick, visible = true, compact }) => {
  const today = midnight(Date.now());
  const dayAt = (offset: number) => new Date(today + offset * DAY_MS);
  const monthOf = (offset: number) => {
    const d = dayAt(offset);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };
  const [month, setMonth] = useState(monthOf(selected));
  // Each time it appears it shows the month of the day that is chosen now.
  useEffect(() => {
    if (visible) setMonth(monthOf(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const first = monthOf(0);
  const last = monthOf(maxDays);
  const canBack = month.getTime() > first.getTime();
  const canNext = month.getTime() < last.getTime();
  const cells = useMemo(() => {
    const lead = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    // Only the days that can be picked are drawn (today up to `maxDays` ahead): the days before today and after the limit are blank, and a week with none left is left out.
    const all = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
      if (i < lead || i >= lead + days) return null;
      const d = new Date(month.getFullYear(), month.getMonth(), i - lead + 1);
      const offset = Math.round((midnight(d) - today) / DAY_MS);
      return offset >= 0 && offset <= maxDays ? d : null;
    });
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));
    return weeks.filter((w) => w.some(Boolean)).flat();
  }, [month, maxDays, today]);

  return (
    <View>
      <View style={styles.monthRow}>
        <Text style={styles.month}>
          {MONTHS[month.getMonth()]} <Text style={styles.year}>{month.getFullYear()}</Text>
        </Text>
        <View style={styles.arrows}>
          <Pressable style={[styles.arrow, !canBack && styles.arrowOff]} disabled={!canBack} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityLabel="Previous month">
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable style={[styles.arrow, !canNext && styles.arrowOff]} disabled={!canNext} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} accessibilityLabel="Next month">
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.week}>
        {WEEK.map((w, i) => (
          <Text key={i} style={styles.weekText}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={[styles.cell, compact && styles.cellSmall]} />;
          const offset = Math.round((midnight(d) - today) / DAY_MS);
          const ok = offset >= 0 && offset <= maxDays;
          const on = offset === selected;
          const isToday = offset === 0;
          return (
            <Pressable key={i} style={[styles.cell, compact && styles.cellSmall]} disabled={!ok} onPress={() => onPick(offset)} accessibilityLabel={`Pick ${d.toDateString()}`} accessibilityState={{ selected: on, disabled: !ok }}>
              <View style={[styles.day, compact && styles.daySmall, on && styles.dayOn]}>
                <Text style={[styles.dayText, compact && styles.dayTextSmall, !ok && styles.dayTextOff, isToday && !on && styles.dayTextToday, on && styles.dayTextOn]}>{d.getDate()}</Text>
                {isToday && <View style={[styles.todayDot, on && styles.todayDotOn]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/** The chosen day written out ("Saturday, 24 October"). */
export const chosenDayText = (selected: number, maxDays: number) => {
  const d = new Date(midnight(Date.now()) + Math.min(Math.max(selected, 0), maxDays) * DAY_MS);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/**
 * The calendar open on the page itself (the booking form's "when" tab has the room): the chosen day in big letters, quick pills for today / tomorrow / next
 * week, and the month grid under them. Picking a day just changes it; nothing closes.
 */
export const InlineCalendar: React.FC<Pick> = ({ selected, maxDays, onPick }) => (
  <View style={styles.inline} accessibilityLabel="Calendar">
    <Text style={styles.chosenInline}>{chosenDayText(selected, maxDays)}</Text>
    <View style={styles.quickInline}>
      {[
        { label: 'අද', offset: 0 },
        { label: 'හෙට', offset: 1 },
        { label: 'සති 1කින්', offset: 7 },
      ].map((q) => (
        <Pressable key={q.label} style={[styles.pill, selected === q.offset && styles.pillOn]} onPress={() => onPick(q.offset)} accessibilityLabel={`Quick pick ${q.label}`}>
          <Text style={[styles.pillText, selected === q.offset && styles.pillTextOn]}>{q.label}</Text>
        </Pressable>
      ))}
    </View>
    <CalendarBody compact selected={selected} maxDays={maxDays} onPick={onPick} />
  </View>
);

/** The same calendar as a rounded sheet from the bottom (for a form with no room for it on the page). */
export const BookingCalendar: React.FC<Pick & { visible: boolean; onClose: () => void }> = ({ visible, onClose, selected, maxDays, onPick }) => {
  const pick = (offset: number) => {
    onPick(offset);
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close calendar">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.grabber} />
          <Text style={styles.kicker}>දිනය තෝරන්න</Text>
          <Text style={styles.chosen}>{chosenDayText(selected, maxDays)}</Text>
          <CalendarBody selected={selected} maxDays={maxDays} onPick={pick} visible={visible} />
          <View style={styles.quick}>
            {[
              { label: 'අද', offset: 0 },
              { label: 'හෙට', offset: 1 },
              { label: 'සති 1කින්', offset: 7 },
            ].map((q) => (
              <Pressable key={q.label} style={[styles.pill, selected === q.offset && styles.pillOn]} onPress={() => pick(q.offset)} accessibilityLabel={`Quick pick ${q.label}`}>
                <Text style={[styles.pillText, selected === q.offset && styles.pillTextOn]}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    sheet: { width: '100%', maxWidth: 460, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26, backgroundColor: Colors.bgCard },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14, backgroundColor: Colors.subtleBorder },
    kicker: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
    chosen: { fontSize: 24, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2, marginBottom: 16 },
    // On the page: the day written out, the quick pills, then the grid in a soft panel.
    inline: { padding: 10, borderRadius: 14, backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f4f7fb' },
    chosenInline: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginBottom: 8 },
    quickInline: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    month: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    year: { fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    arrows: { flexDirection: 'row', gap: 8 },
    arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    arrowOff: { opacity: 0.3 },
    arrowText: { fontSize: 22, color: Colors.textMain, marginTop: -3 },
    week: { flexDirection: 'row', marginBottom: 2 },
    weekText: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' },
    cellSmall: { height: 34 },
    day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    daySmall: { width: 30, height: 30, borderRadius: 15 },
    dayTextSmall: { fontSize: 12.5 },
    dayOn: { backgroundColor: BLUE(), shadowColor: BLUE(), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 4 },
    dayText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    dayTextOff: { color: Colors.textMuted, opacity: 0.3 },
    dayTextToday: { color: BLUE(), fontFamily: FONTS.bodyBold },
    dayTextOn: { color: getThemeMode() === 'dark' ? '#0b1220' : '#ffffff', fontFamily: FONTS.bodyBold },
    todayDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: BLUE() },
    todayDotOn: { backgroundColor: getThemeMode() === 'dark' ? '#0b1220' : '#ffffff' },
    quick: { flexDirection: 'row', gap: 8, marginTop: 14 },
    pill: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    pillOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.2)' : '#e8f0fe' },
    pillText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    pillTextOn: { color: BLUE() },
  })
);
