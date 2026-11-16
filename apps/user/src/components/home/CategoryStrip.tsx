import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { CategoryPhoto } from './CategoryPhoto';
import { useRankedCategories } from '../../utils/rankedCategories';

/** Each category's short name and the colour of its tile. */
const SHOWN: { id: string; label: string; tint: string }[] = [
  { id: '1', label: 'මැකනිකල්', tint: '#6fb0ea' },
  { id: '2', label: 'විදුලි', tint: '#e5b04b' },
  { id: '3', label: 'හයිබ්‍රිඩ්', tint: '#59b08c' },
  { id: '4', label: 'AC', tint: '#7ec8e8' },
  { id: '8', label: 'පින්තාරු', tint: '#6a7fe0' },
  { id: '9', label: 'සේදීම', tint: '#75c5d6' },
  { id: '10', label: 'ටියුනින්', tint: '#4f9f86' },
  { id: '11', label: 'බැටරි', tint: '#e0a243' },
  { id: '6', label: 'ටයර්', tint: '#8c95a6' },
  { id: '7', label: 'බ්‍රේක්', tint: '#e5675f' },
  { id: '5', label: 'ස්කෑන්', tint: '#a676e0' },
  { id: '12', label: 'ටෝ', tint: '#f0a45a' },
  { id: '13', label: 'ඉලෙක්ට්‍රික්', tint: '#5fc27a' },
  { id: '15', label: 'සවි කිරීම', tint: '#3fb5a8' },
  { id: '14', label: 'සේවාව', tint: '#9aa7b8' },
  { id: '16', label: 'ඉන්ධන', tint: '#ef6b5f' },
];

/** The short name a category shows in the strip (used wherever the category is named, so the owner sees one name). */
export const shortCategoryName = (categoryId: string): string | undefined => SHOWN.find((x) => x.id === categoryId)?.label;

