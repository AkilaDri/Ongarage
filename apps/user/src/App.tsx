import { FlyLayer } from './components/FlyLayer';
import { pageBg } from './utils/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View, StyleSheet, Modal, Text, Pressable } from 'react-native';
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
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Icon, Colors, DialogButton, FONTS, getThemeMode, Gradient, ModalCard, Pulse, themedStyles } from '@ongarage/shared';
import { ThemeProvider, useTheme, setAppShape } from '@ongarage/shared';

// This app has PickMe's shapes too (big rounded cards, pill buttons and chips, light edges, soft shadows), like the garage app. Set before the first screen is drawn.
setAppShape('pickme');
import { VehiclesProvider } from './context/VehiclesContext';
import { OwnerMartNav, OwnerNav } from './components/OwnerNav';
import { setMartOpener, setShopOpener } from './utils/martBridge';
import { setFittingOpener } from './utils/fittingBridge';
import { LocationProvider } from './context/LocationContext';
import { LanguageProvider } from './context/LanguageContext';
import { periodOf, SkyBar, SkyShade, useHour } from './components/WeatherAnimation';
import { MartProvider } from './context/MartContext';
import { WallProvider } from './context/WallContext';
import { BidsProvider } from './context/BidsContext';
import { NoticeProvider } from './context/NoticeContext';
import { ChatProvider } from './context/ChatContext';
import { BookingsProvider } from './context/BookingsContext';
import { SOSRecordsProvider } from './context/SOSRecordsContext';
import { WorkshopProvider } from './context/WorkshopContext';
import { ProfileProvider } from './context/ProfileContext';
import { Header, HEADER_BAND_H, TitleBand } from './components/Header';
import { MartHeader } from './components/mart/MartHeader';
import { ChatHeaderButton } from './components/ChatHeaderButton';
import { ServiceReminders } from './components/ServiceReminders';
import { PaymentReminders } from './components/PaymentReminders';
import { PayFirstSheet, PayStandingBanner } from './components/PayStandingViews';
import { setBookingOpener } from './utils/bookingBridge';
import { MOCK_GARAGES } from './constants/mockData';
import { usePayStanding } from './context/PayStanding';
import { chatDockDrop, chatDockOffset, chatHide } from './utils/chatDock';
import { openActivityCalendar } from './utils/activityCalendar';
import { openFeedRecord } from './utils/feedRecord';
import { focusActivity } from './utils/activityFocus';
import { PAGE_TITLE_H } from './constants/layout';
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
import { USER_TABS, type MartSegment, type TabId } from './constants/tabs';
import { categoryInfo, type Garage, type JobDraft, type PickedLocation, type ServiceCategory } from '@ongarage/shared';

// The title band other tabs show instead of the greeting header (Home has the header; Account has nothing and uses the full screen).
const TAB_TITLES: Partial<Record<TabId, string>> = { bids: 'Your Bids', activity: 'Activity', mart: 'OnMart', profile: 'ඔබගේ ගිණුම' };
/** The title bar of every tab but Home: a plain line of text at the top of the screen. */

