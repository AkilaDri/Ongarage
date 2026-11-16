import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DotScroll } from './DotScroll';
import { Colors, etaMinutes, FONTS, themedStyles, type Garage } from '@ongarage/shared';
import { GARAGE_COVERS } from '../../constants/home';

export type GridChip = { id: string; label: string };

/**
 * A titled section of garages in two columns (the Home layout): each card has its photo, a heart to save it,
 * the name, the rating with the distance, and how long the garage takes to reach. Paid placements carry a
 * "දැන්වීම" tag and an amber edge. Optional sort chips sit under the title.
 */
export const GarageGridSection: React.FC<{
  title: string;
  garages: Garage[];
  ad?: boolean;
  chips?: GridChip[];
  activeChip?: string;
  onChip?: (id: string) => void;
  onSeeAll: () => void;
  onOpen: (g: Garage) => void;
  onSaveChange: (g: Garage, saved: boolean) => void;
}> = ({ title, garages, ad, chips, activeChip, onChip, onSeeAll, onOpen, onSaveChange }) => {
  const { width: screenW } = useWindowDimensions();
  // Two cards show in full and the third peeks in at the edge, so the row reads as scrollable (as the garage rows do).
  // A single garage (the owner has used only one) takes the full row; otherwise two show in full and the third peeks in.
  const cardW = garages.length === 1 ? screenW - 32 : Math.round((screenW - 32 - 12) / 1.9);
  if (!garages.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityLabel={`See all ${title}`}>
          <Text style={styles.seeAll}>සියල්ල ›</Text>
        </Pressable>
      </View>
      {!!chips && (
        <View style={styles.chips}>
          {chips.map((c) => {
            const on = c.id === activeChip;
            return (
              <Pressable
                key={c.id}
                onPress={() => onChip?.(c.id)}
                accessibilityLabel={c.label}
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <DotScroll contentContainerStyle={styles.row}>
        {garages.map((g) => (
          <GridCard key={g.id} garage={g} ad={ad} width={cardW} onOpen={() => onOpen(g)} onSaveChange={(s) => onSaveChange(g, s)} />
        ))}
      </DotScroll>
    </View>
  );
};

const GridCard: React.FC<{ garage: Garage; ad?: boolean; width: number; onOpen: () => void; onSaveChange: (saved: boolean) => void }> = ({ garage: g, ad, width, onOpen, onSaveChange }) => {
  const [saved, setSaved] = useState(false);
  const eta = etaMinutes(g.distance);
  return (
    <Pressable style={({ pressed }) => [styles.card, { width }, ad && styles.cardAd, pressed && styles.pressed]} onPress={onOpen} accessibilityLabel={`Garage ${g.name}`}>
      <View>
        <Image source={GARAGE_COVERS[g.id] ?? { uri: g.photos?.[0] }} style={styles.cover} resizeMode="cover" />
        {ad && (
          <View style={styles.adTag}>
            <Text style={styles.adTagText}>දැන්වීම</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            const next = !saved;
            setSaved(next);
            onSaveChange(next);
          }}
          hitSlop={8}
          style={styles.heart}
          accessibilityLabel={saved ? `Unsave ${g.name}` : `Save ${g.name}`}
          accessibilityState={{ checked: saved }}
        >
          <Text style={[styles.heartText, saved && styles.heartOn]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {g.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          ★ {g.rating.toFixed(1)} ({g.reviews})
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {g.distance} km · විනාඩි {eta}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    section: { gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    seeAll: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    chips: { flexDirection: 'row', gap: 8 },
    chip: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    chipOn: { backgroundColor: '#1e3a8a' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    row: { gap: 12, paddingRight: 8 },
    card: { borderRadius: 18, backgroundColor: Colors.bgCard, overflow: 'hidden', borderWidth: 1, borderColor: Colors.subtleBorder },
    cardAd: { borderColor: '#f59e0b' },
    pressed: { opacity: 0.9 },
    cover: { width: '100%', height: 104 },
    adTag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#f59e0b' },
    adTagText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#111827' },
    heart: { position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
    heartText: { fontSize: 16, color: Colors.textMuted },
    heartOn: { color: '#e5283c' },
    body: { padding: 12, gap: 4 },
    name: { fontSize: 14.5, lineHeight: 19, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    meta: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    eta: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  })
);
