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
import { AllServicesSheet } from '../components/AllServicesSheet';
import { PinnedEdge } from '../components/PinnedEdge';
import { CategoryStrip } from '../components/home/CategoryStrip';
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
  onServicePress: (service: ServiceCategory) => void;
  onBookGarage: (garage: Garage) => void;
  onScrollChange?: (scrollY: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSOSPress, onPostJob, onServicePress, onBookGarage, onScrollChange }) => {
  const user = useUserLocation();
  const [allServices, setAllServices] = useState(false);
  const { notify } = useNotice();
  // Where the ads sit in the scroll content; the edge shadow fades in once they have reached the top and are pinned.
  const adsY = useRef(0);
  const edge = useRef(new Animated.Value(0)).current;
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]} scrollEventThrottle={16} onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          edge.setValue(Math.min(1, Math.max(0, (y - adsY.current) / 30)));
          onScrollChange?.(y);
        }}>
        {/* Categories: cut-out icons, two rows, slide sideways. They scroll away with the page. */}
        <View style={styles.categoriesBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>සේවා අංශ</Text>
          <Pressable onPress={() => setAllServices(true)} hitSlop={6}>
            <Text style={styles.viewAllLink}>සියල්ල බලන්න</Text>
          </Pressable>
        </View>
        <CategoryStrip onSelect={onServicePress} />
        </View>

        {/* Ads: the first thing to pin under the banners; everything after them scrolls beneath */}
        <View style={styles.adsPinned} onLayout={(e) => (adsY.current = e.nativeEvent.layout.y)}>
          <PromoCarousel
            banners={PROMO_BANNERS}
            onOpen={(b) => {
              const g = byId(b.garageId);
              if (g) setOpen(g);
            }}
            />
          <PinnedEdge progress={edge} />
        </View>

        {/* Deals */}
        <Text style={styles.sectionTitle}>ගනුදෙනු සහ දීමනා</Text>
        <OfferTiles offers={OFFERS} onOpen={openOffer} />

        {/* Garage rows */}
        <GarageRow title="විශේෂාංග · දැන්වීම්" garages={sponsored} ad onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'විශේෂාංග · දැන්වීම්', garages: sponsored, ad: true })} />
        <GarageRow title="අලුතින් එක් වූ" garages={newlyJoined} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'අලුතින් එක් වූ ගරාජ', garages: newlyJoined })} />
        <GarageRow title="ජනප්‍රිය ගරාජ" garages={popular.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ජනප්‍රිය ගරාජ', garages: popular })} />
        <GarageRow title="ඔබට ළඟම" garages={nearest.slice(0, 6)} onOpen={setOpen} onSaveChange={save} onSeeAll={() => setList({ title: 'ඔබට ළඟම ගරාජ', garages: nearest })} />
      </ScrollView>
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
        onCall={open ? () => Linking.openURL(`tel:${open.phone.replace(/\s/g, '')}`) : undefined}
        onBook={
          open
            ? () => {
                const g = open;
                setOpen(null);
                onBookGarage(g);
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
  content: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 90, gap: 16 },
  categoriesBlock: { gap: 10 },
  // Opaque and full width (the negative margin cancels the content padding), so the lists scroll underneath it.
  adsPinned: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  viewAllLink: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
}));
