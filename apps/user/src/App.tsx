import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Modal, Text, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansSinhala_400Regular,
  NotoSansSinhala_500Medium,
  NotoSansSinhala_600SemiBold,
  NotoSansSinhala_700Bold,
} from '@expo-google-fonts/noto-sans-sinhala';
import { Colors, FONTS, getThemeMode, Gradient, Pulse, themedStyles } from '@ongarage/shared';
import { ThemeProvider, useTheme } from '@ongarage/shared';
import { VehiclesProvider } from './context/VehiclesContext';
import { LocationProvider } from './context/LocationContext';
import { MartProvider } from './context/MartContext';
import { WallProvider } from './context/WallContext';
import { BidsProvider } from './context/BidsContext';
import { NoticeProvider } from './context/NoticeContext';
import { BookingsProvider } from './context/BookingsContext';
import { WorkshopProvider } from './context/WorkshopContext';
import { ProfileProvider } from './context/ProfileContext';
import { Header, TitleBand } from './components/Header';
import { MartHeader } from './components/mart/MartHeader';
import { Toast } from './components/Toast';
import { DirectBookingSheet } from './components/DirectBookingSheet';
import { HomeScreen } from './screens/HomeScreen';
import { SOSMapPickerScreen } from './screens/SOSMapPickerScreen';
import { SOSFlowScreen } from './screens/SOSFlowScreen';
import { ServiceBrowseScreen } from './screens/ServiceBrowseScreen';
import { PostJobScreen } from './screens/PostJobScreen';
import { BidsScreen, type BidsTab } from './screens/BidsScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MartScreen } from './screens/MartScreen';
import { BottomNav } from '@ongarage/shared';
import { MART_TABS, USER_TABS, type MartSegment, type TabId } from './constants/tabs';
import { categoryInfo, type Garage, type JobDraft, type PickedLocation, type ServiceCategory } from '@ongarage/shared';

// The title band other tabs show instead of the greeting header (Home has the header; Account has nothing and uses the full screen).
const TAB_TITLES: Partial<Record<TabId, string>> = { bids: 'ඔබගේ ලංසු වල තත්ත්වය', activity: 'ඔබේ ක්‍රියාකාරකම්' };

// Banner sizes: stacked cards at the top of Home, one compact row once the page is scrolled.
const SOS_H = 94;
const JOB_H = 94;
const BANNER_GAP = 8;
const COMPACT_H = 56;

// Soft diagonal washes over the banners' base colours (lighter at the top left, deeper at the bottom right).
const SOS_GRADIENT = [
  { offset: '0', color: '#f43f45' },
  { offset: '0.5', color: '#c81e2b' },
  { offset: '1', color: '#7f1220' },
];
const JOB_GRADIENT = [
  { offset: '0', color: '#2f5bd6' },
  { offset: '0.5', color: '#1b3a96' },
  { offset: '1', color: '#0b1c52' },
];

type SOSStage = 'closed' | 'map' | 'flow';

SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <ThemeProvider>
      <NoticeProvider>
        <WorkshopProvider>
          <ProfileProvider>
          <VehiclesProvider>
            <BookingsProvider>
              <AppShell />
            </BookingsProvider>
          </VehiclesProvider>
          </ProfileProvider>
        </WorkshopProvider>
      </NoticeProvider>
    </ThemeProvider>
  );
}

