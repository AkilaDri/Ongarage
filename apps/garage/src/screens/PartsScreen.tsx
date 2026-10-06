import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, EmptyState, FONTS, GlassIcon, Icon, themedStyles, vehicleIcon, type IconName, type PartsRequest } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { allowedTypes, linesSummary, useParts } from '../context/PartsContext';
import { PART_TYPE_LABEL } from '../constants/parts';
import { PartsRequestSheet } from '../components/PartsRequestSheet';
import { PartsDetailSheet } from '../components/PartsDetailSheet';
import { Sheet } from '../components/Sheet';
import { countdown, formatDate, formatTime, money } from '../utils/format';
import type { Booking } from '../types';

// Everything about parts in one place: quotes to choose, orders on the way, and
// what has arrived. A request always belongs to a booking (it needs its vehicle and
// the part type the owner chose).
type Segment = 'quotes' | 'orders' | 'received';

export const PartsScreen: React.FC<{ focusId?: string | null; onFocusHandled?: () => void }> = ({ focusId, onFocusHandled }) => {
  const { bookings } = useGarage();
  const { requests, quotes, orders, requestFor } = useParts();
  const [segment, setSegment] = useState<Segment>('quotes');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newFor, setNewFor] = useState<Booking | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeOrder = (r: PartsRequest) => orders.find((o) => o.requestId === r.id && o.status !== 'unavailable' && o.status !== 'problem');
  const open = requests.filter((r) => r.status === 'open');
  const ordered = requests.filter((r) => r.status === 'ordered');
  const done = requests.filter((r) => r.status === 'received' || r.status === 'cancelled');
  const list = segment === 'quotes' ? open : segment === 'orders' ? ordered : done;

  // Arriving from a booking card: open that request in the right section.
  useEffect(() => {
    if (!focusId) return;
    const r = requests.find((x) => x.id === focusId);
    if (r) {
      setSegment(r.status === 'open' ? 'quotes' : r.status === 'ordered' ? 'orders' : 'received');
      setDetailId(r.id);
    }
    onFocusHandled?.();
  }, [focusId, requests, onFocusHandled]);

  const quoteCount = (r: PartsRequest) => quotes.filter((q) => q.requestId === r.id && !q.withdrawn && allowedTypes(r).includes(q.partType)).length;

  // Bookings that can still get a parts request.
  const eligible = bookings.filter((b) => b.status !== 'completed' && b.source !== 'sos' && !requestFor(b.id));

  const segments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'quotes', label: 'මිල ගණන්', icon: 'tag', count: open.length, alert: open.some((r) => quoteCount(r) > 0) },
    { id: 'orders', label: 'ඇණවුම්', icon: 'clock', count: ordered.length, alert: ordered.some((r) => activeOrder(r)?.status === 'arrived') },
    { id: 'received', label: 'ලැබුණු', icon: 'check-circle', count: done.filter((r) => r.status === 'received').length },
  ];

  const card = (r: PartsRequest) => {
    const b = bookings.find((x) => x.id === r.bookingId);
    const o = activeOrder(r);
    const q = o && quotes.find((x) => x.id === o.quoteId);
    const n = quoteCount(r);
    let status = '';
    let color = Colors.textMuted;
    if (r.status === 'cancelled') status = 'අවලංගු කළා';
    else if (r.status === 'received') {
      status = `✓ ලැබුණා · ${q ? money(q.total) : ''}`;
      color = Colors.successText;
    } else if (o?.status === 'arrived') {
      status = '📦 පැමිණියා — පරීක්ෂා කර “ලැබුණා” ඔබන්න';
      color = Colors.primary;
    } else if (o?.status === 'dispatched') {
      status = `🛵 මගදී · ${q?.shop.name} · මිනි. ${o.etaAt ? Math.max(0, Math.round((o.etaAt - now) / 60000)) : '–'}`;
      color = Colors.primary;
    } else if (o?.status === 'confirming') status = '⏳ වෙළඳසැල තොග තහවුරු කරමින්';
    else if (r.reconApproval === 'pending') status = '📲 අයිතිකරුගේ Recon අවසරය බලාපොරොත්තුවෙන්';
    else if (n) {
      status = `🏷️ මිල ගණන් ${n} ක් — තෝරන්න`;
      color = Colors.primary;
    } else if (r.searching) status = '⏳ වෙළඳසැල් පිළිතුරු දෙමින්…';
    else {
      status = r.partType === 'Genuine' && r.reconApproval !== 'approved' ? '⚠️ Genuine නොමැත — Recon අවසරය ඉල්ලන්න' : '⚠️ මිල ගණන් නැත';
      color = Colors.warning;
    }

    return (
      <Pressable key={r.id} style={({ pressed }) => [styles.card, r.status === 'cancelled' && styles.dim, pressed && styles.pressed]} onPress={() => setDetailId(r.id)}>
        <View style={styles.row}>
          <GlassIcon emoji={b?.icon ?? '🔩'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {b?.title ?? 'කොටස්'} · {r.vehicle.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {vehicleIcon(r.vehicle.type)} {r.vehicle.plate} · {b?.customer.name}
            </Text>
          </View>
          <View style={[styles.type, r.partType === 'Genuine' && styles.typeGenuine]}>
            <Text style={styles.typeText}>{PART_TYPE_LABEL[r.partType]}</Text>
          </View>
        </View>
        <Text style={styles.lines} numberOfLines={2}>
          🔩 {linesSummary(r.lines)}
        </Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.status, { color }]} numberOfLines={1}>
            {status}
          </Text>
          {r.status === 'open' && r.quoteUntil > now && <Text style={styles.sub}>{countdown(r.quoteUntil - now)}</Text>}
        </View>
        {r.status !== 'received' && r.status !== 'cancelled' && (
          <Text style={styles.sub}>
            ලැබිය යුත්තේ {formatDate(r.needBy)} · {formatTime(r.needBy)}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.flex1}>
      <View style={styles.tabBar}>
        {segments.map((t) => {
          const active = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)}>
              <Icon name={t.icon} size={14} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive, t.alert && styles.tabCountAlert]}>
                  <Text style={[styles.tabCountText, (active || t.alert) && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]} onPress={() => setPickerOpen(true)}>
          <Text style={styles.newText}>＋ නව කොටස් ඉල්ලීමක්</Text>
        </Pressable>
        {list.length === 0 ? (
          segment === 'quotes' ? (
            <EmptyState icon="🔩" title="විවෘත ඉල්ලීම් නැත" text="වෙන් කළ රැකියාවකට කොටස් අවශ්‍ය නම් ඉල්ලීමක් යවන්න — ළඟම වෙළඳසැල් මිල ගණන් එවයි." />
          ) : segment === 'orders' ? (
            <EmptyState icon="🛵" title="මගදී ඇණවුම් නැත" text="ඔබ තෝරාගත් මිල ගණන් මෙහි බෙදාහැරීම දක්වා පෙනේ." />
          ) : (
            <EmptyState icon="📦" title="තවම කිසිවක් ලැබී නැත" text="ලැබුණු කොටස් සහ බිල්පත් මෙහි පෙනේ." />
          )
        ) : (
          list.map(card)
        )}
      </ScrollView>

      <Sheet visible={pickerOpen} title="කුමන රැකියාවටද?" subtitle="කොටස් ඉල්ලීමක් සැමවිට වෙන් කළ රැකියාවකට අයත් වේ" onClose={() => setPickerOpen(false)}>
        {eligible.length === 0 ? (
          <Text style={styles.sub}>කොටස් ඉල්ලිය හැකි ඉදිරි වෙන්කිරීම් නැත.</Text>
        ) : (
          eligible.map((b) => (
            <Pressable
              key={b.id}
              style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}
              onPress={() => {
                setPickerOpen(false);
                setNewFor(b);
              }}
            >
              <GlassIcon emoji={b.icon} small />
              <View style={styles.flex1}>
                <Text style={styles.title}>{b.title}</Text>
                <Text style={styles.sub}>
                  {vehicleIcon(b.vehicle.type)} {b.vehicle.name} · {b.customer.name} · {formatDate(b.scheduledAt)} {formatTime(b.scheduledAt)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </Sheet>
      <PartsRequestSheet booking={newFor} onClose={() => setNewFor(null)} onSent={() => setSegment('quotes')} />
      <PartsDetailSheet requestId={detailId} onClose={() => setDetailId(null)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
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
    body: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 100 },
    newBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
    newText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 8 },
    dim: { opacity: 0.55 },
    pressed: { opacity: 0.75 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    lines: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft, lineHeight: 17 },
    status: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    type: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.subtleFill },
    typeGenuine: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    typeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    chevron: { fontSize: 20, color: Colors.textMuted },
  })
);
