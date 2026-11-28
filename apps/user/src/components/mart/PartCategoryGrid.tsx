import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles, type PartCategoryOption } from '@ongarage/shared';

/**
 * The part category pictures, by category id. Empty for now, so every tile shows the placeholder. To add a picture, put the
 * file in assets/parts and add a line here, for example: brakes: require('../../../assets/parts/brakes.png').
 * An id means the same thing for every vehicle; use a key like 'Motorbike:brakes' where a vehicle needs its own picture.
 */
const PART_ART: Record<string, ImageSourcePropType> = {};

const SHOWN_FIRST = 7;

export const PartCategoryIcon: React.FC<{ id: string; vehicleType: string }> = ({ id, vehicleType }) => {
  const art = PART_ART[`${vehicleType}:${id}`] ?? PART_ART[id];
  if (art) return <Image source={art} style={styles.art} resizeMode="contain" />;
  return <View style={styles.dummy} />;
};

/** The vehicle's part categories in four columns: the first seven, then a "+N" tile that opens the rest. */
export const PartCategoryGrid: React.FC<{
  categories: PartCategoryOption[];
  vehicleType: string;
  selectedId?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (c: PartCategoryOption) => void;
}> = ({ categories, vehicleType, selectedId, expanded, onExpandedChange, onSelect }) => {
  // A choice from behind the fold (OnBuddy, a search) keeps the list open so it stays visible.
  const hiddenChoice = categories.findIndex((c) => c.id === selectedId) >= SHOWN_FIRST;
  const open = expanded || hiddenChoice;
  const shown = open ? categories : categories.slice(0, SHOWN_FIRST);
  const rest = categories.length - shown.length;
  return (
    <View>
      <View style={styles.grid}>
        {shown.map((c) => {
          const on = c.id === selectedId;
          return (
            <Pressable key={c.id} style={styles.item} onPress={() => onSelect(c)} accessibilityRole="button" accessibilityLabel={`Part category ${c.id}`} accessibilityState={{ selected: on }}>
              <View style={[styles.box, on && styles.boxOn]}>
                <PartCategoryIcon id={c.id} vehicleType={vehicleType} />
                {on && (
                  <View style={styles.tick}>
                    <Text style={styles.tickText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={2}>
                {c.short}
              </Text>
            </Pressable>
          );
        })}
        {rest > 0 && (
          <Pressable style={styles.item} onPress={() => onExpandedChange(true)} accessibilityRole="button" accessibilityLabel={`Show ${rest} more part categories`}>
            <View style={styles.box}>
              <Text style={styles.more}>{`+${rest}`}</Text>
            </View>
            <Text style={styles.label}>{`තවත් ${rest}`}</Text>
          </Pressable>
        )}
      </View>
      {open && !hiddenChoice && categories.length > SHOWN_FIRST + 1 && (
        <Pressable style={styles.fewer} onPress={() => onExpandedChange(false)} accessibilityRole="button" accessibilityLabel="Show fewer part categories">
          <Text style={styles.fewerText}>අඩුවෙන් පෙන්වන්න ⌃</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
    item: { width: '25%', alignItems: 'center', gap: 6 },
    box: { width: '86%', height: 68, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', backgroundColor: 'rgba(143, 155, 176, 0.14)' },
    boxOn: { borderColor: '#1a73e8' },
    art: { width: 52, height: 52 },
    // The placeholder until the real part pictures are added.
    dummy: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.textMuted },
    tick: { position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    tickText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    label: { alignSelf: 'stretch', paddingHorizontal: 2, fontSize: 11.5, lineHeight: 18, textAlign: 'center', fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    labelOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    more: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    fewer: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
    fewerText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
  })
);
