import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, countdown, dealLabel, FONTS, money, themedStyles, softEdge, softShadow, type DealView } from '@ongarage/shared';

const EMOJI: Record<string, string> = { Brake: '🛑', Battery: '🔋', Engine: '🛢️', Oil: '🛢️', Alternator: '⚡', Radiator: '🌡️', Timing: '⚙️', Spark: '🔌', Headlight: '💡', Wiper: '🧽' };
const emojiFor = (name: string) => EMOJI[Object.keys(EMOJI).find((k) => name.startsWith(k)) ?? ''] ?? '🔩';

/** One deal as a product card: the −% badge, how long is left, the part, the shop, and the old and new price. */
const DealCard: React.FC<{ d: DealView; now: number; onOpen: (d: DealView) => void; wide?: boolean }> = ({ d, now, onOpen, wide }) => {
  const left = d.endsAt - now;
  const urgent = left < 12 * 60 * 60 * 1000;
  return (
    <Pressable style={({ pressed }) => [styles.card, wide && styles.cardWide, pressed && styles.pressed]} onPress={() => onOpen(d)} accessibilityLabel={`Deal ${d.deal.partName}`}>
      <View style={styles.top}>
        <Text style={styles.emoji}>{emojiFor(d.deal.partName)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{dealLabel(d.deal.discountPercent)}</Text>
        </View>
        <View style={[styles.timer, urgent && styles.timerUrgent]}>
          <Text style={[styles.timerText, urgent && { color: '#fff' }]}>⏳ {countdown(left)}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {d.deal.partName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {d.deal.partType} · {d.shop.name}
        </Text>
        <Text style={styles.meta}>
          {d.shop.distanceKm < 10 ? d.shop.distanceKm.toFixed(1) : Math.round(d.shop.distanceKm)} කි.මී.
          {d.left <= 3 ? ` · ⚠ ${d.left} ක් පමණි` : ''}
        </Text>
        <View style={styles.prices}>
          <Text style={styles.now}>{money(d.now)}</Text>
          <Text style={styles.was}>{money(d.was)}</Text>
        </View>
        <Text style={styles.save}>රු. {d.saving.toLocaleString()} ඉතිරියි</Text>
      </View>
    </Pressable>
  );
};

/** The shops' limited-time discounts near the owner as product cards in a sideways row; "සියල්ල" opens them all as a grid. */
export const DealsSection: React.FC<{ deals: DealView[]; now: number; onOpen: (d: DealView) => void }> = ({ deals, now, onOpen }) => {
  const [all, setAll] = useState(false);
  if (deals.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {deals.length > 3 && (
        <Pressable style={styles.toggle} onPress={() => setAll(!all)} accessibilityLabel="Toggle all deals">
          <Text style={styles.toggleText}>{all ? 'අඩුවෙන් ‹' : `සියලු දීමනා ${deals.length} ›`}</Text>
        </Pressable>
      )}
      {all ? (
        <View style={styles.grid}>
          {deals.map((d) => (
            <DealCard key={d.deal.id} d={d} now={now} onOpen={onOpen} wide />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {deals.slice(0, 6).map((d) => (
            <DealCard key={d.deal.id} d={d} now={now} onOpen={onOpen} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    toggle: { alignSelf: 'flex-end', paddingHorizontal: 4 },
    toggleText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    row: { gap: 10, paddingRight: 8, paddingBottom: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: { width: 160, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    cardWide: { width: '47.5%', flexGrow: 1 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    top: { height: 78, backgroundColor: 'rgba(239, 68, 68, 0.08)', alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 40 },
    badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: '#ef4444' },
    badgeText: { fontSize: 12, fontFamily: FONTS.titleBold, color: '#fff' },
    timer: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
    timerUrgent: { backgroundColor: '#f59e0b' },
    timerText: { fontSize: 9, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    body: { padding: 10, gap: 2 },
    name: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    prices: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
    now: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.successText },
    was: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textDecorationLine: 'line-through' },
    save: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
  })
);
