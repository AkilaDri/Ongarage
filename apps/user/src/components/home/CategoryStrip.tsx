import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { CategoryPhoto } from './CategoryPhoto';
import { useRankedCategories } from '../../utils/rankedCategories';

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
export const CategoryStrip: React.FC<{
  onSelect: (c: ServiceCategory) => void;
  /** The chosen category (the job form): its box gets a blue ring. */
  selectedId?: string | null;
  /** An arrow at each edge, halfway down, nudges to say the tiles slide sideways (on by default, so every place the categories are shown has it). */
  scrollHint?: boolean;
  /** Only the categories this accepts are shown (the forms leave out what cannot be bid for or booked with a garage). */
  include?: (categoryId: string) => boolean;
}> = ({ onSelect, selectedId, scrollHint = true, include }) => {
  const scroller = useRef<ScrollView>(null);
  const [dims, setDims] = useState({ view: 0, content: 0, x: 0 });
  const nudge = useRef(new Animated.Value(0)).current;
  const more = scrollHint && dims.content - dims.view - dims.x > 24;
  const back = scrollHint && dims.x > 24;
  useEffect(() => {
    if (!scrollHint) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scrollHint, nudge]);
  // The common services come first (and the owner's own most-used move up): the first half of the order is the top row, the second half the bottom row.
  const order = useRankedCategories();
  const list = order.filter((c) => !include || include(c.id)).map((c) => SHOWN.find((x) => x.id === c.id)).filter((x): x is (typeof SHOWN)[number] => !!x);
  const half = Math.ceil(list.length / 2);
  const columns = list.slice(0, half).map((x, i) => [x, list[half + i]].filter(Boolean) as typeof list);

  const strip = (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      scrollEventThrottle={32}
      onLayout={(e) => setDims((d) => ({ ...d, view: e.nativeEvent.layout.width }))}
      onContentSizeChange={(w) => setDims((d) => ({ ...d, content: w }))}
      onScroll={(e) => setDims((d) => ({ ...d, x: e.nativeEvent.contentOffset.x }))}
    >
      {columns.map((col) => (
        <View key={col[0].id} style={styles.column}>
          {col.map((x) => {
            const c = SERVICE_CATEGORIES.find((k) => k.id === x.id)!;
            return (
              <Pressable key={x.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={() => onSelect(c)} accessibilityLabel={`Service ${c.name}`}>
                <View style={[styles.box, { backgroundColor: x.tint + '26', borderColor: 'transparent' }, selectedId === x.id && styles.boxOn]}>
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
  if (!scrollHint) return strip;
  return (
    <View>
      {strip}
      {/* A bare arrow at each edge, halfway down the two rows, nudging the way the tiles slide: right while there is more to the right, left once it has moved. */}
      {back && (
        <Animated.View style={[styles.hint, styles.hintLeft, { opacity: nudge.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
          <Pressable onPress={() => scroller.current?.scrollTo({ x: Math.max(0, dims.x - 220), animated: true })} hitSlop={10} accessibilityLabel="Slide back to the earlier services">
            <Text style={styles.hintArrow}>‹</Text>
          </Pressable>
        </Animated.View>
      )}
      {more && (
        <Animated.View style={[styles.hint, styles.hintRight, { opacity: nudge.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}>
          <Pressable onPress={() => scroller.current?.scrollTo({ x: Math.min(dims.content - dims.view, dims.x + 220), animated: true })} hitSlop={10} accessibilityLabel="Slide to see more services">
            <Text style={styles.hintArrow}>›</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    strip: { gap: 10, paddingRight: 16 },
    // The sideways hint: only the arrow, no disc behind it (a soft shadow keeps it readable on any tile).
    hint: { position: 'absolute', top: '42%', marginTop: -20 },
    hintRight: { right: 2 },
    hintLeft: { left: 2 },
    hintArrow: { fontSize: 40, lineHeight: 40, color: '#ffffff', fontFamily: FONTS.bodyRegular, fontWeight: '200', textShadowColor: 'rgba(0, 0, 0, 0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
    column: { gap: 12 },
    item: { width: 74, alignItems: 'center', gap: 4 },
    // A square box round the icon: a soft tint of the category's colour, rounded corners, no border (only the chosen one in a form gets a blue ring).
    box: { width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    boxOn: { borderWidth: 3, borderColor: '#1a73e8' },
    labelOn: { color: '#1a73e8' },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    // A fixed two-line height keeps every tile the same size, so the rows line up whether a name wraps or not.
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 22, height: 24, paddingTop: 2, paddingHorizontal: 2 },
  })
);
