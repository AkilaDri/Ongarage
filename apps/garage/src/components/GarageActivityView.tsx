import { EmptyState, CalendarGridIcon, Icon, pageHeaderBlue, type IconName } from '@ongarage/shared';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, monthKey, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { EarningsSummaryCard } from './EarningsSummaryCard';
import { useParts } from '../context/PartsContext';
import { ONGARAGE_COMMISSION_PERCENT } from '../constants/commission';
import { formatDate, formatTime, money } from '../utils/format';

export type Kind = 'job' | 'ongarage' | 'onmart';
export type Txn = { id: string; at: number; kind: Kind; icon: string; title: string; sub: string; amount: number; note?: string; noteGood?: boolean };
type Filter = 'all' | Kind;

const FILTERS: { id: Filter; label: string; icon: IconName }[] = [
  { id: 'all', label: 'සියල්ල', icon: 'inbox' },
  { id: 'job', label: 'ආදායම', icon: 'check-circle' },
  { id: 'ongarage', label: 'OnGarage', icon: 'tag' },
  { id: 'onmart', label: 'OnMart', icon: 'clock' },
];

/** Every money movement of this garage, newest first: finished jobs, the commission to OnGarage on each, the commissions OnMart's shops owe. */
export const useGarageTxns = (): Txn[] => {
  const { bookings } = useGarage();
  const { referrals, settled } = useParts();
  return useMemo(() => {
    const out: Txn[] = [];
    for (const b of bookings) {
      if (b.status === 'completed') {
        const at = b.completedAt ?? b.scheduledAt;
        out.push({ id: `job-${b.id}`, at, kind: 'job', icon: '💰', title: b.title, sub: `${b.customer.name} · ${b.vehicle.plate}`, amount: b.price });
        out.push({
          id: `fee-${b.id}`,
          at,
          kind: 'ongarage',
          icon: '🏢',
          title: `OnGarage කොමිස් (${ONGARAGE_COMMISSION_PERCENT}%)`,
          sub: b.title,
          amount: -Math.round((b.price * ONGARAGE_COMMISSION_PERCENT) / 100),
        });
      } else if (b.status === 'cancelled' && b.cancelled?.compensation) {
        out.push({ id: `comp-${b.id}`, at: b.cancelled.at, kind: 'job', icon: '🛡️', title: `වන්දිය · ${b.title}`, sub: b.customer.name, amount: b.cancelled.compensation });
      }
    }
    for (const r of referrals) {
      if (!r.commission) continue;
      const at = r.jobClosedAt ?? r.recommendedAt;
      const got = !!settled[`${monthKey(at)}:${r.shop.id}`];
      out.push({ id: `ref-${r.id}`, at, kind: 'onmart', icon: '🏪', title: `OnMart කොමිස් · ${r.shop.name}`, sub: r.partName, amount: r.commission, note: got ? 'ලැබුණා' : 'ලැබිය යුතුයි', noteGood: got });
    }
    return out.sort((a, b) => b.at - a.at);
  }, [bookings, referrals, settled]);
};

/**
 * Every money movement of this garage in one list, newest first: what the finished jobs earned, the commission it pays OnGarage on each of them,
 * and the commission OnMart's shops owe it for the parts it sent customers to buy. The Schedule page's second title.
 */
export const GarageActivityView: React.FC<{ onOpenCalendar?: () => void }> = ({ onOpenCalendar }) => {
  const [filter, setFilter] = useState<Filter>('all');

  const txns = useGarageTxns();

  const sum = (k: Kind) => txns.filter((t) => t.kind === k).reduce((n, t) => n + t.amount, 0);
  const income = sum('job');
  const toOnGarage = sum('ongarage');
  const fromOnMart = sum('onmart');
  const list = filter === 'all' ? txns : txns.filter((t) => t.kind === filter);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.band}>
        <View style={styles.bandTitleRow}>
          <Text style={styles.bandTitle}>Activity</Text>
          <Pressable onPress={onOpenCalendar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open transactions calendar">
            <CalendarGridIcon size={28} color="#ffffff" />
          </Pressable>
        </View>
        <View style={styles.bandFilters}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable key={f.id} style={[styles.bandPill, on && styles.bandPillOn]} onPress={() => setFilter(f.id)} accessibilityLabel={`Show ${f.label}`}>
                <Icon name={f.icon} size={12} color="#ffffff" />
              <Text style={styles.bandPillText} numberOfLines={1}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <EarningsSummaryCard />
      <View style={styles.tiles}>
        <Tile label="ආදායම" value={money(income)} color={Colors.successText} />
        <Tile label="OnGarage කොමිස්" value={money(-toOnGarage)} color={Colors.errorText} />
        <Tile label="OnMart කොමිස්" value={money(fromOnMart)} color={getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'} />
      </View>
      <View style={styles.net}>
        <Text style={styles.netLabel}>ඔබට ඉතිරි වන්නේ</Text>
        <Text style={styles.netValue}>{money(income + toOnGarage + fromOnMart)}</Text>
      </View>
      {list.length === 0 ? (
        <EmptyState icon="🧾" title="ගනුදෙනු නැත" text="ආදායම් සහ කොමිස් ගනුදෙනු මෙහි පෙන්වයි." />
      ) : (
        list.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.icon}>{t.icon}</Text>
            <View style={styles.flex1}>
              <Text style={styles.title} numberOfLines={1}>
                {t.title}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {t.sub}
              </Text>
              <Text style={styles.sub}>
                {formatDate(t.at)} · {formatTime(t.at)}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.amount, { color: t.amount < 0 ? Colors.errorText : Colors.successText }]}>
                {t.amount < 0 ? '−' : '+'}
                {money(Math.abs(t.amount))}
              </Text>
              {!!t.note && <Text style={[styles.note, { color: t.noteGood ? Colors.successText : Colors.warning }]}>{t.note}</Text>}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const Tile: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <View style={styles.tile}>
    <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.tileLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    body: { paddingVertical: 16, paddingHorizontal: 6, gap: 12, paddingBottom: 250 },
    tiles: { flexDirection: 'row', gap: 8 },
    tile: { flex: 1, gap: 2, padding: 12, borderRadius: 12, backgroundColor: Colors.subtleFill },
    tileValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    tileLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    net: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    netLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    netValue: { fontSize: 17, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    // The navy band on top, the same as the Garage and Jobs pages: the title, the calendar, and the filters as pills.
    band: { backgroundColor: pageHeaderBlue().from, marginHorizontal: -6, marginTop: -4, paddingHorizontal: 16, paddingTop: 36, paddingBottom: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    bandTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    bandTitle: { fontSize: 19, lineHeight: 24, fontFamily: FONTS.titleBold, color: '#ffffff' },
    bandFilters: { flexDirection: 'row', gap: 6 },
    bandPill: { flex: 1, flexDirection: 'row', gap: 3, paddingHorizontal: 2, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#ffffff', backgroundColor: pageHeaderBlue().from },
    bandPillOn: { borderWidth: 2.5, borderColor: '#fbbf24' },
    bandPillText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filter: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    filterOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    filterText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    filterTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    empty: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', backgroundColor: Colors.bgCard },
    icon: { fontSize: 22, width: 30, textAlign: 'center' },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    right: { alignItems: 'flex-end', gap: 2 },
    amount: { fontSize: 15, fontFamily: FONTS.titleBold },
    note: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
  })
);
