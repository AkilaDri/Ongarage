import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, getThemeMode, themedStyles, type Garage } from '@ongarage/shared';
import { GarageTile } from './GarageTile';
import { DotScroll } from './DotScroll';

/** A titled sideways row of garage tiles; the arrow opens the whole list. */
export const GarageRow: React.FC<{
  title: string;
  garages: Garage[];
  ad?: boolean;
  /** A short price hint per garage id — shown on cards that have one (e.g. what the owner paid last time). */
  priceHints?: Record<string, string>;
  onOpen: (g: Garage) => void;
  onSaveChange: (g: Garage, saved: boolean) => void;
  onSeeAll: () => void;
}> = ({ title, garages, ad, priceHints, onOpen, onSaveChange, onSeeAll }) => {
  if (!garages.length) return null;
  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={onSeeAll} accessibilityLabel={`See all ${title}`}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.seeAll}>සියල්ල ›</Text>
      </Pressable>
      <DotScroll contentContainerStyle={styles.row}>
        {garages.map((g) => (
          <GarageTile key={g.id} garage={g} ad={ad} priceHint={priceHints?.[g.id]} onOpen={() => onOpen(g)} onSaveChange={(s) => onSaveChange(g, s)} />
        ))}
      </DotScroll>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    section: { gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#e6f3fc' : '#0D2B3E', letterSpacing: 0.2 },
    // The same colour and size as the title: a text link, not a second big button in every section.
    seeAll: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#0E7C86', letterSpacing: 0.2 },
    row: { gap: 12, paddingRight: 8 },
  })
);
