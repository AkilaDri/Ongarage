import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { allowedTypes, isNamedLine, useParts } from '../context/PartsContext';
import { money } from '../utils/format';
import type { Booking } from '../types';

/**
 * One line on a booking card: the parts state at a glance. The Parts tab is where
 * it is managed; this only starts a request or jumps there.
 */
export const PartsStatusLine: React.FC<{ booking: Booking; onRequest: () => void; onOpen: (requestId: string) => void }> = ({ booking, onRequest, onOpen }) => {
  const { requestFor, toOrderFor, quotes, orders } = useParts();
  const r = requestFor(booking.id);
  const toOrder = toOrderFor(booking);
  // Approved (or owner-named) parts not ordered yet: the next thing to do.
  const orderLine = toOrder.length > 0 && (
    <Pressable style={({ pressed }) => [styles.line, styles.lineAction, pressed && styles.pressed]} onPress={onRequest} accessibilityLabel="Order approved parts">
      <Text style={styles.text} numberOfLines={1}>
        🔩 {toOrder.every(isNamedLine) ? `අයිතිකරු සඳහන් කළ කොටස් ${toOrder.length}` : `අනුමත කොටස් ${toOrder.length}`} ක් ඇණවුම් කරන්න
      </Text>
      <Text style={styles.action}>›</Text>
    </Pressable>
  );

  if (!r) {
    // Workshop jobs: parts only once the owner approved them (or named them in the post).
    if (booking.progress) return orderLine || null;
    return (
      <Pressable style={({ pressed }) => [styles.line, pressed && styles.pressed]} onPress={onRequest}>
        <Text style={styles.text}>🔩 කොටස් අවශ්‍යද?</Text>
        <Text style={styles.action}>කොටස් ඉල්ලන්න ›</Text>
      </Pressable>
    );
  }

  const order = orders.find((o) => o.requestId === r.id && o.status !== 'unavailable' && o.status !== 'problem');
  const quoteCount = quotes.filter((q) => q.requestId === r.id && !q.withdrawn && allowedTypes(r).includes(q.partType)).length;
  const q = order && quotes.find((x) => x.id === order.quoteId);

  let text = '';
  let tone: 'muted' | 'action' | 'warn' | 'done' = 'muted';
  if (order?.status === 'ready') {
    text = order.collector?.hasApp
      ? `🧑‍🔧 ${order.collector.name} ${q?.shop.name ?? ''} වෙතින් එකතු කරමින්`
      : `🏪 ${q?.shop.name ?? ''} කවුන්ටරයේ සූදානම් · කේතය ${order.pickupCode}`;
    tone = 'action';
  } else if (r.status === 'received') {
    text = `✓ කොටස් ලැබුණා${booking.partsCost ? ` · ${money(booking.partsCost)}` : ''}`;
    tone = 'done';
  } else if (order?.status === 'arrived') {
    text = '📦 කොටස් පැමිණියා — පරීක්ෂා කරන්න';
    tone = 'action';
  } else if (order?.status === 'dispatched') {
    text = `🛵 කොටස් මගදී${q ? ` · ${q.shop.name}` : ''}`;
  } else if (order?.status === 'confirming') {
    text = '⏳ වෙළඳසැල තොග තහවුරු කරමින්';
  } else if (r.reconApproval === 'pending') {
    text = '📲 Recon සඳහා අයිතිකරුගේ අවසරය බලාපොරොත්තුවෙන්';
  } else if (quoteCount) {
    text = `🏷️ කොටස් මිල ගණන් ${quoteCount} ක් — තෝරන්න`;
    tone = 'action';
  } else if (r.searching) {
    text = '⏳ කොටස් මිල ගණන් ඉල්ලමින්…';
  } else {
    text = r.partType === 'Genuine' ? '⚠️ Genuine නොමැත — Recon අවසරය ඉල්ලන්න' : '⚠️ මිල ගණන් නැත';
    tone = 'warn';
  }

  return (
    <>
    <Pressable style={({ pressed }) => [styles.line, tone === 'action' && styles.lineAction, tone === 'warn' && styles.lineWarn, pressed && styles.pressed]} onPress={() => onOpen(r.id)}>
      <Text style={[styles.text, tone === 'done' && { color: Colors.successText }, tone === 'warn' && { color: Colors.warning }]} numberOfLines={1}>
        {text}
      </Text>
      <Text style={styles.action}>›</Text>
    </Pressable>
    {orderLine}
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.subtleFill },
    lineAction: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    lineWarn: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    pressed: { opacity: 0.7 },
    text: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    action: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
  })
);