/** All the categories in two rows that slide sideways, the way PickMe's home shows its services: a big illustration on a soft pastel tile, the name under it. */
export const CategoryStrip: React.FC<{
  onSelect: (c: ServiceCategory) => void;
  /** The chosen category (the job form): its box gets a blue ring. */
  selectedId?: string | null;
  /** An arrow at each edge, halfway down, nudges to say the tiles slide sideways (on by default, so every place the categories are shown has it). */
  scrollHint?: boolean;
  /** Only the categories this accepts are shown (the forms leave out what cannot be bid for or booked with a garage). */
  include?: (categoryId: string) => boolean;
  /** 'strip' slides sideways (Home); 'grid' shows every category in three columns (the forms). */
  layout?: 'strip' | 'grid';
  /** The category an assistant suggested (OnBuddy): marked, but the owner still chooses. */
  suggestedId?: string | null;
  /** Home's brand look: one soft teal tile for every category, navy labels and a teal arrow (the emoji keep their own colours). */
  brand?: boolean;
  /** Grid only: how many tiles fill a row. */
  columns?: number;
  /** Grid only: show this many categories, then a tile that opens the rest (progressive disclosure). */
  collapsedCount?: number;
  /** Grid only: the open state when the parent keeps it (so it can show its own "fewer" link). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}> = ({ onSelect, selectedId, scrollHint = true, include, layout = 'strip', suggestedId, brand = false, columns = 3, collapsedCount, expanded: expandedProp, onExpandedChange }) => {
  const scroller = useRef<ScrollView>(null);
  const [expandedLocal, setExpandedLocal] = useState(false);
  const expanded = expandedProp ?? expandedLocal;
  const setExpanded = (v: boolean) => (onExpandedChange ? onExpandedChange(v) : setExpandedLocal(v));
  const [dims, setDims] = useState({ view: 0, content: 0, x: 0 });
  const nudge = useRef(new Animated.Value(0)).current;
  // The arrows wake up while the pointer is over the strip; elsewhere they sit faint so they blend into the background.
  const [hovering, setHovering] = useState(false);
  const fade = useRef(new Animated.Value(0.12)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: hovering ? 1 : 0.12, duration: 220, useNativeDriver: true }).start();
  }, [hovering, fade]);
  const more = scrollHint && dims.content - dims.view - dims.x > 24;
  const back = scrollHint && dims.x > 24;
  useEffect(() => {
    if (!scrollHint || !hovering) {
      nudge.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scrollHint, hovering, nudge]);
  // The common services come first (and the owner's own most-used move up): the first half of the order is the top row, the second half the bottom row.
  const order = useRankedCategories();
  const list = order.filter((c) => !include || include(c.id)).map((c) => SHOWN.find((x) => x.id === c.id)).filter((x): x is (typeof SHOWN)[number] => !!x);
  const half = Math.ceil(list.length / 2);
  const rows = list.slice(0, half).map((x, i) => [x, list[half + i]].filter(Boolean) as typeof list);

  const tile = (x: (typeof list)[number], grid = false) => {
    const c = SERVICE_CATEGORIES.find((k) => k.id === x.id)!;
    return (
      <Pressable key={x.id} style={({ pressed }) => [styles.item, brand && styles.brandItem, grid && [styles.gridItem, { width: `${100 / columns}%` }], pressed && styles.pressed, brand && pressed && styles.brandPressed]} onPress={() => onSelect(c)} accessibilityLabel={`Service ${c.name}`}>
                <View style={[styles.box, grid && styles.gridBox, brand ? { backgroundColor: 'transparent', borderColor: 'transparent' } : { backgroundColor: x.tint + (grid && selectedId === x.id ? '55' : grid ? '33' : '26'), borderColor: 'transparent' }, selectedId === x.id && (grid ? styles.gridBoxOn : styles.boxOn), suggestedId === x.id && styles.boxSuggested]}>
                  <CategoryPhoto categoryId={c.id} size={grid ? 60 : 62} />
                  {/* The grid's chosen category gets the SOS breakdown's tick: a disc on the tile's top-right corner. */}
                  {grid && selectedId === x.id && (
                    <View style={styles.gridTick}>
                      <Text style={styles.gridTickText}>✓</Text>
                    </View>
                  )}
                </View>
                {suggestedId === x.id && (
                  <View style={styles.suggestBadge} accessibilityLabel="Suggested by OnBuddy">
                    <Text style={styles.suggestBadgeText}>✨</Text>
                  </View>
                )}
                <Text style={[styles.label, brand && styles.labelBrand, selectedId === x.id && styles.labelOn]} numberOfLines={1}>
                  {x.label}
                </Text>
      </Pressable>
    );
  };

  if (layout === 'grid') {
    const folded = !!collapsedCount && !expanded && list.length > collapsedCount;
    const shown = folded ? list.slice(0, collapsedCount) : list;
    return (
      <View style={styles.gridWrap}>
        {shown.map((x) => tile(x, true))}
        {folded && (
          <Pressable style={[styles.item, styles.gridItem, { width: `${100 / columns}%` }]} onPress={() => setExpanded(true)} accessibilityLabel={`Show ${list.length - shown.length} more categories`}>
            <View style={[styles.box, styles.gridBox, styles.moreBox]}>
              <Text style={styles.moreCount}>{`+${list.length - shown.length}`}</Text>
            </View>
            <Text style={styles.label} numberOfLines={1}>{`තවත් ${list.length - shown.length}`}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const strip = (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={brand && styles.brandStrip}
      contentContainerStyle={styles.strip}
      scrollEventThrottle={32}
      onLayout={(e) => setDims((d) => ({ ...d, view: e.nativeEvent.layout.width }))}
      onContentSizeChange={(w) => setDims((d) => ({ ...d, content: w }))}
      onScroll={(e) => setDims((d) => ({ ...d, x: e.nativeEvent.contentOffset.x }))}
    >
      {rows.map((col) => (
        <View key={col[0].id} style={styles.column}>
          {col.map((x) => tile(x))}
        </View>
      ))}
    </ScrollView>
  );
  if (!scrollHint) return strip;
  return (
    <View onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)}>
      {strip}
      {/* A bare arrow at each edge, halfway down the two rows, nudging the way the tiles slide: right while there is more to the right, left once it has moved. */}
      {back && (
        <Animated.View style={[styles.hint, styles.hintLeft, { opacity: fade, transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
          <Pressable onPress={() => scroller.current?.scrollTo({ x: Math.max(0, dims.x - 220), animated: true })} hitSlop={10} accessibilityLabel="Slide back to the earlier services">
            <Text style={[styles.hintArrow, brand && styles.hintArrowBrand]}>‹</Text>
          </Pressable>
        </Animated.View>
      )}
      {more && (
        <Animated.View style={[styles.hint, styles.hintRight, { opacity: fade, transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}>
          <Pressable onPress={() => scroller.current?.scrollTo({ x: Math.min(dims.content - dims.view, dims.x + 220), animated: true })} hitSlop={10} accessibilityLabel="Slide to see more services">
            <Text style={[styles.hintArrow, brand && styles.hintArrowBrand]}>›</Text>
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
    hint: { position: 'absolute', top: '50%', marginTop: -20 },
    hintRight: { right: 2 },
    hintLeft: { left: 2 },
    hintArrow: { fontSize: 40, lineHeight: 40, color: '#ffffff', fontFamily: FONTS.bodyRegular, fontWeight: '200', textShadowColor: 'rgba(0, 0, 0, 0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
    column: { gap: 12 },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
    gridItem: { paddingHorizontal: 4 },
    gridBox: { width: '100%', height: 74, borderRadius: 12, overflow: 'visible' },
    gridBoxOn: { borderWidth: 3, borderColor: '#1a73e8' },
    gridTick: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
    gridTickText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    moreBox: { backgroundColor: 'rgba(143, 155, 176, 0.18)' },
    moreCount: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    item: { width: 74, alignItems: 'center', gap: 4 },
    // Home's tiles are wider so a full Sinhala name (such as මැකනිකල්) fits on one line.
    brandItem: { width: 92 },
    // The 92px tile centres its 72px box, leaving 10px either side; pulling the strip back by that puts the first icon box flush with the Repair card's edge.
    brandStrip: { marginLeft: -10 },
    // A square box round the icon: a soft tint of the category's colour, rounded corners, no border (only the chosen one in a form gets a blue ring).
    box: { width: 72, height: 72, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    boxOn: { borderWidth: 3, borderColor: '#1a73e8' },
    // The assistant's suggestion: a dashed amber edge and a sparkle, so it is not mistaken for the owner's own choice (the blue ring).
    boxSuggested: { borderWidth: 2, borderColor: '#f59e0b', borderStyle: 'dashed' },
    suggestBadge: { position: 'absolute', top: -4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    suggestBadgeText: { fontSize: 12 },
    labelOn: { color: '#1a73e8' },
    // Brand labels are a quiet caption under the icon: regular weight, a slate grey (not navy), so the icons carry the strip.
    labelBrand: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? 'rgba(230, 243, 252, 0.72)' : '#4A5A68' },
    hintArrowBrand: { color: getThemeMode() === 'dark' ? 'rgba(230, 243, 252, 0.45)' : 'rgba(74, 90, 104, 0.6)', textShadowRadius: 0, textShadowColor: 'transparent' },
    pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    brandPressed: { opacity: 0.85 },
    // A fixed two-line height keeps every tile the same size, so the rows line up whether a name wraps or not.
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 22, height: 24, paddingTop: 2, paddingHorizontal: 2 },
  })
);
