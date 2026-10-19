import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';

/** How many categories the Home grid shows (three rows of four); "See all" opens the rest. */
const SHOWN = 12;

/** Categories as soft coloured icon tiles in a four-column grid (the rest are behind "See all"). */
export const CategoryStrip: React.FC<{ onSelect: (c: ServiceCategory) => void }> = ({ onSelect }) => (
  <View style={styles.grid}>
    {SERVICE_CATEGORIES.slice(0, SHOWN).map((c) => (
      <Pressable key={c.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={() => onSelect(c)} accessibilityLabel={`Service ${c.name}`}>
        <View style={[styles.tile, { backgroundColor: c.color + 'b8', shadowColor: c.color }]}>
          <Text style={styles.icon}>{c.icon}</Text>
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {c.name}
        </Text>
      </Pressable>
    ))}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    item: { width: '25%', alignItems: 'center', gap: 6 },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    tile: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 3 },
    icon: { fontSize: 28 },
    // A fixed two-line height keeps every tile the same size, so the rows line up whether a name wraps or not.
    label: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, textAlign: 'center', lineHeight: 14, height: 28, paddingHorizontal: 2 },
  })
);
