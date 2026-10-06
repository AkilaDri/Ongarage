import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, type Garage } from '@ongarage/shared';
import { GarageTile } from './GarageTile';

/** A titled sideways row of garage tiles; the arrow opens the whole list. */
export const GarageRow: React.FC<{
  title: string;
  garages: Garage[];
  ad?: boolean;
  onOpen: (g: Garage) => void;
  onSaveChange: (g: Garage, saved: boolean) => void;
  onSeeAll: () => void;
}> = ({ title, garages, ad, onOpen, onSaveChange, onSeeAll }) => {
  if (!garages.length) return null;
  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={onSeeAll} accessibilityLabel={`See all ${title}`}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {garages.map((g) => (
          <GarageTile key={g.id} garage={g} ad={ad} onOpen={() => onOpen(g)} onSaveChange={(s) => onSaveChange(g, s)} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    section: { gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    arrowText: { fontSize: 17, fontWeight: '800', color: Colors.textMain, marginTop: -2 },
    row: { gap: 12, paddingRight: 8 },
  })
);
