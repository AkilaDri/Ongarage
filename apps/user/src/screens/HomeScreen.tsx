import React, { useMemo, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Linking } from 'react-native';
import {
  Colors,
  directionsUrl,
  distanceKm,
  FONTS,
  getThemeMode,
  Pulse,
  SERVICE_CATEGORIES,
  themedStyles,
  type Garage,
  type ServiceCategory,
} from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GARAGE_INFO, NEW_GARAGE_DAYS, OFFERS, PROMO_BANNERS, SPONSORED_GARAGE_IDS, type Offer } from '../constants/home';
import { AllServicesSheet } from '../components/AllServicesSheet';
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
      {/* Sticky banners: SOS and Post Job remain on top while content scrolls below */}
      <View style={styles.stickyBannersContainer}>
        {/* SOS: the emergency action — solid red, no image, just icon and text */}
        <Pressable style={({ pressed }) => [styles.sosBanner, pressed && styles.pressed]} onPress={onSOSPress} accessibilityLabel="Open SOS">
          <View style={styles.sosBannerContent}>
            <View style={styles.sosLeft}>
              <View style={styles.sosBadge}>
                <Pulse style={styles.pulseDot} />
                <Text style={styles.badgeText}>24/7 SOS</Text>
              </View>
              <Text style={styles.heroTitle}>වාහනය අඩපණ වුණාද?</Text>
              <Text style={styles.heroSub}>ළඟම කාර්මිකයා ඔබ වෙත</Text>
            </View>
            <View style={styles.sosButton}>
              <Text style={styles.sosButtonText}>SOS</Text>
            </View>
          </View>
        </Pressable>

        {/* Post a repair job: dark blue, no image, just text and plus button */}
        <Pressable style={({ pressed }) => [styles.jobBanner, pressed && styles.pressed]} onPress={onPostJob} accessibilityLabel="Post a repair job">
          <View style={styles.jobBannerContent}>
            <View style={styles.jobLeft}>
              <Text style={styles.jobBannerTitle}>අලුත්වැඩියාවක් පළ කරන්න</Text>
              <Text style={styles.jobBannerSub}>ගරාජ කිහිපයකින් මිල ගණන් ලබා ගන්න</Text>
            </View>
            <View style={styles.jobCta}>
              <Text style={styles.jobCtaText}>＋</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(e) => onScrollChange?.(e.nativeEvent.contentOffset.y)}>
        {/* Categories: round photos, two rows, slide sideways */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>සේවා අංශ</Text>
          <Pressable onPress={() => setAllServices(true)} hitSlop={6}>
            <Text style={styles.viewAllLink}>සියල්ල බලන්න</Text>
          </Pressable>
        </View>
        <CategoryStrip onSelect={onServicePress} />

        {/* Ads */}
        <PromoCarousel
          banners={PROMO_BANNERS}
          onOpen={(b) => {
            const g = byId(b.garageId);
            if (g) setOpen(g);
          }}
        />

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
  // Sticky banners float above the scrollable content.
  stickyBannersContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8, zIndex: 10, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 90, gap: 16 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  // SOS banner: solid red, icon-driven, no image.
  sosBanner: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#dc2626', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 6 },
  sosBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sosLeft: { flex: 1, gap: 3 },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 2,
  },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  heroTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#fff' },
  heroSub: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: '#e2e8f0' },
  sosButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sosButtonText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Post Job banner: dark blue, no image, text + plus button only.
  jobBanner: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#162b63', shadowColor: '#162b63', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 5 },
  jobBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  jobLeft: { flex: 1, gap: 2 },
  jobBannerTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff' },
  jobBannerSub: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)' },
  jobCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.85)', flexShrink: 0 },
  jobCtaText: { fontSize: 22, fontWeight: '700', color: '#fff' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  viewAllLink: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
}));
