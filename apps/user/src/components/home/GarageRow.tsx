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
    title: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2 },
    arrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 3 },
    arrowText: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginTop: -2 },
    row: { gap: 12, paddingRight: 8 },
  })
);
