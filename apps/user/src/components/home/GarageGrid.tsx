import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DotScroll } from './DotScroll';
import { Colors, etaMinutes, FONTS, themedStyles, type Garage } from '@ongarage/shared';
import { GARAGE_COVERS } from '../../constants/home';
import { useSavedGarages } from '../../context/SavedGaragesContext';

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
  /** The first card of the first garage row on Home shows the one-time hint that the heart saves a garage. */
  hint?: boolean;
}> = ({ title, garages, ad, chips, activeChip, onChip, onSeeAll, onOpen, onSaveChange, hint }) => {
  const { width: screenW } = useWindowDimensions();
  // Two cards show in full and the third peeks in at the edge, so the row reads as scrollable (as the garage rows do).
  // A single garage (the owner has used only one) takes the full row; otherwise two show in full and the third peeks in.
  const cardW = garages.length === 1 ? screenW - 32 : Math.round((screenW - 32 - 12) / 1.9);
  if (!garages.length) return null;
  return (
    <View style={styles.section}>
      {/* The whole title is the "see all" button, with its arrow beside it: nothing tappable sits at the far right, where the floating OnChat logo travels. */}
      <Pressable style={styles.header} onPress={onSeeAll} hitSlop={8} accessibilityRole="button" accessibilityLabel={`See all ${title}`}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.seeAll}>›</Text>
      </Pressable>
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
        {garages.map((g, i) => (
          <GridCard key={g.id} garage={g} ad={ad} width={cardW} hint={!!hint && i === 0} onOpen={() => onOpen(g)} onSaveChange={(s) => onSaveChange(g, s)} />
        ))}
      </DotScroll>
    </View>
  );
};

const GridCard: React.FC<{ garage: Garage; ad?: boolean; width: number; hint?: boolean; onOpen: () => void; onSaveChange: (saved: boolean) => void }> = ({ garage: g, ad, width, hint, onOpen, onSaveChange }) => {
  const { isSaved, toggle, hintSeen, markHintSeen } = useSavedGarages();
  const saved = isSaved(g.id);
  const showHint = !!hint && !hintSeen;
  // The hint stays for a few seconds, once, then never again; saving a garage ends it at once.
  useEffect(() => {
    if (!showHint) return;
    const id = setTimeout(markHintSeen, 9000);
    return () => clearTimeout(id);
  }, [showHint, markHintSeen]);
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
            onSaveChange(toggle(g.id));
          }}
          hitSlop={4}
          style={styles.heart}
          accessibilityLabel={saved ? `Unsave ${g.name}` : `Save ${g.name}`}
          accessibilityState={{ checked: saved }}
        >
          <Text style={[styles.heartText, saved && styles.heartOn]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
        {showHint && (
          <View style={styles.hintBubble} pointerEvents="none" accessibilityLabel="Tip: the heart saves a garage">
            <Text style={styles.hintText}>♡ ගරාජ සුරකින්න</Text>
          </View>
        )}
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
    header: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 32 },
    title: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    seeAll: { fontSize: 22, lineHeight: 26, fontFamily: FONTS.bodyBold, color: Colors.primary },
    chips: { flexDirection: 'row', gap: 8 },
    chip: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    chipOn: { backgroundColor: '#1e3a8a' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    row: { gap: 12, paddingRight: 8 },
    card: { borderRadius: 16, backgroundColor: Colors.bgCard, overflow: 'hidden', borderWidth: 1, borderColor: Colors.subtleBorder },
    cardAd: { borderColor: '#f59e0b' },
    pressed: { opacity: 0.9 },
    cover: { width: '100%', height: 104 },
    adTag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#f59e0b' },
    adTagText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#111827' },
    heart: { position: 'absolute', right: 8, top: 8, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
    hintBubble: { position: 'absolute', right: 8, top: 58, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#1e3a8a' },
    hintText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    heartText: { fontSize: 18, color: Colors.textMuted },
    heartOn: { color: '#e5283c' },
    body: { padding: 12, gap: 4 },
    name: { fontSize: 14.5, lineHeight: 19, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    meta: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    eta: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  })
);
