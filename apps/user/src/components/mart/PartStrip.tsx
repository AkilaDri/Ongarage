import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, PART_GROUPS, themedStyles, type PartGroup } from '@ongarage/shared';
import { CategoryPhoto } from '../home/CategoryPhoto';

/** The round strip of part groups (brakes, battery, oil and filters…): each opens a search for the part people mean by it. */
export const PartStrip: React.FC<{ onSelect: (g: PartGroup) => void }> = ({ onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
    {PART_GROUPS.map((g) => (
      <Pressable key={g.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={() => onSelect(g)} accessibilityLabel={`Part group ${g.id}`}>
        <View style={styles.photo}>
          <CategoryPhoto categoryId={g.serviceCategoryId} size={58} />
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{g.emoji}</Text>
          </View>
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {g.name}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    strip: { gap: 14, paddingRight: 16 },
    item: { width: 74, alignItems: 'center', gap: 4 },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    photo: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    badgeEmoji: { fontSize: 13 },
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 13, height: 26 },
  })
);
