import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { CategoryPhoto } from './CategoryPhoto';

/** Each category's short name and the colour of its tile. */
const SHOWN: { id: string; label: string; tint: string }[] = [
  { id: '1', label: 'Mechanic', tint: '#6fb0ea' },
  { id: '2', label: 'විදුලි', tint: '#e5b04b' },
  { id: '3', label: 'හයිබ්‍රිඩ්', tint: '#59b08c' },
  { id: '4', label: 'AC', tint: '#7ec8e8' },
  { id: '8', label: 'පින්තාරු', tint: '#6a7fe0' },
  { id: '9', label: 'සේදීම', tint: '#75c5d6' },
  { id: '10', label: 'Tuning', tint: '#4f9f86' },
  { id: '11', label: 'බැටරි', tint: '#e0a243' },
  { id: '6', label: 'ටයර්', tint: '#8c95a6' },
  { id: '7', label: 'බ්‍රේක්', tint: '#e5675f' },
  { id: '5', label: 'ස්කෑන්', tint: '#a676e0' },
  { id: '12', label: 'Towing', tint: '#f0a45a' },
  { id: '13', label: 'EV', tint: '#5fc27a' },
  { id: '15', label: 'සවි කිරීම', tint: '#3fb5a8' },
  { id: '14', label: 'සේවාව', tint: '#9aa7b8' },
  { id: '16', label: 'Fuel Station', tint: '#ef6b5f' },
];

/** All the categories in two rows that slide sideways, the way PickMe's home shows its services: a big illustration on a soft pastel tile, the name under it. */
export const CategoryStrip: React.FC<{ onSelect: (c: ServiceCategory) => void; /** The chosen category (the job form): its box gets a blue ring. */ selectedId?: string | null }> = ({ onSelect, selectedId }) => {
  // Two rows read left to right: the first half on top, the second half below.
  const list = SHOWN.filter((x) => SERVICE_CATEGORIES.some((k) => k.id === x.id));
  const half = Math.ceil(list.length / 2);
  const columns = list.slice(0, half).map((x, i) => [x, list[half + i]].filter(Boolean) as typeof list);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {columns.map((col) => (
        <View key={col[0].id} style={styles.column}>
          {col.map((x) => {
            const c = SERVICE_CATEGORIES.find((k) => k.id === x.id)!;
            return (
              <Pressable key={x.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={() => onSelect(c)} accessibilityLabel={`Service ${c.name}`}>
                <View style={[styles.box, { backgroundColor: x.tint + '26', borderColor: x.tint + '80' }, selectedId === x.id && styles.boxOn]}>
                  <CategoryPhoto categoryId={c.id} size={62} />
                </View>
                <Text style={[styles.label, selectedId === x.id && styles.labelOn]} numberOfLines={1}>
                  {x.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    strip: { gap: 10, paddingRight: 16 },
    column: { gap: 12 },
    item: { width: 74, alignItems: 'center', gap: 4 },
    // A square box round the icon: a soft tint of the category's colour, a thin border in the same colour, rounded corners.
    box: { width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    boxOn: { borderWidth: 3, borderColor: '#1a73e8' },
    labelOn: { color: '#1a73e8' },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    // A fixed two-line height keeps every tile the same size, so the rows line up whether a name wraps or not.
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 22, height: 24, paddingTop: 2, paddingHorizontal: 2 },
  })
);
