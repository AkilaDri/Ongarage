import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { CATEGORY_IMAGES } from '../../constants/home';

/** Categories as round photos in two rows that scroll sideways (like a food app's cuisines). */
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
              <View style={[styles.ring, { borderColor: c.color }]}>
                <Image source={CATEGORY_IMAGES[c.id]} style={styles.photo} />
              </View>
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
    strip: { gap: 6, paddingRight: 8 },
    column: { gap: 12 },
    item: { width: 78, alignItems: 'center', gap: 6 },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    ring: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, padding: 2, backgroundColor: Colors.bgCard },
    photo: { width: '100%', height: '100%', borderRadius: 30 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 14 },
  })
);
