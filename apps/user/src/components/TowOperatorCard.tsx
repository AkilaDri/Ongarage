import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, InfoChip, themedStyles, type TowOperator } from '@ongarage/shared';
import { cardGlow } from '../utils/material';

// No photos for tow operators yet: each gets its own colour cover with the truck, like the shops in OnMart.
const COVERS: { offset: string; color: string }[][] = [
  [{ offset: '0', color: '#2f5bd6' }, { offset: '1', color: '#0b1c52' }],
  [{ offset: '0', color: '#0f766e' }, { offset: '1', color: '#064e3b' }],
  [{ offset: '0', color: '#c2410c' }, { offset: '1', color: '#7c2d12' }],
  [{ offset: '0', color: '#6d28d9' }, { offset: '1', color: '#3b0764' }],
  [{ offset: '0', color: '#be123c' }, { offset: '1', color: '#4c0519' }],
];

/** The operator's cover: its own colour with the truck, in the card and at the top of its profile. */
export const TowCover: React.FC<{ index: number; height?: number }> = ({ index, height = 112 }) => (
  <View style={{ height, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    <Gradient stops={COVERS[index % COVERS.length]} />
    <Text style={{ fontSize: Math.round(height * 0.41) }}>🛻</Text>
  </View>
);

/**
 * A tow service shown like a garage's profile card in the service categories (the same big cover, name, rating, distance and reply time, then the chips that
 * decide a choice): its trucks, the price of this trip and whether it takes jobs right now. Touching it opens its profile (a tab of its own); a tick
 * shows the one that was chosen there.
 */
export const TowOperatorCard: React.FC<{
  op: TowOperator;
  index: number;
  etaMin: number;
  pickupKm: number;
  total: number;
  cheapest?: boolean;
  selected?: boolean;
  onPress: () => void;
}> = ({ op, index, etaMin, pickupKm, total, cheapest, selected, onPress }) => (
  <View style={[styles.card, selected && styles.cardOn]}>
    <Pressable onPress={onPress} accessibilityLabel={`Tow operator ${op.name}`} accessibilityState={{ selected: !!selected }}>
      <View>
        <TowCover index={index} />
        {cheapest && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>අඩුම මිල</Text>
          </View>
        )}
        <View style={styles.status}>
          <View style={[styles.statusDot, op.available ? styles.dotOn : styles.dotOff]} />
          <Text style={[styles.statusText, op.available ? styles.textOn : styles.textOff]}>{op.available ? 'Online' : 'Busy'}</Text>
        </View>
        {selected && (
          <View style={styles.tick}>
            <Text style={styles.tickText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{op.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            <Text style={styles.star}>★ {op.rating.toFixed(1)}</Text> ({op.reviews})
          </Text>
          <Text style={styles.meta}>📍 {pickupKm} km</Text>
          <Text style={styles.meta}>⏱️ ~මිනි. {etaMin}</Text>
        </View>
        <View style={styles.details}>
          <InfoChip text={`💰 රු. ${total.toLocaleString()}`} />
          {op.trucks.map((k) => (
            <InfoChip key={k} text={`🛻 ${k}`} />
          ))}
        </View>
      </View>
    </Pressable>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden', ...(cardGlow() as object) },
    cardOn: { borderColor: '#1a73e8' },
    badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.92)' },
    badgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#16a34a' },
    status: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    dotOn: { backgroundColor: '#16a34a' },
    dotOff: { backgroundColor: '#f59e0b' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodyBold },
    textOn: { color: '#137333' },
    textOff: { color: '#b45309' },
    tick: { position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    tickText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 16 },
    body: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
    name: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 },
    star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
    details: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  })
);
