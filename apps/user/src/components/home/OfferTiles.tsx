import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FONTS, Gradient, themedStyles } from '@ongarage/shared';
type Tile = { id: string; title: string; subtitle: string; emoji: string; stops: { offset: string; color: string }[] };

/** Colourful deal tiles in a sideways row: a short title, one line, a big emoji and an arrow. */
export const OfferTiles = <T extends Tile>({ offers, onOpen }: { offers: T[]; onOpen: (o: T) => void }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {offers.map((o) => (
      <Pressable key={o.id} style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={() => onOpen(o)} accessibilityLabel={`Offer ${o.title}`}>
        <Gradient stops={o.stops} />
        <Text style={styles.title}>{o.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {o.subtitle}
        </Text>
        <Text style={styles.emoji}>{o.emoji}</Text>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </Pressable>
    ))}
  </ScrollView>
);

// White text on fixed-colour gradients (the intended exception to theme colours).
const styles = themedStyles(() =>
  StyleSheet.create({
    row: { gap: 10, paddingRight: 8 },
    tile: { width: 132, height: 150, borderRadius: 18, overflow: 'hidden', padding: 12, gap: 2 },
    pressed: { opacity: 0.85 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
    subtitle: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 14 },
    emoji: { position: 'absolute', right: 8, bottom: 6, fontSize: 46 },
    arrow: { position: 'absolute', left: 12, bottom: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.9)', alignItems: 'center', justifyContent: 'center' },
    arrowText: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: -2 },
  })
);