// Reading the theme here re-renders the whole tree on a switch, so every screen
// picks up the new palette without remounting (and without losing its state).
function AppShell() {
  const { isDark } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const [fadeColor, setFadeColor] = useState(Colors.bgBody);
  const firstRender = useRef(true);
  const sheetScroll = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const [headerH, setHeaderH] = useState(80);
  // Width of the banner area: the two banners tween between stacked cards and one row of two.
  const [bannerW, setBannerW] = useState(358);
  const half = (bannerW - BANNER_GAP) / 2;
  const lerp = (a: number, b: number) => sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const fadeOut = sheetScroll.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  const fadeIn = sheetScroll.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Briefly veil the switch with the previous background so it cross-fades.
    setFadeColor(isDark ? '#f1f5f9' : '#07090e');
    fade.setValue(0.75);
    Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  }, [isDark, fade]);

  const [fontsLoaded] = useFonts({
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
  });

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [martSegment, setMartSegment] = useState<MartSegment>('shops');
  const martHeaderCollapse = useRef(new Animated.Value(0)).current;
  const [sosStage, setSOSStage] = useState<SOSStage>('closed');
  const [sosLocation, setSOSLocation] = useState<PickedLocation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('premio');
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
  const [postJob, setPostJob] = useState<{ draft: JobDraft | null } | null>(null);
  const [bidsTab, setBidsTab] = useState<BidsTab>('received');
  // Booking a garage directly (from Home, a service list, or "book again").
  const [booking, setBooking] = useState<{ garage: Garage; categoryId?: string } | null>(null);

  const closeSOS = useCallback(() => setSOSStage('closed'), []);
  const setMartHeaderVisible = useCallback((visible: boolean) => {
    Animated.timing(martHeaderCollapse, { toValue: visible ? 0 : 1, duration: 200, useNativeDriver: false }).start();
  }, [martHeaderCollapse]);

  const handleHomeScroll = useCallback((y: number) => {
    scrollY.current = y;
    // The banner area rises over the greeting within the first 60px of scrolling, and settles back at the top (service categories).
    const progress = Math.min(1, Math.max(0, y / 60));
    sheetScroll.setValue(progress);
  }, [sheetScroll]);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  React.useEffect(() => {
    if (activeTab === 'mart') setMartHeaderVisible(true);
  }, [activeTab, setMartHeaderVisible]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LocationProvider>
    <MartProvider>
    <WallProvider>
    <BidsProvider>
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* One header band on every tab: a short greeting and the active vehicle. */}
        {activeTab === 'home' ? (
          <View onLayout={(e) => setHeaderH(Math.round(e.nativeEvent.layout.height))}>
            <Header activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
          </View>
        ) : activeTab === 'mart' ? (
          <Animated.View style={{ height: martHeaderCollapse.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }), overflow: 'hidden' }}>
            <MartHeader activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} onBack={() => setActiveTab('home')} />
          </Animated.View>
        ) : TAB_TITLES[activeTab] ? (
          <TitleBand
            title={TAB_TITLES[activeTab]!}
            action={activeTab === 'bids' ? { label: '＋ නව ලංසුවක්', onPress: () => setPostJob({ draft: null }) } : undefined}
          />
        ) : null}

        {/* Sticky banners on Home with animated rounded bottom corners */}
        {activeTab === 'home' && (
          <Animated.View style={[styles.stickyBannersContainer, { marginTop: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [-18, -headerH] }) }]}>
            <View onLayout={(e) => setBannerW(Math.round(e.nativeEvent.layout.width))}>
              <Animated.View style={{ height: lerp(SOS_H + BANNER_GAP + JOB_H, COMPACT_H) }}>
                {/* SOS: full card at the top of the page, the left half of a single row once scrolled */}
                <Animated.View style={[styles.sosBanner, styles.bannerAbs, { width: lerp(bannerW, half), height: lerp(SOS_H, COMPACT_H), top: 0, left: 0 }]}>
                  <Gradient stops={SOS_GRADIENT} />
                  <View style={styles.sheen} pointerEvents="none" />
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => setSOSStage('map')} accessibilityLabel="Open SOS">
                    <Animated.View style={[styles.sosBannerContent, styles.bannerFull, { width: bannerW, opacity: fadeOut }]}>
                      <View style={styles.sosLeft}>
                        <View style={styles.sosBadge}>
                          <Pulse style={styles.pulseDot} />
                          <Text style={styles.badgeText}>24/7 SOS</Text>
                        </View>
                        <Text style={styles.heroTitle}>වාහනය Breakdown ද ?</Text>
                        <Text style={styles.heroSub}>ළගම OnGarage උදව් ඉල්ලන්න</Text>
                      </View>
                      <View style={styles.sosButton}>
                        <Text style={styles.sosButtonText}>SOS</Text>
                      </View>
                    </Animated.View>
                    <Animated.View style={[styles.compactRow, { opacity: fadeIn }]} pointerEvents="none">
                      <View style={styles.compactPlus}>
                        <Pulse style={styles.compactDot} />
                      </View>
                      <Text style={styles.compactSos}>SOS</Text>
                      <Text style={styles.compactSmall}>24/7</Text>
                    </Animated.View>
                  </Pressable>
                </Animated.View>

                {/* Post a job: full card below the SOS card, the right half of the row once scrolled */}
                <Animated.View style={[styles.jobBanner, styles.bannerAbs, { width: lerp(bannerW, half), height: lerp(JOB_H, COMPACT_H), top: lerp(SOS_H + BANNER_GAP, 0), left: lerp(0, half + BANNER_GAP) }]}>
                  <Gradient stops={JOB_GRADIENT} />
                  <View style={styles.sheen} pointerEvents="none" />
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => setPostJob({ draft: null })} accessibilityLabel="Post a repair job">
                    <Animated.View style={[styles.jobBannerContent, styles.bannerFull, { width: bannerW, opacity: fadeOut }]}>
                      <View style={styles.jobLeft}>
                        <View style={styles.jobBadge}>
                          <Text style={styles.badgeText}>නොමිලේ Quotes</Text>
                        </View>
                        <Text style={styles.jobBannerTitle}>වාහනයේ Repair එකක්ද?</Text>
                        <Text style={styles.jobBannerSub}>OnGarage වලින් Quotes ගන්න</Text>
                      </View>
                      <View style={styles.jobCta}>
                        <Text style={styles.jobCtaText}>＋</Text>
                      </View>
                    </Animated.View>
                    <Animated.View style={[styles.compactRow, { opacity: fadeIn }]} pointerEvents="none">
                      <View style={styles.compactPlus}>
                        <View style={styles.plusBarH} />
                        <View style={styles.plusBarV} />
                      </View>
                      <Text style={styles.compactJob}>Quotes ඉල්ලන්න</Text>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.sheet,
            activeTab !== 'profile' && styles.sheetOverlap,
            activeTab === 'home' && styles.sheetHome,
            activeTab === 'bids' && styles.sheetFlush,
          ]}
        >
          {activeTab === 'home' ? (
            <HomeScreen
              onSOSPress={() => setSOSStage('map')}
              onPostJob={() => setPostJob({ draft: null })}
              onServicePress={setSelectedService}
              onBookGarage={(garage) => setBooking({ garage })}
              onScrollChange={handleHomeScroll}
            />
          ) : activeTab === 'bids' ? (
            <BidsScreen
              tab={bidsTab}
              onTabChange={setBidsTab}
              onRepublish={(draft) => setPostJob({ draft })}
              onViewActivity={() => setActiveTab('activity')}            />
          ) : activeTab === 'activity' ? (
            <ActivityScreen onOpenMart={() => setActiveTab('mart')} onOpenBids={() => setActiveTab('bids')} onBookAgain={(b) => setSelectedService(categoryInfo(b.categoryId))} />
          ) : activeTab === 'mart' ? (
            <MartScreen
              activeVehicle={selectedVehicle}
              segment={martSegment}
              onSegmentChange={setMartSegment}
              onHeaderVisibilityChange={setMartHeaderVisible}
            />
          ) : (
            <ProfileScreen activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
          )}
        </Animated.View>

        <View style={styles.bottomNavContainer}>
          {activeTab === 'mart' ? (
            <BottomNav
              items={MART_TABS}
              activeTab={martSegment}
              onTabChange={(next) => {
                setMartSegment(next);
                setMartHeaderVisible(true);
              }}
            />
          ) : (
            <BottomNav items={USER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          )}
        </View>
        <Toast />
      </SafeAreaView>

      <Modal visible={sosStage !== 'closed'} animationType="fade" statusBarTranslucent onRequestClose={closeSOS}>
        {sosStage === 'map' && (
          <SOSMapPickerScreen
            initialLocation={sosLocation}
            onConfirm={(loc) => {
              setSOSLocation(loc);
              setSOSStage('flow');
            }}
            onClose={closeSOS}
          />
        )}
        {sosStage === 'flow' && sosLocation && (
          <SOSFlowScreen
            location={sosLocation}
            vehicleId={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            onChangeLocation={() => setSOSStage('map')}
            onClose={closeSOS}
          />
        )}
        <Toast topOffset={84} />
      </Modal>

      <Modal visible={postJob !== null} animationType="slide" statusBarTranslucent onRequestClose={() => setPostJob(null)}>
        {postJob && (
          <PostJobScreen
            draft={postJob.draft}
            defaultVehicleId={selectedVehicle}
            onClose={() => setPostJob(null)}
            onSubmitted={() => {
              setPostJob(null);
              setBidsTab('pending');
              setActiveTab('bids');
            }}
            onOpenSOS={() => {
              setPostJob(null);
              setSOSStage('map');
            }}
          />
        )}
        <Toast topOffset={84} />
      </Modal>

      <Modal visible={selectedService !== null} animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedService(null)}>
        {selectedService && (
          <ServiceBrowseScreen service={selectedService} onClose={() => setSelectedService(null)} onBook={(garage) => setBooking({ garage, categoryId: selectedService.id })} />
        )}
        <Toast topOffset={84} />
      </Modal>
      <DirectBookingSheet
        garage={booking?.garage ?? null}
        categoryId={booking?.categoryId}
        defaultVehicleId={selectedVehicle}
        onClose={() => setBooking(null)}
        onBooked={() => {
          setSelectedService(null);
          setActiveTab('activity');
        }}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
    </SafeAreaProvider>
    </BidsProvider>
    </WallProvider>
    </MartProvider>
    </LocationProvider>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  // The tab's screen overlaps the header band with rounded top corners.
  sheet: { flex: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  sheetOverlap: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  // Home: the list sits in its own rounded, shadowed sheet that slides up over the padding under the banners.
  // Bids: the sheet rises right up to the top bar, so no rounded corner shows the band behind it.
  sheetFlush: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  sheetHome: { marginTop: -16, zIndex: 2, borderTopWidth: 1, borderTopColor: Colors.borderColor, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 12 },
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  // Sticky banners on Home (outside the sheet so they don't move when sheet expands)
  stickyBannersContainer: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 26, zIndex: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sosBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#c81e2b', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#c81e2b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 7 },
  // A soft light disc in the corner: depth without clutter.
  sheen: { position: 'absolute', top: -70, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  sosBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sosLeft: { flex: 1, gap: 3 },
  sosBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginBottom: 3 },
  jobBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginBottom: 3 },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  heroTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
  heroSub: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.82)' },
  sosButton: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ffffff', borderWidth: 5, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sosButtonText: { fontSize: 15, fontWeight: '900', color: '#c81e2b', letterSpacing: 1 },
  jobBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#1b3a96', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#1b3a96', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  jobBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  jobLeft: { flex: 1, gap: 2 },
  jobBannerTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
  jobBannerSub: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.82)' },
  jobCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bannerAbs: { position: 'absolute' },
  bannerFull: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  compactRow: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  compactSos: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  compactSmall: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  compactPlus: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  compactDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  // The plus is drawn (not a glyph) so its stroke weight matches the dot's.
  plusBarH: { position: 'absolute', width: 12, height: 2.5, borderRadius: 2, backgroundColor: '#fff' },
  plusBarV: { position: 'absolute', width: 2.5, height: 12, borderRadius: 2, backgroundColor: '#fff' },
  compactPlusText: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: -2 },
  compactJob: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
  jobCtaText: { fontSize: 22, fontWeight: '700', color: '#1b3a96', marginTop: -2 },
}));
