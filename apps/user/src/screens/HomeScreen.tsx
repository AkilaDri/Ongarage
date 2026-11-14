import { pageBg } from '../utils/material';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, View, ScrollView, Text, Pressable, StyleSheet, Linking, useWindowDimensions } from 'react-native';
import {
  Colors,
  directionsUrl,
  distanceKm,
  FONTS,
  getThemeMode,
  SERVICE_CATEGORIES,
  themedStyles,
  type Garage,
  type ServiceCategory,
} from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GARAGE_INFO, NEW_GARAGE_DAYS, OFFERS, PROMO_BANNERS, SPONSORED_GARAGE_IDS, type Offer } from '../constants/home';
import { AllServicesSheet } from '../components/AllServicesSheet';
import { PinnedEdge } from '../components/PinnedEdge';
import { HomeServices, HomePromo } from '../components/home/HomeServices';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { OfferTiles } from '../components/home/OfferTiles';
import { GarageRow } from '../components/home/GarageRow';
import { GarageListSheet } from '../components/home/GarageListSheet';
import { useUserLocation } from '../context/LocationContext';
import { useNotice } from '../context/NoticeContext';
import { GarageReviewsSheet } from '../components/GarageReviewsSheet';

const DAY = 24 * 60 * 60 * 1000;


