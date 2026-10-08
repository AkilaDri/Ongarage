import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FONTS, Gradient, money, themedStyles, type KitOffer, type ServiceKit } from '@ongarage/shared';

const COVERS: { offset: string; color: string }[][] = [
  [{ offset: '0', color: '#0ea5e9' }, { offset: '1', color: '#22d3ee' }],
  [{ offset: '0', color: '#f97316' }, { offset: '1', color: '#f59e0b' }],
  [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }],
];

/** Service kits as cards: what the kit holds, and the best total among the nearby shops that have every part. */
export const KitCards: React.FC<{ kits: ServiceKit[]; best: Record<string, KitOffer | undefined>; onOpen: (k: ServiceKit) => void }> = ({ kits, best, onOpen }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {kits.map((k, i) => {
      const b = best[k.id];
      return (
        <Pressable key={k.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => onOpen(k)} accessibilityLabel={`Kit ${k.id}`}>
          <Gradient stops={COVERS[i % COVERS.length]} />
          <Text style={styles.emoji}>{k.icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {k.name}
          </Text>
          <Text style={styles.lines} numberOfLines={2}>
            {k.lines.map((l) => l.name).join(' · ')}
          </Text>
          <View style={styles.price}>
            <Text style={styles.priceText}>{b?.complete ? `${money(b.total)} සිට` : 'මිල බලන්න'}</Text>
          </View>
        </Pressable>
      );
    })}
  </ScrollView>
);

// White text on fixed-colour gradients (the intended exception to theme colours).
const styles = themedStyles(() =>
  StyleSheet.create({
    row: { gap: 10, paddingRight: 8 },
    card: { width: 170, height: 132, borderRadius: 18, overflow: 'hidden', padding: 12, gap: 3 },
    pressed: { opacity: 0.88 },
    emoji: { position: 'absolute', right: 8, top: 6, fontSize: 40, opacity: 0.9 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff', paddingRight: 44 },
    lines: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.92)', lineHeight: 14 },
    price: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
    priceText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#0f172a' },
  })
);
