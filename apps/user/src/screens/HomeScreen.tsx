import { CategoryStrip } from '../components/home/CategoryStrip';
import { pageBg } from '../utils/material';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, View, ScrollView, Text, Pressable, StyleSheet, Linking } from 'react-native';
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
import { PinnedEdge } from '../components/PinnedEdge';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { OfferTiles } from '../components/home/OfferTiles';
import { GarageRow } from '../components/home/GarageRow';
import { GarageListSheet } from '../components/home/GarageListSheet';
import { useUserLocation } from '../context/LocationContext';
import { useNotice } from '../context/NoticeContext';
import { useVehicles } from '../context/VehiclesContext';
import { useWorkshops, type OwnerWorkshop } from '../context/WorkshopContext';
import { money } from '../utils/format';
import { GarageReviewsSheet } from '../components/GarageReviewsSheet';

const DAY = 24 * 60 * 60 * 1000;


interface HomeScreenProps {
  onSOSPress: () => void;
  onPostJob: () => void;
  /** `sub`: a suggested job (an oil change, a wheel alignment ...) already picked in that category. */
  onServicePress: (service: ServiceCategory, sub?: string) => void;
  onBookGarage: (garage: Garage, back?: () => void) => void;
  onScrollChange?: (scrollY: number) => void;
  /** The SOS job minimised: a bar back to it, shown under the Repair card, above the categories. */
  sosReturn?: React.ReactNode;
  /** The towing job minimised: a bar back to it, in the same place as the SOS bar. */
  towReturn?: React.ReactNode;
  /** How far the page scrolls while the banners above fold and the sheet rises (the page holds its content back by this much, so all of it moves with the finger). */
  collapsePx?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSOSPress, onPostJob, onServicePress, onBookGarage, onScrollChange, sosReturn, towReturn, collapsePx = 0 }) => {
  const user = useUserLocation();
  const { notify } = useNotice();
  // Where the ads sit in the scroll content; the edge shadow fades in once they have reached the top and are pinned.
  const adsY = useRef(0);
  const edge = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;
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
  // The garages this active vehicle has been to, most recent first: they lead the page (UX 155, recognition; UX 134, the owner returns to a garage they trust).
  const { activeVehicle } = useVehicles();
  const { workshops } = useWorkshops();
  const { pastGarages, pastPriceHints } = useMemo(() => {
    const closed = Object.values(workshops)
      .filter((w): w is OwnerWorkshop => w.vehicleId === activeVehicle.id && w.progress.stage === 'closed')
      .sort((a, b) => (b.progress.closedAt ?? b.scheduledAt) - (a.progress.closedAt ?? a.scheduledAt));
    const seen = new Set<string>();
    const ids: string[] = [];
    const hints: Record<string, string> = {};
    for (const w of closed) {
      const gid = w.garageId;
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      ids.push(gid);
      const cat = SERVICE_CATEGORIES.find((c) => c.id === w.categoryId);
      const total = w.progress.handover?.bill.total ?? w.agreedPrice;
      hints[gid] = `${cat?.name ?? 'Repair'} · ${money(total)}`;
    }
    return { pastGarages: ids.map(byId).filter((g): g is Garage => !!g), pastPriceHints: hints };
  }, [workshops, activeVehicle.id, garages]);
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
          edge.setValue(Math.min(1, Math.max(0, (y - adsY.current) / 30)));
          onScrollChange?.(y);
        }}>
        {/* While the banners above fold and the sheet rises (the first `collapsePx` of scrolling) this content is held back by the same distance, so it moves with the
            finger one for one instead of also sliding up inside the rising sheet. */}
        <Animated.View style={[styles.contentInner, collapsePx > 0 && { transform: [{ translateY: scrollAnim.interpolate({ inputRange: [0, collapsePx], outputRange: [0, collapsePx], extrapolate: 'clamp' }) }] }]}>
        {/* Categories: cut-out icons, two rows, slide sideways. They scroll away with the page. */}
        {/* The categories, two rows that slide sideways, as before; the link below them opens the full list. */}
        {sosReturn}
        {towReturn}
        <View style={styles.categoriesBlock}>
          <CategoryStrip onSelect={onServicePress} scrollHint brand include={(id) => id !== '12' && id !== '15'} />
        </View>

        {/* Ads: they scroll with the page and fold away with the sheet, like everything else; nothing but the banners stays pinned */}
        <View style={styles.adsPinned} onLayout={(e) => (adsY.current = e.nativeEvent.layout.y)}>
          <PromoCarousel
            banners={PROMO_BANNERS}
            onOpen={(b) => {
              const g = byId(b.garageId);
              if (g) setOpen(g);
            }}
            />
        </View>

        {/* Deals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ගනුදෙනු සහ දීමනා</Text>
          <OfferTiles offers={OFFERS} onOpen={openOffer} />
        </View>

        {/* Garage rows */}
        {/* The garage hierarchy: the garages this vehicle has used, then popular, nearest and newly joined; the labelled ads come last. */}
        <GarageRow title="ඔබ පෙර භාවිතා කළ ගරාජ" garages={pastGarages} priceHints={pastPriceHints} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ඔබ පෙර භාවිතා කළ ගරාජ', garages: pastGarages })} />
        <GarageRow title="ජනප්‍රිය ගරාජ" garages={popular.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ජනප්‍රිය ගරාජ', garages: popular })} />
        <GarageRow title="ඔබට ළඟම" garages={nearest.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ඔබට ළඟම ගරාජ', garages: nearest })} />
        <GarageRow title="අලුතින් එක් වූ" garages={newlyJoined} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'අලුතින් එක් වූ ගරාජ', garages: newlyJoined })} />
        <GarageRow title="විශේෂාංග · දැන්වීම්" garages={sponsored} ad onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'විශේෂාංග · දැන්වීම්', garages: sponsored, ad: true })} />
        </Animated.View>
      </ScrollView>
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
  contentInner: { gap: 24 },
  // One rhythm for the whole page: 24px between sections; inside a section its title sits 10px above its own content (`section`).
  content: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 90, gap: 16 },
  section: { gap: 10 },
  // The categories sit in their own soft rounded panel, header and four-column grid together.
  // The categories have no fill or side padding of their own: the icon boxes start at the same edge as the cards below (the page's 6px).
  categoriesBlock: { gap: 14, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0, borderRadius: 24, backgroundColor: 'transparent' },
  // Opaque and full width (the negative margin cancels the content padding), so the lists scroll underneath it.
  adsPinned: { marginHorizontal: -6, paddingHorizontal: 6, paddingTop: 0, paddingBottom: 4, backgroundColor: pageBg() },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  seeAll: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1877f2' },
  // The same size as the titles of the garage rows (GarageRow), so every section heading on the page reads alike.
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#e6f3fc' : '#0D2B3E', letterSpacing: 0.2 },
}));
