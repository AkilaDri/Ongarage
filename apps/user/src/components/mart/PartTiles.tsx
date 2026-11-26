import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, FONTS, themedStyles, type PartGroup } from '@ongarage/shared';
import { CategoryPhoto } from '../home/CategoryPhoto';
import { Sheet } from '../Sheet';

const BLUE = '#1e3a8a';

/** The Home picture that stands for each part group. A group with no picture of its own shows its icon, so no two tiles share a picture. */
const TILE_PHOTO: Record<string, string> = { brakes: '7', battery: '11', oil: '14', electrical: '2', ac: '4', engine: '1', hybrid: '3' };
/** Names short enough for one line under a tile. */
const TILE_LABEL: Record<string, string> = { oil: 'ඔයිල්' };

const Tile: React.FC<{ g: PartGroup; cell: number; onPress: () => void }> = ({ g, cell, onPress }) => (
  <Pressable style={{ width: cell, alignItems: 'center' }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Part group ${g.id}`}>
    <View style={[st.card, { width: cell, height: cell }]}>
      {TILE_PHOTO[g.id] ? <CategoryPhoto categoryId={TILE_PHOTO[g.id]} size={Math.round(cell * 0.72)} /> : <Text style={{ fontSize: Math.round(cell * 0.42) }}>{g.emoji}</Text>}
    </View>
    <Text style={st.label} numberOfLines={1}>
      {TILE_LABEL[g.id] ?? g.name}
    </Text>
  </Pressable>
);

/** OnMart's "Quick Parts", drawn as Home's "Quick Booking": two rows of picture tiles that slide sideways, with a peek of the next column. */
export const PartTiles: React.FC<{ groups: PartGroup[]; onSelect: (g: PartGroup) => void }> = ({ groups, onSelect }) => {
  const [width, setWidth] = useState(380);
  const cell = Math.floor((width - 30 - 22) / 4);
  const [x, setX] = useState(0);
  const [all, setAll] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const half = Math.ceil(groups.length / 2);
  const columns = groups.slice(0, half).map((g, i) => [g, groups[half + i]].filter(Boolean) as PartGroup[]);
  const content = columns.length * (cell + 10);
  const step = (cell + 10) * 2;
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
            සියල්ල {groups.length} <Text style={st.seeAllArrow}>›</Text>
          </Text>
        </Pressable>
      </View>
      <View>
        <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.strip} scrollEventThrottle={32} onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}>
          {columns.map((col) => (
            <View key={col[0].id} style={st.column}>
              {col.map((g) => (
                <Tile key={g.id} g={g} cell={cell} onPress={() => onSelect(g)} />
              ))}
            </View>
          ))}
        </ScrollView>
        {x > 16 && arrow(-1)}
        {content - width - x > 16 && arrow(1)}
      </View>
      <Sheet visible={all} title="සියලු කොටස් වර්ග" onClose={() => setAll(false)}>
        <View style={st.grid}>
          {groups.map((g) => (
            <Tile
              key={g.id}
              g={g}
              cell={cell}
              onPress={() => {
                setAll(false);
                onSelect(g);
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
    strip: { gap: 10, paddingRight: 4 },
    column: { gap: 14 },
    card: { alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    label: { marginTop: 6, fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
    arrow: { position: 'absolute', width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
    arrowRight: { right: -4 },
    arrowLeft: { left: -4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 14 },
  })
);
