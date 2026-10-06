import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, EmptyState, FONTS, GlassIcon, Icon, themedStyles, type IconName } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { DispatchSheet } from '../components/DispatchSheet';
import { countdown, formatTime, isSameDay, money } from '../utils/format';
import type { ShopOrder, ShopOrderStatus } from '../types';

// Won quotes become orders. The shop confirms stock, packs, sends, and is paid when
// the garage checks the parts in — the shop-side mirror of the garage's Parts tab.
type Segment = 'active' | 'done';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STEPS: { id: ShopOrderStatus; label: string }[] = [
  { id: 'confirming', label: 'තහවුරු' },
  { id: 'packing', label: 'ඇසුරුම්' },
  { id: 'dispatched', label: 'මගදී' },
  { id: 'arrived', label: 'භාර දුන්නා' },
  { id: 'received', label: 'ගෙවුවා' },
];
const ACTIVE: ShopOrderStatus[] = ['confirming', 'packing', 'dispatched', 'arrived', 'problem'];

export const OrdersScreen: React.FC = () => {
  const { orders, confirmStock, declineStock, acceptReturn } = useShop();
  const [segment, setSegment] = useState<Segment>('active');
  const [dispatching, setDispatching] = useState<ShopOrder | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => !ACTIVE.includes(o.status));
  const paid = orders.filter((o) => o.status === 'received' && o.receivedAt);
  const today = paid.filter((o) => isSameDay(o.receivedAt!, now)).reduce((s, o) => s + (o.payout ?? 0), 0);
  const week = paid.filter((o) => now - o.receivedAt! < WEEK_MS).reduce((s, o) => s + (o.payout ?? 0), 0);
  const needsAction = active.filter((o) => o.status === 'confirming' || o.status === 'packing' || o.status === 'problem').length;

  const segments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'active', label: 'ක්‍රියාත්මක', icon: 'clock', count: active.length, alert: needsAction > 0 },
    { id: 'done', label: 'අවසන්', icon: 'check-circle', count: done.length },
  ];

  const card = (o: ShopOrder) => {
    const q = o.quote;
    const r = q.request;
    const failed = o.status === 'unavailable' || o.status === 'problem' || o.status === 'returned';
    const step = STEPS.findIndex((s) => s.id === o.status);
    return (
      <View key={o.id} style={[styles.card, o.status === 'confirming' && styles.cardUrgent, failed && styles.cardFailed]}>
        <View style={styles.row}>
          <GlassIcon emoji={r.categoryId ? categoryInfo(r.categoryId).icon : '🔩'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {r.garage.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {r.vehicle.name} · {r.vehicle.plate} · ඇණවුම {formatTime(o.placedAt)}
            </Text>
          </View>
          <Text style={styles.price}>{money(q.total)}</Text>
        </View>
        <View style={styles.lines}>
          {r.lines.map((l, i) => (
            <View key={l.id} style={styles.rowBetween}>
              <Text style={styles.lineText}>
                {l.name} ×{l.qty} · {q.partType}
              </Text>
              <Text style={styles.sub}>{money(q.unitPrices[i] * l.qty)}</Text>
            </View>
          ))}
        </View>

        {!failed && (
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s.id} style={styles.step}>
                <View style={[styles.stepDot, i <= step && styles.stepDone]} />
                <Text style={[styles.stepText, i <= step && { color: Colors.textMain }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {o.status === 'confirming' && (
          <>
            <Text style={styles.urgent}>⏳ තොගය තහවුරු කිරීමට {countdown(o.confirmBy - now)} — නැත්නම් ඇණවුම අහෝසි වී ශ්‍රේණියට බලපායි.</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="තොග නැත" icon="✕" variant="ghost" compact onPress={() => declineStock(o.id)} />
              </View>
              <View style={styles.flex2}>
                <ActionButton label="තොගයේ ඇත" icon="✓" variant="success" compact onPress={() => confirmStock(o.id)} />
              </View>
            </View>
          </>
        )}
        {o.status === 'packing' && <ActionButton label="ඇසුරුම් කළා · බෙදාහැරීමට යවන්න" icon="📦" variant="primary" compact onPress={() => setDispatching(o)} />}
        {o.status === 'dispatched' && o.delivery && (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]}>
              🛵 {o.delivery.rider.name} · {o.delivery.courier ?? 'අපගේ රියදුරු'} · මිනි. {Math.max(0, Math.round((o.delivery.etaAt - now) / 60000))}කින්
            </Text>
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${o.delivery!.rider.phone}`)}>
              <Text style={styles.callText}>📞 රියදුරු</Text>
            </Pressable>
          </View>
        )}
        {o.status === 'arrived' && <Text style={styles.sub}>📦 ගරාජයට භාර දුන්නා — ගරාජය පරීක්ෂා කර ගෙවමින්…</Text>}
        {o.status === 'received' && (
          <View style={styles.rowBetween}>
            <Text style={styles.paid}>💰 ලැබුණා {money(o.payout ?? 0)}</Text>
            {o.rating ? <Text style={styles.stars}>{'★'.repeat(o.rating)}{'☆'.repeat(5 - o.rating)}</Text> : <Text style={styles.sub}>ශ්‍රේණිය බලාපොරොත්තුවෙන්</Text>}
          </View>
        )}
        {o.status === 'problem' && (
          <>
            <Text style={styles.fail}>↩️ ගරාජය වාර්තා කළා: {o.problem}</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="ගරාජය අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${r.garage.phone}`)} />
              </View>
              <View style={styles.flex1}>
                <ActionButton label="ආපසු ගන්න" icon="↩" variant="primary" compact onPress={() => acceptReturn(o.id)} />
              </View>
            </View>
          </>
        )}
        {o.status === 'returned' && <Text style={styles.sub}>↩️ ආපසු ගත්තා · කොටස තොගයට නැවත එක් කළා</Text>}
        {o.status === 'unavailable' && <Text style={styles.fail}>⛔ තොග නොමැති බැවින් අවලංගු විය — ගරාජය වෙනත් වෙළඳසැලක් තෝරා ගත්තා</Text>}
      </View>
    );
  };

  const list = segment === 'active' ? active : done;

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <Stat value={money(today)} label="අද ආදායම" color={Colors.success} />
        <Stat value={money(week)} label="දින 7 ආදායම" color={Colors.primary} />
        <Stat value={String(paid.length)} label="ගෙවූ ඇණවුම්" color={Colors.warning} />
      </View>

      <View style={styles.tabBar}>
        {segments.map((t) => {
          const on = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, on && styles.tabActive]} onPress={() => setSegment(t.id)}>
              <Icon name={t.icon} size={14} color={on ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, on && styles.tabCountActive, t.alert && styles.tabCountAlert]}>
                  <Text style={[styles.tabCountText, (on || t.alert) && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {list.length === 0 ? (
        segment === 'active' ? (
          <EmptyState icon="📦" title="ක්‍රියාත්මක ඇණවුම් නැත" text="ගරාජයක් ඔබගේ මිල ගණන තෝරා ගත් විට ඇණවුම මෙහි පෙන්වනු ඇත." />
        ) : (
          <EmptyState icon="✅" title="අවසන් ඇණවුම් නැත" text="ගෙවූ, ආපසු ගත් සහ අවලංගු ඇණවුම් මෙහි පෙන්වනු ඇත." />
        )
      ) : (
        list.map(card)
      )}
      <DispatchSheet order={dispatching} onClose={() => setDispatching(null)} />
    </ScrollView>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    tabBar: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      backgroundColor: Colors.bgCard,
    },
    tabActive: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.5)' },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextActive: { color: Colors.primary },
    tabCount: {
      position: 'absolute',
      top: -7,
      right: -4,
      minWidth: 19,
      height: 19,
      paddingHorizontal: 5,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: Colors.bgBody,
      backgroundColor: Colors.bgCardHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCountActive: { backgroundColor: Colors.primary },
    tabCountAlert: { backgroundColor: '#ef4444' },
    tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    cardUrgent: { borderColor: 'rgba(245, 158, 11, 0.55)' },
    cardFailed: { borderColor: 'rgba(239, 68, 68, 0.4)' },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    lines: { gap: 4, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill },
    lineText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    steps: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', gap: 4, flex: 1 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.subtleBorder },
    stepDone: { backgroundColor: Colors.success },
    stepText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    urgent: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    fail: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
    paid: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    stars: { fontSize: 13, color: Colors.warning, letterSpacing: 2 },
    callBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    callText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
  })
);
