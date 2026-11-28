import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, FONTS, themedStyles, type PartCategoryOption } from '@ongarage/shared';
import { PartCategoryIcon } from './PartCategoryGrid';
import { Sheet } from '../Sheet';

const BLUE = '#1e3a8a';

type TileProps = { c: PartCategoryOption; vehicleType: string; cell: number; onPress: () => void };

const Tile: React.FC<TileProps> = ({ c, vehicleType, cell, onPress }) => (
  <Pressable style={{ width: cell, alignItems: 'center', overflow: 'visible' }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Part group ${c.id}`}>
    <View style={[st.card, { width: cell, height: cell }]}>
      <PartCategoryIcon id={c.id} vehicleType={vehicleType} />
    </View>
    {/* The name may use part of the gap beside the tile, and takes a second line when it needs one. */}
    <Text style={[st.label, { width: cell + 14, maxWidth: cell + 14 }]} numberOfLines={2}>
      {c.short}
    </Text>
  </Pressable>
);

/** OnMart's "Quick Parts", drawn as Home's "Quick Booking": two rows of picture tiles that slide sideways, with a peek of the next column. */
export const PartTiles: React.FC<{ /** The active vehicle's part categories. */ categories: PartCategoryOption[]; vehicleType: string; onSelect: (c: PartCategoryOption) => void }> = ({ categories, vehicleType, onSelect }) => {
  const [width, setWidth] = useState(380);
  const cell = Math.floor((width - 42 - 20) / 4);
  const [x, setX] = useState(0);
  const [all, setAll] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const half = Math.ceil(categories.length / 2);
  const columns = categories.slice(0, half).map((c, i) => [c, categories[half + i]].filter(Boolean) as PartCategoryOption[]);
  // Another vehicle has another list: start it from the beginning.
  useEffect(() => {
    scroller.current?.scrollTo({ x: 0, animated: false });
    setX(0);
  }, [vehicleType]);
  const content = columns.length * (cell + 14);
  const step = (cell + 14) * 2;
  const arrow = (dir: -1 | 1) => (
    <Pressable style={[st.arrow, dir === 1 ? st.arrowRight : st.arrowLeft, { top: cell - 12 }]} onPress={() => scroller.current?.scrollTo({ x: Math.max(0, x + dir * step), animated: true })} hitSlop={8} accessibilityLabel={dir === 1 ? 'More parts' : 'Earlier parts'}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Path d={dir === 1 ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} stroke={BLUE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  );
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={st.head}>
        <Text style={st.title}>Quick Parts</Text>
        <Pressable onPress={() => setAll(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all parts">
          <Text style={st.seeAll}>
            සියල්ල {categories.length} <Text style={st.seeAllArrow}>›</Text>
          </Text>
        </Pressable>
      </View>
      <View>
        <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.strip} scrollEventThrottle={32} onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}>
          {columns.map((col) => (
            <View key={col[0].id} style={st.column}>
              {col.map((c) => (
                <Tile key={c.id} c={c} vehicleType={vehicleType} cell={cell} onPress={() => onSelect(c)} />
              ))}
            </View>
          ))}
        </ScrollView>
        {x > 16 && arrow(-1)}
        {content - width - x > 16 && arrow(1)}
      </View>
      <Sheet visible={all} title="සියලු කොටස් වර්ග" onClose={() => setAll(false)}>
        <View style={st.grid}>
          {categories.map((c) => (
            <Tile
              key={c.id}
              c={c}
              vehicleType={vehicleType}
              cell={cell}
              onPress={() => {
                setAll(false);
                onSelect(c);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
};

// The same measurements as Home's Quick Booking (components/home/HomeServices).
const st = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    seeAll: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: BLUE },
    seeAllArrow: { color: BLUE, fontSize: 18 },
    strip: { gap: 14, paddingRight: 8 },
    column: { gap: 14 },
    card: { alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    label: { marginTop: 6, height: 36, fontSize: 11.5, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
    arrow: { position: 'absolute', width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
    arrowRight: { right: -4 },
    arrowLeft: { left: -4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  })
);