// Banner sizes: stacked cards at the top of Home, one compact row once the page is scrolled.
const SOS_H = 108;
const JOB_H = 108;
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
    <LanguageProvider>
    <ThemeProvider>
      <NoticeProvider>
        <WorkshopProvider>
          <ProfileProvider>
          <VehiclesProvider>
            <BookingsProvider>
              <SOSRecordsProvider>
                <AppShell />
              </SOSRecordsProvider>
            </BookingsProvider>
          </VehiclesProvider>
          </ProfileProvider>
        </WorkshopProvider>
      </NoticeProvider>
    </ThemeProvider>
    </LanguageProvider>
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
    // The Latin face for machines that do not have Apple's own (see FONTS in the shared theme)
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [martSegment, setMartSegment] = useState<MartSegment>('shops');
  const martHeaderCollapse = useRef(new Animated.Value(0)).current;
  // Natural height of the title band (the inner view keeps it even while the wrapper folds), so the band can fold to nothing.
  const [titleH, setTitleH] = useState(0);
  // OnMart asks the owner for permission the first time its tab is tapped (remembered for the session).
  const [martAllowed, setMartAllowed] = useState(false);
  const [askMart, setAskMart] = useState(false);
  const foldableBar = activeTab === 'activity' || activeTab === 'bids' || activeTab === 'profile';
  const skyPeriod = periodOf(useHour());
  const [sosStage, setSOSStage] = useState<SOSStage>('closed');
  // The chat icon can be hidden by a screen while it scrolls (Bids): then it must not catch taps either.
  const [chatBlocked, setChatBlocked] = useState(false);
  useEffect(() => {
    const id = chatHide.addListener(({ value }) => setChatBlocked(value > 0.5));
    return () => chatHide.removeListener(id);
  }, []);
  // The owner can leave a running SOS job for OnMart (to buy a part the technician needs) and come back to it.
  const [sosHidden, setSosHidden] = useState(false);
  const [martSeed, setMartSeed] = useState('');
  const [martShopReq, setMartShopReq] = useState<{ id: string; at: number; ask?: boolean } | null>(null);
  const [sosLocation, setSOSLocation] = useState<PickedLocation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('premio');
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
  const [postJob, setPostJob] = useState<{ draft: JobDraft | null } | null>(null);
  // A balance long overdue limits new work (marketplace/reliability.ts): a new job, a bid accepted, a direct booking. SOS, chat, OnMart and paying stay open.
  const standing = usePayStanding();
  const [payFirst, setPayFirst] = useState(false);
  const openPost = (draft: JobDraft | null) => (standing.limited ? setPayFirst(true) : setPostJob({ draft }));
  const openBooking = (b: { garage: Garage; categoryId?: string; initial?: { description?: string; vehicleId?: string; service?: string } }) => (standing.limited ? setPayFirst(true) : setBooking(b));
  // A chat can send the owner to OnMart with a part searched (a part the garage asks for or the owner must buy).
  useEffect(() => {
    setMartOpener((part) => {
      setMartSegment('shops');
      setMartSeed('');
      setTimeout(() => setMartSeed(part), 0);
      setActiveTab('mart');
    });
    setShopOpener((shopId, ask) => {
      setMartShopReq({ id: shopId, at: Date.now(), ask });
      setMartSegment('shops');
      setActiveTab('mart');
    });
    return () => {
      setMartOpener(null);
      setShopOpener(null);
    };
  }, []);
  // A part bought in OnMart can start a "fit this part" job: the post-a-job form opens with the part filled in.
  useEffect(() => {
    setFittingOpener((fitting) => openPost({ categoryId: '15', description: `${fitting.partName} සවි කරන්න.`, vehicleId: selectedVehicle, fitting }));
    return () => setFittingOpener(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, standing.limited]);
  const [bidsTab, setBidsTab] = useState<BidsTab>('received');
  // Booking a garage directly (from Home, a service list, or "book again").
  const [booking, setBooking] = useState<{ garage: Garage; categoryId?: string; initial?: { description?: string; vehicleId?: string; service?: string } } | null>(null);
  // A garage's chat (opened from its card) can start a direct booking of it, with what the owner already asked.
  useEffect(() => {
    setBookingOpener((garageId, categoryId, initial) => {
      const garage = MOCK_GARAGES.find((x) => x.id === garageId);
      if (garage) openBooking({ garage, categoryId, initial });
    });
    return () => setBookingOpener(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standing.limited]);

  const closeSOS = useCallback(() => {
    setSOSStage('closed');
    setSosHidden(false);
    setMartSeed('');
    setMartShopReq(null);
  }, []);
  const setMartHeaderVisible = useCallback((visible: boolean) => {
    Animated.timing(martHeaderCollapse, { toValue: visible ? 0 : 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [martHeaderCollapse]);

  const homeLastY = useRef(0);
  const homeReturning = useRef(false);
  const handleHomeScroll = useCallback((y: number) => {
    scrollY.current = y;
    const dy = y - homeLastY.current;
    homeLastY.current = y;
    // The banner area rises over the greeting within the first 60px of scrolling, and settles back at the top (service categories).
    const progress = Math.min(1, Math.max(0, y / 60));
    if (y <= 4) {
      homeReturning.current = false;
      sheetScroll.setValue(progress);
    } else if (dy < -3) {
      // The first drag down brings the greeting band back at once.
      if (!homeReturning.current) {
        homeReturning.current = true;
        Animated.timing(sheetScroll, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      }
    } else if (dy > 3 && homeReturning.current) {
      homeReturning.current = false;
      Animated.timing(sheetScroll, { toValue: progress, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    } else if (!homeReturning.current) {
      sheetScroll.setValue(progress);
    }
  }, [sheetScroll]);

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Each Sinhala weight is its own font file: stop the browser from smearing a second, synthetic bold over it.
      const el = document.createElement('style');
      el.textContent = 'html, body, #root { font-synthesis: none; -webkit-font-smoothing: antialiased; }';
      document.head.appendChild(el);
      return () => el.remove();
    }
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  React.useEffect(() => {
    if (activeTab === 'mart' || activeTab === 'activity' || activeTab === 'bids' || activeTab === 'profile') setMartHeaderVisible(true);
  }, [activeTab, setMartHeaderVisible]);

  // Home pins the compact SOS / job banners under the band (Activity and OnMart set their own, in their own screens).
  React.useEffect(() => {
    if (activeTab !== 'home') return;
    chatDockOffset.setValue(COMPACT_H + 32);
    return () => chatDockOffset.setValue(0);
  }, [activeTab]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LocationProvider>
    <MartProvider>
    <WallProvider>
    <BidsProvider>
    <ChatProvider inboxReturn={activeTab === 'home'}>
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={[styles.container, styles.containerFull]} edges={['top']}>
        {/* The header band (greeting, sky, active vehicle) is Home's alone: the other tabs start at the top of the screen. */}
        {activeTab === 'home' && (
          <View onLayout={(e) => setHeaderH(Math.round(e.nativeEvent.layout.height))}>
            <Header />
          </View>
        )}
        {/* Every other tab starts with its title; it folds away with the page scroll like the old header did. */}
        {activeTab !== 'home' && !!TAB_TITLES[activeTab] && (
          <Animated.View style={{ height: martHeaderCollapse.interpolate({ inputRange: [0, 1], outputRange: [PAGE_TITLE_H, 0] }), overflow: 'hidden' }}>
            <View style={styles.pageTitleBar}>
              {(() => {
                // The icon of the tab that was chosen in the bottom bar, in its open (dark navy) colours.
                const TabIcon = USER_TABS.find((t) => t.id === activeTab)?.icon;
                return TabIcon ? <TabIcon active size={36} /> : null;
              })()}
              <Text style={styles.pageTitle} numberOfLines={1}>
                {TAB_TITLES[activeTab]}
              </Text>
              {activeTab === 'mart' && martSegment === 'wall' && (
                <>
                  <View style={styles.flex1} />
                  {/* The hamburger menu: the record of what I liked, commented on, shared and messaged on the On Feed. */}
                  <Pressable style={styles.calendarBtn} onPress={openFeedRecord} accessibilityLabel="Open my On Feed record">
                    <Text style={styles.hamburger}>☰</Text>
                  </Pressable>
                </>
              )}
              {activeTab === 'activity' && (
                <>
                  <View style={styles.flex1} />
                  {/* The calendar: pick a day to see the repairs done on it. */}
                  <Pressable style={styles.calendarBtn} onPress={openActivityCalendar} accessibilityLabel="Open calendar">
                    <Icon name="calendar" size={26} color="#1a73e8" />
                  </Pressable>
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* Sticky banners on Home with animated rounded bottom corners */}
        {activeTab === 'home' && (
          <Animated.View style={[styles.stickyBannersContainer, { marginTop: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [-18, -headerH] }), borderTopLeftRadius: lerp(24, 0), borderTopRightRadius: lerp(24, 0) }]}>
            {/* The sheet's top takes the colour the header's sky ends in and shades down into the page colour. */}
            {/* Once the page has scrolled and the header has folded away, the page colour fills right up to the top and the sky's shade fades out, so no coloured band with an edge is left at the top of the screen. */}
            <View style={styles.sheetBack} pointerEvents="none" />
            <Animated.View style={[styles.skyShade, { opacity: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} pointerEvents="none">
              <SkyShade period={skyPeriod} />
            </Animated.View>
            {/* Scrolled: the bar the SOS and Quotes chips stick to takes the animation's own sky colours. */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: sheetScroll }]} pointerEvents="none">
              <SkyBar period={skyPeriod} />
            </Animated.View>
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
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => openPost(null)} accessibilityLabel="Post a repair job">
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
            activeTab === 'home' && styles.sheetOverlap,
            activeTab === 'home' && styles.sheetHome,
            // On Home the sheet's top corners straighten once the page has scrolled up to the top of the screen.
            activeTab === 'home' && { borderTopLeftRadius: lerp(24, 0), borderTopRightRadius: lerp(24, 0) },
          ]}
        >
          {activeTab === 'home' ? (
            <HomeScreen
              onSOSPress={() => setSOSStage('map')}
              onPostJob={() => openPost(null)}
              onServicePress={setSelectedService}
              onBookGarage={(garage) => openBooking({ garage })}
              onScrollChange={handleHomeScroll}
            />
          ) : activeTab === 'bids' ? (
            <BidsScreen
              tab={bidsTab}
              onTabChange={setBidsTab}
              onRepublish={(draft) => openPost(draft)}
              onNewBid={() => openPost(null)}
              onPayFirst={() => setPayFirst(true)}
              onViewActivity={() => {
                focusActivity({ kind: 'current', current: 'bids' });
                setActiveTab('activity');
              }}
              onHeaderVisibilityChange={setMartHeaderVisible}
            />
          ) : activeTab === 'activity' ? (
            <ActivityScreen onHeaderProgress={(p) => setMartHeaderVisible(p < 0.5)} onOpenMart={() => setActiveTab('mart')} onOpenBids={() => setActiveTab('bids')} onBookAgain={(b) => setSelectedService(categoryInfo(b.categoryId))} />
          ) : activeTab === 'mart' ? (
            <MartScreen
              activeVehicle={selectedVehicle}
              segment={martSegment}
              onSegmentChange={setMartSegment}
              searchSeed={martSeed}
              openShopRequest={martShopReq}
              onHeaderVisibilityChange={setMartHeaderVisible}
            />
          ) : (
            <ProfileScreen activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} onHeaderProgress={(p) => setMartHeaderVisible(p < 0.5)} />
          )}
        </Animated.View>

        <View style={styles.bottomNavContainer}>
          {/* A balance is due or late (and new work limited when it is long late): tap to see what is owed. */}
          <PayStandingBanner
            onPress={() => {
              focusActivity({ kind: 'done' });
              setActiveTab('activity');
            }}
          />
          {activeTab === 'mart' ? (
            <OwnerMartNav
              activeTab={martSegment}
              onTabChange={(next) => {
                // The garage in the middle takes the owner back to the OnGarage app.
                // OnMart always opens on its Shops tab the next time.
                if (next === 'ongarage') {
                  setMartSegment('shops');
                  setActiveTab('home');
                  return;
                }
                setMartSegment(next);
                setMartHeaderVisible(true);
              }}
            />
          ) : (
            <OwnerNav
              activeTab={activeTab}
              onTabChange={(next) => (next === 'mart' && !martAllowed ? setAskMart(true) : setActiveTab(next))}
            />
          )}
        </View>
        <Toast />
        <FlyLayer />
        {askMart && (
          <ModalCard
            material
            icon="🛍️"
            tone="primary"
            title="OnMart විවෘත කරන්නද?"
            body="වාහන කොටස් වෙළඳසැල් සොයා ගැනීමට OnMart හට ඔබගේ ස්ථානය සහ තෝරාගත් වාහනයේ තොරතුරු (මාදිලිය, අංක තහඩුව) භාවිතා කිරීමට ඔබගේ අවසරය අවශ්‍යයි. ඔබගේ දුරකථන අංකය වෙළඳසැල්වලට පෙන්වන්නේ නැත."
          >
            <DialogButton label="අවලංගු" onPress={() => setAskMart(false)} />
            <DialogButton
              filled
              label="අවසර දෙන්න"
              onPress={() => {
                setAskMart(false);
                setMartAllowed(true);
                setActiveTab('mart');
              }}
            />
          </ModalCard>
        )}
        <ServiceReminders />
        <PaymentReminders />
        {/* The chat icon stays put at the top right however the header folds away while the page scrolls. */}
        <Animated.View
          style={[styles.floatChat, { opacity: chatHide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: Animated.multiply(activeTab === 'home' ? sheetScroll : martHeaderCollapse, chatDockDrop) }, { translateY: chatHide.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }] }]}
          pointerEvents={chatBlocked ? 'none' : 'box-none'}
        >
          <ChatHeaderButton />
        </Animated.View>
      </SafeAreaView>

      <Modal visible={sosStage === 'map'} animationType="fade" statusBarTranslucent onRequestClose={closeSOS}>
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
        <Toast topOffset={84} />
      </Modal>

      {/* The running SOS job is a full-screen layer (not a modal) so it can step aside for OnMart without losing its place. */}
      {sosStage === 'flow' && sosLocation && (
        <View style={[StyleSheet.absoluteFill, styles.sosLayer, sosHidden && styles.sosLayerHidden]} pointerEvents={sosHidden ? 'none' : 'auto'}>
          <SOSFlowScreen
            location={sosLocation}
            vehicleId={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            onChangeLocation={() => setSOSStage('map')}
            onClose={closeSOS}
            onOpenShop={(shopId) => {
              setMartShopReq({ id: shopId, at: Date.now() });
              setMartSegment('shops');
              setSosHidden(true);
              setActiveTab('mart');
            }}
            onOpenMart={(part) => {
              setMartSeed(part);
              setMartSegment('shops');
              setSosHidden(true);
              setActiveTab('mart');
            }}
          />
          <Toast topOffset={84} />
        </View>
      )}
      {sosStage === 'flow' && sosHidden && (
        <Pressable style={styles.sosReturn} onPress={() => setSosHidden(false)} accessibilityLabel="Back to the SOS job">
          <Text style={styles.sosReturnText}>🚨 SOS රැකියාවට ආපසු ›</Text>
        </Pressable>
      )}

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
          <ServiceBrowseScreen service={selectedService} onClose={() => setSelectedService(null)} onBook={(garage) => openBooking({ garage, categoryId: selectedService.id })} />
        )}
        <Toast topOffset={84} />
      </Modal>
      <PayFirstSheet visible={payFirst} onClose={() => setPayFirst(false)} onViewOwed={() => {
          focusActivity({ kind: 'done' });
          setActiveTab('activity');
        }} />
      <DirectBookingSheet
        garage={booking?.garage ?? null}
        categoryId={booking?.categoryId}
        initial={booking?.initial}
        defaultVehicleId={selectedVehicle}
        onClose={() => setBooking(null)}
        onBooked={() => {
          setSelectedService(null);
          focusActivity({ kind: 'current', current: 'direct' });
          setActiveTab('activity');
        }}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
    </SafeAreaProvider>
    </ChatProvider>
    </BidsProvider>
    </WallProvider>
    </MartProvider>
    </LocationProvider>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  // Account: no header band, the page fills the screen.
  containerFull: { backgroundColor: pageBg() },
  // Room on the right for the chat bubble that floats over the top right corner.
  flex1: { flex: 1 },
  hamburger: { fontSize: 24, lineHeight: 26, color: '#1a73e8' },
  // Just a plain line icon on a round tint, no words.
  calendarBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f0fe' },
  pageTitleBar: { height: PAGE_TITLE_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 90 },
  pageTitle: { flexShrink: 1, fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  pageTitleAction: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: '#e8f0fe', borderWidth: 1, borderColor: '#d2e3fc' },
  pageTitleActionText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
  floatChat: { position: 'absolute', top: 10, right: 14, zIndex: 50, width: 66, height: 66, backgroundColor: 'transparent' },
  // The tab's screen overlaps the header band with rounded top corners.
  sheet: { flex: 1, backgroundColor: pageBg() },
  sosLayer: { zIndex: 50, backgroundColor: Colors.bgBody },
  sosLayerHidden: { display: 'none' },
  sosReturn: { position: 'absolute', zIndex: 60, left: 16, right: 16, bottom: 96, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, backgroundColor: '#dc2626', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  sosReturnText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff' },
  sheetOverlap: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  // Home: the list sits in its own rounded, shadowed sheet that slides up over the padding under the banners.
  // No border or shadow where the sheet meets the banners: the header's sky shades into the same page colour.
  // Solid: the page colour behind the lists.
  sheetHome: { marginTop: -16, zIndex: 2, backgroundColor: pageBg() },
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  // Sticky banners on Home (outside the sheet so they don't move when sheet expands)
  // Starts 4px above the container (over only the last strip of the header, so the buildings stay visible) and runs down over the sheet's top; a plain rectangle, no corners.
    // The page colour behind the banners, from exactly where the header ends (the container itself overlaps the header by 18).
  sheetBack: { position: 'absolute', left: 0, right: 0, top: 16, bottom: 0, backgroundColor: pageBg() },
  skyShade: { position: 'absolute', left: 0, right: 0, top: 16, height: 262, overflow: 'hidden' },
  stickyBannersContainer: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 6, paddingTop: 16, paddingBottom: 26, zIndex: 1, backgroundColor: 'transparent' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sosBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#c81e2b', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#c81e2b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 7 },
  // A soft light disc in the corner: depth without clutter.
  sheen: { position: 'absolute', top: -70, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  sosBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  sosLeft: { flex: 1, gap: 3 },
  sosBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginBottom: 3 },
  jobBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginBottom: 3 },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  heroTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
  heroSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.82)' },
  sosButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ffffff', borderWidth: 5, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sosButtonText: { fontSize: 17, fontWeight: '900', color: '#c81e2b', letterSpacing: 1 },
  jobBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#1b3a96', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#1b3a96', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  jobBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  jobLeft: { flex: 1, gap: 2 },
  jobBannerTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
  jobBannerSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.82)' },
  jobCta: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
  jobCtaText: { fontSize: 26, fontWeight: '700', color: '#1b3a96', marginTop: -2 },
}));