interface HomeScreenProps {
  onSOSPress: () => void;
  onPostJob: () => void;
  /** `sub`: a suggested job (an oil change, a wheel alignment ...) already picked in that category. */
  onServicePress: (service: ServiceCategory, sub?: string) => void;
  onBookGarage: (garage: Garage, back?: () => void) => void;
  onScrollChange?: (scrollY: number) => void;
  /** How far the page scrolls while the banners above fold and the sheet rises (the page holds its content back by this much, so all of it moves with the finger). */
  collapsePx?: number;
  /** The top of the page (the header, the action card and the search), which scrolls with everything else as one sheet. */
  top?: React.ReactNode;
  /** The scroll position from which the compact SOS / quotes bar sticks to the top of the screen. */
  stickyFrom?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSOSPress, onPostJob, onServicePress, onBookGarage, onScrollChange, collapsePx = 0, top, stickyFrom = 300 }) => {
  const user = useUserLocation();
  const { width: screenW } = useWindowDimensions();
  // Four category tiles fit the page width (20px sides, 12px gaps); the fifth peeks in at the right edge.
  const tile = Math.max(72, Math.floor((Math.min(screenW, 520) - 40 - 36) / 4));
  const [allServices, setAllServices] = useState(false);
  const { notify } = useNotice();
  // Where the ads sit in the scroll content; the edge shadow fades in once they have reached the top and are pinned.
  const adsY = useRef(0);
  const edge = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [stuck, setStuck] = useState(false);
  const [list, setList] = useState<{ title: string; garages: Garage[]; ad?: boolean } | null>(null);

  // Distances from where the owner is; the rows below are organic (ratings, distance,
  // how new a garage is) — ads only appear in the labelled "Featured" row and banners.
  const garages = useMemo(() => MOCK_GARAGES.map((g) => ({ ...g, distance: Number(distanceKm(user.coords, g.coords).toFixed(1)) })), [user.coords]);
  const byId = (id: string) => garages.find((g) => g.id === id);
  const sponsored = SPONSORED_GARAGE_IDS.map(byId).filter((g): g is Garage => !!g);
  const newlyJoined = garages
    .filter((g) => (GARAGE_INFO[g.id]?.joinedAt ?? 0) > Date.now() - NEW_GARAGE_DAYS * DAY)
    .sort((a, b) => GARAGE_INFO[b.id].joinedAt - GARAGE_INFO[a.id].joinedAt);
  // Popular: rating weighted by how many reviews back it up.
  const popular = [...garages].sort((a, b) => b.rating * Math.log10(b.reviews + 1) - a.rating * Math.log10(a.reviews + 1));
  const nearest = [...garages].sort((a, b) => a.distance - b.distance);
  const protectedGarages = garages.filter((g) => g.level === 'premier');

  const [open, setOpen] = useState<Garage | null>(null);
  const save = (g: Garage, saved: boolean) =>
    notify({ icon: saved ? '♥' : '♡', title: saved ? 'සුරැකි ගරාජ වලට එක් කළා' : 'සුරැකි ලැයිස්තුවෙන් ඉවත් කළා', body: g.name, tone: 'primary' });
  const openOffer = (o: Offer) => {
    if ('categoryId' in o) {
      const cat = SERVICE_CATEGORIES.find((c) => c.id === o.categoryId);
      if (cat) onServicePress(cat);
    } else if (o.list === 'new') setList({ title: 'අලුතින් එක් වූ ගරාජ', garages: newlyJoined });
    else setList({ title: 'ආරක්ෂිත රැකියා (OnGarage Guarantee)', garages: protectedGarages });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: 90 + collapsePx }]} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollAnim.setValue(y);
          setStuck((was) => (was ? y > stickyFrom - 40 : y > stickyFrom));
          edge.setValue(Math.min(1, Math.max(0, (y - adsY.current) / 30)));
          onScrollChange?.(y);
        }}>
        {/* While the banners above fold and the sheet rises (the first `collapsePx` of scrolling) this content is held back by the same distance, so it moves with the
            finger one for one instead of also sliding up inside the rising sheet. */}
        {top}
        <Animated.View style={[styles.contentInner, collapsePx > 0 && { transform: [{ translateY: scrollAnim.interpolate({ inputRange: [0, collapsePx], outputRange: [0, collapsePx], extrapolate: 'clamp' }) }] }]}>
        {/* The service grid (4 x 2) and the offer banner, as in the design. */}
        <HomeServices onSelect={onServicePress} onSeeAll={() => setAllServices(true)} />
        <HomePromo
          onOpen={() => {
            const c = SERVICE_CATEGORIES.find((k) => k.id === '3');
            if (c) onServicePress(c);
          }}
        />

        {/* Deals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ගනුදෙනු සහ දීමනා</Text>
          <OfferTiles offers={OFFERS} onOpen={openOffer} />
        </View>

        {/* Garage rows */}
        <GarageRow title="විශේෂාංග · දැන්වීම්" garages={sponsored} ad onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'විශේෂාංග · දැන්වීම්', garages: sponsored, ad: true })} />
        <GarageRow title="අලුතින් එක් වූ" garages={newlyJoined} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'අලුතින් එක් වූ ගරාජ', garages: newlyJoined })} />
        <GarageRow title="ජනප්‍රිය ගරාජ" garages={popular.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ජනප්‍රිය ගරාජ', garages: popular })} />
        <GarageRow title="ඔබට ළඟම" garages={nearest.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ඔබට ළඟම ගරාජ', garages: nearest })} />
        </Animated.View>
      </ScrollView>
      {/* Once the big action card has scrolled away, the two actions stay at the top of the screen as a compact bar. */}
      <Animated.View
        pointerEvents={stuck ? 'auto' : 'none'}
        style={[
          stickySt.bar,
          {
            opacity: scrollAnim.interpolate({ inputRange: [stickyFrom - 40, stickyFrom + 20], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: scrollAnim.interpolate({ inputRange: [stickyFrom - 40, stickyFrom + 20], outputRange: [-14, 0], extrapolate: 'clamp' }) }],
          },
        ]}
      >
        <Pressable style={({ pressed }) => [stickySt.sos, pressed && stickySt.pressed]} onPress={onSOSPress} accessibilityLabel="Open SOS">
          <View style={stickySt.sosDot} />
          <Text style={stickySt.sosText}>SOS</Text>
          <Text style={stickySt.sosSmall}>24/7</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [stickySt.job, pressed && stickySt.pressed]} onPress={onPostJob} accessibilityLabel="Post a repair job">
          <Text style={stickySt.jobPlus}>+</Text>
          <Text style={stickySt.jobText}>Repair Quotes</Text>
        </Pressable>
      </Animated.View>
      <AllServicesSheet visible={allServices} onClose={() => setAllServices(false)} onSelect={onServicePress} />
      <GarageListSheet
        list={list}
        onClose={() => setList(null)}
        onOpen={(g) => {
          setList(null);
          setOpen(g);
        }}
        onSaveChange={save}
      />
      <GarageReviewsSheet
        garage={open}
        onClose={() => setOpen(null)}
        onReopen={setOpen}
        onCall={open ? () => Linking.openURL(`tel:${open.phone.replace(/\s/g, '')}`) : undefined}
        onBook={
          open
            ? () => {
                const g = open;
                setOpen(null);
                onBookGarage(g, () => setOpen(g));
              }
            : undefined
        }
      />
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  // Transparent: the rounded sheet in App.tsx supplies the background.
  container: { flex: 1 },
  scroll: { flex: 1 },
  contentInner: { gap: 28, paddingHorizontal: 16, paddingTop: 28 },
  // One rhythm for the whole page: 24px between sections; inside a section its title sits 10px above its own content (`section`).
  content: { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 90, gap: 0 },
  section: { gap: 10 },
  // The categories sit in their own soft rounded panel, header and four-column grid together.
  // The categories have no fill or side padding of their own: the icon boxes start at the same edge as the cards below (the page's 6px).
  categoriesBlock: { gap: 14, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0, borderRadius: 24, backgroundColor: 'transparent' },
  // Opaque and full width (the negative margin cancels the content padding), so the lists scroll underneath it.
  adsPinned: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 4, backgroundColor: pageBg() },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#2563eb' },
  catTitle: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
  // The same size as the titles of the garage rows (GarageRow), so every section heading on the page reads alike.
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain, letterSpacing: 0.2 },
}));

/** The compact SOS / quotes bar that sticks to the top once the big card has scrolled away (plain styles, as in the design). */
const stickySt = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 6 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sos: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(254, 226, 226, 0.9)', backgroundColor: 'rgba(254, 242, 242, 0.8)' },
  sosDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  sosText: { fontSize: 15, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5 },
  sosSmall: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  job: { flex: 1.3, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(219, 234, 254, 0.9)', backgroundColor: 'rgba(239, 246, 255, 0.9)' },
  jobPlus: { fontSize: 20, lineHeight: 22, fontWeight: '700', color: '#2563eb' },
  jobText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});
