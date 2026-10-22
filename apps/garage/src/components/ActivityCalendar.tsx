import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { formatTime, money } from '../utils/format';

export type CalendarItem = {
  id: string;
  /** The day the work was done. */
  at: number;
  icon: string;
  title: string;
  sub: string;
  amount?: number;
  open: () => void;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dayKey = (t: number | Date) => {
  const d = new Date(t);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

/**
 * A month calendar of the repairs and services that were done: a dot under each day that has a record, and touching a day lists that day's records
 * (touch one to see everything about it).
 */
export const ActivityCalendar: React.FC<{ visible: boolean; onClose: () => void; items: CalendarItem[] }> = ({ visible, onClose, items }) => {
  const today = new Date();
  const { height: winH } = useWindowDimensions();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState(dayKey(today));

  // Each time it opens it starts on the latest day that has a record (or today when there are none).
  useEffect(() => {
    if (!visible) return;
    const latest = items.reduce((m, i) => Math.max(m, i.at), 0);
    const start = latest && latest <= Date.now() ? new Date(latest) : today;
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setPicked(dayKey(start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarItem[]>();
    for (const i of items) {
      const k = dayKey(i.at);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return map;
  }, [items]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length < 42) cells.push(null);
  const shift = (by: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + by, 1);
    setMonth(next);
    const inMonth = items.filter((i) => new Date(i.at).getFullYear() === next.getFullYear() && new Date(i.at).getMonth() === next.getMonth());
    const latest = inMonth.reduce((m, i) => Math.max(m, i.at), 0);
    setPicked(latest ? dayKey(latest) : dayKey(next));
  };
  const onDay = byDay.get(picked) ?? [];
  const monthCount = items.filter((i) => new Date(i.at).getFullYear() === month.getFullYear() && new Date(i.at).getMonth() === month.getMonth()).length;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* A pop-up in the middle of the screen (a message), not a sheet: touching outside it, or the ✕, closes it. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close calendar" />
        <View style={[styles.popup, { height: Math.min(600, Math.round(winH * 0.86)) }]}>
          <View style={styles.popupHead}>
            <View style={styles.popupHeadText}>
              <Text style={styles.popupTitle}>Calendar</Text>
              <Text style={styles.popupSub}>Pick a day to see the repairs done on it</Text>
            </View>
            <Pressable style={styles.popupClose} onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <Text style={styles.popupCloseText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.popupBody}>
      <View style={styles.monthRow}>
        <Pressable style={styles.navBtn} onPress={() => shift(-1)} hitSlop={8} accessibilityLabel="Previous month">
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <View style={styles.monthCol}>
          <Text style={styles.monthTitle}>
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </Text>
          <Text style={styles.monthSub}>{monthCount ? `${monthCount} record${monthCount > 1 ? 's' : ''}` : 'No records'}</Text>
        </View>
        <Pressable style={styles.navBtn} onPress={() => shift(1)} hitSlop={8} accessibilityLabel="Next month">
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEK.map((w, i) => (
          <Text key={`w${i}`} style={styles.weekday}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const k = month.getFullYear() * 10000 + (month.getMonth() + 1) * 100 + d;
          const has = byDay.has(k);
          const on = picked === k;
          const isToday = k === dayKey(today);
          return (
            <Pressable key={k} style={styles.cell} onPress={() => setPicked(k)} accessibilityLabel={`Day ${d}`}>
              <View style={[styles.day, isToday && styles.dayToday, on && styles.dayOn]}>
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
                {has && <View style={[styles.dot, on && styles.dotOn]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listBox}>
      <Text style={styles.listTitle}>
        {new Date(Math.floor(picked / 10000), Math.floor((picked % 10000) / 100) - 1, picked % 100).toDateString()}
      </Text>
      {onDay.length === 0 ? (
        <Text style={styles.empty}>No repairs or services on this day.</Text>
      ) : (
        onDay.map((i) => (
          <Pressable
            key={i.id}
            style={styles.item}
            onPress={() => {
              onClose();
              i.open();
            }}
            accessibilityLabel={`Record ${i.title}`}
          >
            <Text style={styles.itemIcon}>{i.icon}</Text>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {i.title}
              </Text>
              <Text style={styles.itemSub} numberOfLines={1}>
                {i.sub} · {formatTime(i.at)}
              </Text>
            </View>
            {!!i.amount && <Text style={styles.itemAmount}>{money(i.amount)}</Text>}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}
      </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const blue = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
    popup: { width: '100%', maxWidth: 380, borderRadius: 24, backgroundColor: Colors.bgCard, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 16, overflow: 'hidden' },
    popupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
    popupHeadText: { flex: 1 },
    popupTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textSoft },
    popupSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    popupClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    popupCloseText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textSoft },
    popupScroll: { flex: 1 },
    popupBody: { paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthCol: { alignItems: 'center' },
    monthTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textSoft },
    monthSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    navText: { fontSize: 22, lineHeight: 24, fontFamily: FONTS.bodyBold, color: blue() },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    weekday: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingVertical: 6 },
    cell: { width: '14.2857%', alignItems: 'center', paddingVertical: 2 },
    day: { width: 38, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
    dayToday: { borderColor: blue() },
    dayOn: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    dayText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    dayTextOn: { color: '#ffffff' },
    dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: '#16a34a' },
    dotOn: { backgroundColor: '#ffffff' },
    listBox: { gap: 10 },
    listTitle: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 6 },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: Colors.subtleFill },
    itemIcon: { fontSize: 24 },
    itemBody: { flex: 1 },
    itemTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textSoft },
    itemSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    itemAmount: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textSoft },
    chevron: { fontSize: 18, color: Colors.textMuted },
  })
);
