import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CategoryPhoto } from './CategoryPhoto';
import { categoriesForVehicle, Colors, FONTS, Gradient, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';

/**
 * Home's service grid and the promo banner, written with plain styles (the theme does not reshape or rescale them) so they match the design exactly:
 * two rows of white cards that slide sideways (four columns show at a time), each with its blue and yellow service picture on a soft square, the chosen one in blue; then the blue "special offer" banner.
 */

const BLUE = '#1e3a8a';
const GOLD = BLUE; // the chevrons sit on white, where yellow is too faint

/** Every service, the design's eight first. The first half is the top row, the second half the bottom row; the two rows slide sideways together. */
const ALL_SERVICES: { id: string; label: string }[] = [
  { id: '14', label: 'සේවාව' },
  { id: '6', label: 'ටයර්' },
  { id: '7', label: 'බ්‍රේක්' },
  { id: '11', label: 'බැටරි' },
  { id: '4', label: 'AC' },
  { id: '5', label: 'ස්කෑන්' },
  { id: '1', label: 'Mechanic' },
  { id: '3', label: 'හයිබ්‍රිඩ්' },
  { id: '2', label: 'විදුලි' },
  { id: '8', label: 'පින්තාරු' },
  { id: '9', label: 'සේදීම' },
  { id: '10', label: 'Tuning' },
  { id: '12', label: 'Towing' },
  { id: '13', label: 'EV' },
  { id: '15', label: 'සවි කිරීම' },
  { id: '16', label: 'Fuel Station' },
  { id: 'b1', label: 'යාන්ත්‍රික' },
  { id: 'b2', label: 'ස්කූටර්' },
  { id: 'b3', label: 'එන්ජින්' },
  { id: 'b4', label: 'කූලින්' },
  { id: 'b5', label: 'EFI' },
  { id: 'b6', label: 'EV' },
  { id: 'b7', label: 'විදුලි' },
  { id: 'b8', label: 'මීටර්' },
  { id: 'b9', label: 'සස්පෙන්ෂන්' },
  { id: 'b10', label: 'රිම් ටයර්' },
  { id: 'b11', label: 'පේන්ට්' },
  { id: 'b12', label: 'යතුරු' },
  { id: 'b13', label: 'සයිලන්සර්' },
  { id: 'b14', label: 'සර්විස්' },
  { id: 't1', label: 'ත්‍රීවීල්' },
  { id: 't2', label: 'එන්ජින්' },
  { id: 't3', label: 'LPG' },
  { id: 't4', label: 'ටින්කරින්' },
  { id: 't5', label: 'පේන්ට්' },
  { id: 't6', label: 'හුඩ්' },
  { id: 't7', label: 'සස්පෙන්ෂන්' },
  { id: 't8', label: 'විදුලි' },
  { id: 't9', label: 'ටැක්සි මීටර්' },
  { id: 't10', label: 'ඕඩියෝ' },
  { id: 't11', label: 'රිම්' },
  { id: 't12', label: 'වීදුරු' },
  { id: 't13', label: 'සර්විස්' },
  { id: 't14', label: 'Dealer' },
  { id: 't15', label: 'Custom' },
];
/** Not offered in Quick Booking (the grid and its all-services list): EV charging and fuel stations are places, not garage services. */
export const HIDDEN_FROM_QUICK_BOOKING = ['13', '16'];

export const HomeServices: React.FC<{ onSelect: (c: ServiceCategory) => void; onSeeAll: () => void }> = ({ onSelect, onSeeAll }) => {
  // The services follow the active vehicle: a motorbike or three-wheeler, a bus or a lorry each get their own list.
  const { activeVehicle } = useVehicles();
  const allowed = categoriesForVehicle(activeVehicle.type);
  const SERVICES = ALL_SERVICES.filter((s) => allowed.includes(s.id) && !HIDDEN_FROM_QUICK_BOOKING.includes(s.id));
  const HALF = Math.ceil(SERVICES.length / 2);
  const COLUMNS = SERVICES.slice(0, HALF).map((x, i) => [x, SERVICES[HALF + i]].filter(Boolean) as typeof SERVICES);
  const [width, setWidth] = useState(358);
  const [chosen, setChosen] = useState<string | null>(null);
  const cell = Math.floor((width - 30 - 22) / 4); // four columns and a peek of the fifth, so it is clear the rows slide
  // The sideways hint: a round arrow at the edge that nudges the way the rows slide, so the owner can see there is more to scroll to.
  const scroller = useRef<ScrollView>(null);
  const [dims, setDims] = useState({ view: 0, content: 0, x: 0 });
  const nudge = useRef(new Animated.Value(0)).current;
  const more = dims.content - dims.view - dims.x > 16;
  const back = dims.x > 16;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);
  const stepPx = cell * 2 + 12;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={st.head}>
        <Text style={st.title}>Quick Booking</Text>
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityLabel="See all services">
          <Text style={st.seeAll}>
            සියල්ල {SERVICES.length} <Text style={st.seeAllArrow}>›</Text>
          </Text>
        </Pressable>
      </View>
      <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.strip}
        scrollEventThrottle={32}
        onLayout={(e) => setDims((d) => ({ ...d, view: e.nativeEvent.layout.width }))}
        onContentSizeChange={(w) => setDims((d) => ({ ...d, content: w }))}
        onScroll={(e) => setDims((d) => ({ ...d, x: e.nativeEvent.contentOffset.x }))}
      >
        {COLUMNS.map((col) => (
          <View key={col[0].id} style={st.column}>
            {col.map(({ id, label }) => {
              const on = chosen === id;
              return (
                <Pressable
                  key={id}
                  style={{ width: cell, alignItems: 'center' }}
                  onPress={() => {
                    setChosen(id);
                    const c = SERVICE_CATEGORIES.find((k) => k.id === id);
                    if (c) onSelect(c);
                  }}
                  accessibilityLabel={`Service ${label}`}
                >
                  {/* The picture sits alone in the card; its name is written under the card. */}
                  <View style={[st.card, { width: cell, height: cell }, on && st.cardOn]}>
                    <CategoryPhoto categoryId={id} size={Math.round(cell * 0.72)} />
                  </View>
                  <Text style={[st.label, /[A-Za-z]/.test(label) && st.labelLatin, on && st.labelOn]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      {back && (
        <Animated.View style={[st.arrowWrap, st.arrowLeft, { opacity: nudge.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}>
          <Pressable style={st.arrow} onPress={() => scroller.current?.scrollTo({ x: Math.max(0, dims.x - stepPx), animated: true })} hitSlop={8} accessibilityLabel="Slide back to the earlier services">
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path d="M15 5l-7 7 7 7" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
        </Animated.View>
      )}
      {more && (
        <Animated.View style={[st.arrowWrap, st.arrowRight, { opacity: nudge.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }]}>
          <Pressable style={st.arrow} onPress={() => scroller.current?.scrollTo({ x: Math.min(dims.content - dims.view, dims.x + stepPx), animated: true })} hitSlop={8} accessibilityLabel="Slide to see more services">
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path d="M9 5l7 7-7 7" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
        </Animated.View>
      )}
      </View>
    </View>
  );
};

/** The blue "special offer" banner under the grid. */
export const HomePromo: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { width } = useWindowDimensions();
  // One scale for the whole card, so it keeps this look on every phone: 1 at the Pixel 8's 412px, smaller on a narrow phone, a little larger on a wide one.
  const k = Math.min(1.12, Math.max(0.86, width / 412));
  const z = (n: number) => Math.round(n * k * 10) / 10;
  return (
    <View style={[st.promo, { minHeight: z(150), padding: z(20), borderRadius: z(20) }]}>
      <Gradient stops={[{ offset: '0', color: '#1e3a8a' }, { offset: '1', color: BLUE }]} />
      <Text style={st.bolt}>⚡</Text>
      <View style={[st.promoRow, { gap: z(10) }]}>
        <View style={st.promoText}>
          <View style={[st.promoBadge, { paddingHorizontal: z(10), paddingVertical: z(3), borderRadius: z(8) }]}>
            <Text style={[st.promoBadgeText, { fontSize: z(12) }]}>විශේෂ දීමනා</Text>
          </View>
          <Text style={[st.promoTitle, { fontSize: z(20), lineHeight: z(27), marginTop: z(8) }]}>හයිබ්‍රිඩ් / EV සේවාව</Text>
          <Text style={[st.promoSub, { fontSize: z(13.5), lineHeight: z(19), marginTop: z(4) }]}>Galle Hybrid Care - පළමු සේවාවට 10% වට්ටමක්</Text>
        </View>
        <Pressable style={[st.promoBtn, { paddingHorizontal: z(16), paddingVertical: z(11), borderRadius: z(14) }]} onPress={onOpen} accessibilityLabel="See the offer">
          <Text style={[st.promoBtnText, { fontSize: z(13.5) }]}>
            බලන්න <Text style={[st.promoBtnArrow, { fontSize: z(16) }]}>›</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const st = themedStyles(() =>
  StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  seeAll: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: BLUE },
  seeAllArrow: { color: BLUE, fontSize: 18 },
  strip: { gap: 10, paddingRight: 4 },
  // The sideways hint arrows: a small white round button at each edge, halfway down the two rows.
  arrowWrap: { position: 'absolute', top: '46%', marginTop: -22 },
  arrowRight: { right: -4 },
  arrowLeft: { left: -4 },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  column: { gap: 14 },
  card: { alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardOn: {},
  iconBox: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', marginBottom: 6 },
  iconBoxOn: { backgroundColor: '#dbeafe' },
  label: { marginTop: 6, fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: '#000000' },
  // Latin letters are small beside Sinhala at the same size and weight (a low x-height), so the English labels are bold and 2px larger to carry the same visual weight.
  labelLatin: { fontFamily: FONTS.bodyBold, fontSize: 14.5, lineHeight: 18 },
  labelOn: {},
  promo: { minHeight: 150, justifyContent: 'center', borderRadius: 20, padding: 20, overflow: 'hidden', backgroundColor: BLUE, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bolt: { position: 'absolute', right: -14, bottom: -26, fontSize: 120, opacity: 0.1 },
  promoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  promoText: { flex: 1 },
  promoBadge: { alignSelf: 'flex-start', backgroundColor: '#facc15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  promoBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, color: '#111827' },
  promoTitle: { fontSize: 20, lineHeight: 27, fontFamily: FONTS.bodyBold, color: '#ffffff', marginTop: 8 },
  promoSub: { fontSize: 13.5, lineHeight: 19, marginTop: 4, fontFamily: FONTS.bodyRegular, color: '#dbeafe' },
  promoBtn: { flexShrink: 0, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  promoBtnText: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE },
  promoBtnArrow: { color: GOLD, fontSize: 16 },
  })
);
