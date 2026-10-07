import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { CategoryPhoto } from './CategoryPhoto';

/** Categories as cut-out artwork in two rows that scroll sideways (like a food app's cuisines). */
export const CategoryStrip: React.FC<{ onSelect: (c: ServiceCategory) => void }> = ({ onSelect }) => {
  // Two rows read left to right: the first half on top, the second half below.
  const half = Math.ceil(SERVICE_CATEGORIES.length / 2);
  const columns: ServiceCategory[][] = SERVICE_CATEGORIES.slice(0, half).map((c, i) => [c, SERVICE_CATEGORIES[half + i]].filter(Boolean));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {columns.map((col) => (
        <View key={col[0].id} style={styles.column}>
          {col.map((c) => (
            <Pressable key={c.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={() => onSelect(c)} accessibilityLabel={`Service ${c.name}`}>
              <CategoryPhoto categoryId={c.id} size={58} />
              <Text style={styles.label} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    strip: { gap: 18, paddingRight: 16 },
    column: { gap: 8 },
    item: { width: 74, alignItems: 'center', gap: 4 },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    // A fixed two-line height keeps every item the same size, so the rows line up whether a name wraps or not.
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 13, height: 26 },
  })
);
