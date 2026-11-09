import { FlyLayer } from './components/FlyLayer';
import { pageBg } from './utils/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, View, StyleSheet, Modal, Text, Pressable } from 'react-native';
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
import { Gradient, Icon, Colors, DialogButton, FONTS, getThemeMode, ModalCard, Pulse, themedStyles } from '@ongarage/shared';
import { periodOf, SkyBar, SkyShade, useHour } from './components/WeatherAnimation';
import { HomeSearch } from './components/home/HomeSearch';
import { CategoryPhoto } from './components/home/CategoryPhoto';
import { ThemeProvider, useTheme, setAppShape } from '@ongarage/shared';

// This app has PickMe's shapes too (big rounded cards, pill buttons and chips, light edges, soft shadows), like the garage app. Set before the first screen is drawn.
setAppShape('pickme');
import { VehiclesProvider, useVehicles } from './context/VehiclesContext';
import { OwnerMartNav, OwnerNav } from './components/OwnerNav';
import { setMartOpener, setShopOpener } from './utils/martBridge';
import { setFittingOpener } from './utils/fittingBridge';
import { LocationProvider } from './context/LocationContext';
import { LanguageProvider } from './context/LanguageContext';
import { MartProvider, useMart } from './context/MartContext';
import { WallProvider } from './context/WallContext';
import { BidsProvider } from './context/BidsContext';
import { NoticeProvider, useNotice } from './context/NoticeContext';
import { ChatProvider } from './context/ChatContext';
import { BookingsProvider } from './context/BookingsContext';
import { SOSRecordsProvider } from './context/SOSRecordsContext';
import { PendingRepairsProvider } from './context/PendingRepairsContext';
import { WorkshopProvider } from './context/WorkshopContext';
import { ProfileProvider } from './context/ProfileContext';
import { Header, HEADER_BAND_H, TitleBand } from './components/Header';
import { VehicleChip } from './components/VehicleChip';
import { HOME_FLOW } from './constants/homeFlow';
import { PlaceCommunityProvider } from './context/PlaceCommunityContext';
import { EvBookingProvider } from './context/EvBookingContext';
import { TowProvider } from './context/TowContext';
import { TowRecordsProvider } from './context/TowRecordsContext';
// The old towing screen is kept in apps/user/backup-towing-v1 (restore here if the new flow must be reverted).
import { TowFlow, type TowStatus } from './screens/tow/TowFlow';
import { GarageReviewsSheet } from './components/GarageReviewsSheet';
import { MartHeader } from './components/mart/MartHeader';
import { ChatHeaderButton } from './components/ChatHeaderButton';
import { ServiceReminders } from './components/ServiceReminders';
import { PaymentReminders } from './components/PaymentReminders';
import { PayFirstSheet } from './components/PayStandingViews';
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
import { BookedPrompt } from './components/BookedPrompt';
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
/** Marks what is on the OnMart page the owner has open (My requests / Open wall / Orders) as seen, so its count on the bottom bar clears. */
const MartSeenTracker: React.FC<{ active: boolean; segment: string }> = ({ active, segment }) => {
  const { markSeen, attention } = useMart();
  useEffect(() => {
    if (!active) return;
    if (segment === 'mine') markSeen('requests');
    else if (segment === 'wall') markSeen('wall');
    else if (segment === 'orders') markSeen('orders');
  }, [active, segment, attention.total, markSeen]);
  return null;
};

/** On the web: is the touch inside something that scrolls sideways (a row of chips, a carousel)? Those keep their own sideways drags. */
const inSideScroller = (e: { nativeEvent?: unknown }) => {
  if (Platform.OS !== 'web') return false;
  let el = (e.nativeEvent as { target?: HTMLElement } | undefined)?.target ?? null;
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)) return true;
    el = el.parentElement;
  }
  return false;
};

const TAB_TITLES: Partial<Record<TabId, string>> = { bids: 'Your Bids', activity: 'Activity', mart: 'OnMart' };
/** The title bar of every tab but Home: a plain line of text at the top of the screen. */

// Banner sizes: stacked cards at the top of Home, one compact row once the page is scrolled.
// The deeper blue under the free-quotes text, behind the search bar (transparent at the top, navy at the bottom).
const SEARCH_TINT = [
  { offset: '0', color: '#0b1d5e', opacity: 0 },
  { offset: '1', color: '#0b1d5e', opacity: 0.75 },
];
// The SOS and towing cards: 56px, the height two lines of text need.
const ROW_H = 56;
// The blue card is taller when it holds the search bar (HOME_FLOW 'search'); JOB_TOP_H is its text part.
const JOB_TOP_H = 72;
// The repair card: a title, then the search row at its foot; no empty band between them.
const JOB_H = HOME_FLOW === 'search' ? 120 : JOB_TOP_H;
const BANNER_GAP = 8;
// The repair card's inner inset: the title and the search row share this left edge.
const JOB_INSET = 16;
const COMPACT_H = 56;
// The SOS card takes this share of the top row; towing takes the rest.
const SOS_SPLIT = 0.4;

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
                <PendingRepairsProvider>
                  <AppShell />
                </PendingRepairsProvider>
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
  // How far the two banners have folded into their compact, pinned row (0 = stacked cards, 1 = the row at the top): they get there after a short scroll
  // (BANNER_FOLD_PX), while `sheetScroll` (the sheet's rise, one for one with the finger) takes longer.
  const bannerFold = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const [homeFolded, setHomeFolded] = useState(false);
  const [headerH, setHeaderH] = useState(80);
  // Width of the banner area: the two banners tween between stacked cards and one row of two.
  const [bannerW, setBannerW] = useState(358);
  // The pinned row is the full width of the header, the two banners side by side and the same size (the OnChat button docks below it).
  const half = (bannerW - BANNER_GAP) / 2;
  const lerp = (a: number, b: number) => sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const lerpB = (a: number, b: number) => bannerFold.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const fadeOut = bannerFold.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  // The expanded button fades out over the first part of the fold and the folded pill fades in over the rest, so they never show together.
  const fadeIn = bannerFold.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  // Once the card is folded to its compact row, the search and its touch zone must not take taps meant for the Quotes button.
  const [searchLive, setSearchLive] = useState(true);
  useEffect(() => {
    const id = bannerFold.addListener(({ value }) => setSearchLive(value < 0.5));
    return () => bannerFold.removeListener(id);
  }, [bannerFold]);
  // How far Home has scrolled, 0 at the top and 1 once it has gone HOME_FOLD_PX: the OnChat button condenses to its short form.
  const homeFold = useRef(new Animated.Value(0)).current;
  // Home has no pinned bar, so the OnChat button never drops for one.
  const noDrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Briefly veil the switch with the previous background so it cross-fades.
    setFadeColor(isDark ? '#f0f0f0' : '#07090e');
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
  // Changing tab brings the new page in: the sheet fades up and rises a little.
  // Swiping the page sideways changes the tab, in the order of the bottom bar (left = the next tab, right = the one before). OnMart keeps its own sideways
  // gestures (swipe a request to the wall, its own bar), and anything that scrolls sideways or can be swiped open (SwipeCard) takes its own drags first.
  // On the web a sideways drag at the edge of the page is the browser's back / forward gesture; the page's own sideways swipe must not trigger it.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.overscrollBehaviorX = 'none';
    document.body.style.overscrollBehaviorX = 'none';
  }, []);
  const goTab = useRef<(dir: 1 | -1) => void>(() => {});
  goTab.current = (dir) => {
    if (activeTab === 'mart') return;
    const next = USER_TABS[USER_TABS.findIndex((t) => t.id === activeTab) + dir]?.id;
    if (!next) return;
    if (next === 'mart' && !martAllowed) setAskMart(true);
    else setActiveTab(next);
  };
  const tabSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 2.2 && !inSideScroller(e),
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 70 || (Math.abs(g.dx) > 35 && Math.abs(g.vx) > 0.5)) goTab.current(g.dx < 0 ? 1 : -1);
      },
    })
  ).current;
  const pageAnim = useRef(new Animated.Value(1)).current;
  const lastTab = useRef(activeTab);
  useEffect(() => {
    if (lastTab.current === activeTab) return;
    lastTab.current = activeTab;
    pageAnim.setValue(0);
    Animated.timing(pageAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [activeTab, pageAnim]);
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
  // A tow is running (the truck has accepted): Home hides its towing button until it ends.
  const [towStatus, setTowStatus] = useState<TowStatus>({ running: false, label: '', needsInput: false });
  // The owner put the running tow away: the flow is hidden and a return bar shows (on Home, and over the other tabs).
  const [towMinimised, setTowMinimised] = useState(false);
  const closeTow = () => {
    setTowMinimised(false);
    setSelectedService(null);
  };
  // The height of the Home banners: SOS, Repair, and towing when it shows.
  const bannersH = ROW_H + BANNER_GAP + JOB_H;
  // SOS takes the full top row only while a tow is minimised (its return bar is then the one thing to reach).
  const sosFull = towMinimised && towStatus.running;
  // While an SOS job runs (its flow is open, minimised or not), the towing button takes the whole row, as the SOS button does while a tow runs.
  const towFull = sosStage === 'flow';
  // What the SOS job is doing, for the status line while it is put away.
  const [sosStatus, setSosStatus] = useState({ label: '', needsAction: false });
  // A decision (a part, a price, the QR code) brings the owner back to the job without them looking for it.
  useEffect(() => {
    if (sosStatus.needsAction) setSosHidden(false);
  }, [sosStatus.needsAction]);
  const [martSeed, setMartSeed] = useState('');
  const [martShopReq, setMartShopReq] = useState<{ id: string; at: number; ask?: boolean } | null>(null);
  const [sosLocation, setSOSLocation] = useState<PickedLocation | null>(null);
  // The active vehicle lives in the vehicles context, so it is kept between launches and every tab reads the same one.
  const { activeVehicleId: selectedVehicle, setActiveVehicleId: setSelectedVehicle } = useVehicles();
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
  // A suggested job from Home ("Oil Change") opens its category with that sub-service picked.
  const [selectedSubName, setSelectedSubName] = useState<string | undefined>(undefined);
  const [postJob, setPostJob] = useState<{ draft: JobDraft | null } | null>(null);
  // A balance long overdue limits new work (marketplace/reliability.ts): a new job, a bid accepted, a direct booking. SOS, chat, OnMart and paying stay open.
  const standing = usePayStanding();
  const [payFirst, setPayFirst] = useState(false);
  const openPost = (draft: JobDraft | null) => (standing.limited ? setPayFirst(true) : setPostJob({ draft }));
  const openBooking = (b: { garage: Garage; categoryId?: string; initial?: { description?: string; vehicleId?: string; service?: string }; back?: () => void }) => (standing.limited ? setPayFirst(true) : setBooking(b));
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
  // `back` brings the garage's profile back when the form is closed without booking (the profile was open when "book" was tapped).
  const [booking, setBooking] = useState<{ garage: Garage; categoryId?: string; initial?: { description?: string; vehicleId?: string; service?: string }; back?: () => void } | null>(null);
  const { notify } = useNotice();
  // The garage a booking request has just gone to: the "sent" message (BookedPrompt) shows while this is set.
  const [bookedGarage, setBookedGarage] = useState<string | null>(null);
  // A garage picked in Home's search: its profile opens over Home.
  const [searchGarage, setSearchGarage] = useState<Garage | null>(null);
  // A garage's chat (opened from its card) can start a direct booking of it, with what the owner already asked.
  useEffect(() => {
    setBookingOpener((garageId, categoryId, initial) => {
      const garage = MOCK_GARAGES.find((x) => x.id === garageId);
      if (garage) openBooking({ garage, categoryId, initial });
    });
    return () => setBookingOpener(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standing.limited]);

  // However the job ends, the owner lands on Home: a job that stepped aside to OnMart (and came back) must not leave them on the OnMart tab.
  const closeSOS = useCallback(() => {
    setSOSStage('closed');
    setSosHidden(false);
    setMartSeed('');
    setMartShopReq(null);
    setActiveTab('home');
  }, []);
  const setMartHeaderVisible = useCallback((visible: boolean) => {
    Animated.timing(martHeaderCollapse, { toValue: visible ? 0 : 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [martHeaderCollapse]);

  // The banners follow the owner's own scrolling (nothing snaps by itself): as the Home sheet is scrolled up the SOS and free-quotes banners fold into their
  // one row and stick in the top header, and they unfold the same way on the way back. They are pinned when the sheet reaches them, after `collapsePx` of scrolling, and `HomeScreen` holds its content back by the same distance so everything moves with the finger, one for one.
  const collapsePx = Math.max(1, ROW_H + BANNER_GAP + JOB_H - COMPACT_H + Math.max(0, headerH - 18));
  const collapseRef = useRef(collapsePx);
  collapseRef.current = collapsePx;
  const handleHomeScroll = useCallback((y: number) => {
    scrollY.current = y;
    setHomeFolded(y >= collapseRef.current);
    sheetScroll.setValue(Math.min(1, Math.max(0, y / collapseRef.current)));
    // The banners fold over the same distance as the sheet rises, so the sheet always meets the banners (a quicker fold leaves an empty gap between them).
    bannerFold.setValue(Math.min(1, Math.max(0, y / collapseRef.current)));
  }, [sheetScroll, bannerFold]);

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

  // The SOS button is always one tap away: on Home once the card has scrolled off, and on every other tab. Hidden while the running job's return bar shows.

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
    <PlaceCommunityProvider>
    <EvBookingProvider>
    <TowRecordsProvider><TowProvider>
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
              {/* The owner's vehicle, on every tab that has a title bar: left of the chat button. */}
              <VehicleChip />
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
              {/* SOS and towing share the top row (SOS left, towing right). Only while a tow is minimised does SOS take the full row. */}
              <Animated.View style={{ height: lerp(bannersH, COMPACT_H) }}>
                {/* SOS: the left half of the top row; once scrolled it folds away into the Quotes bar. */}
                {/* While an SOS job runs, its red return bar sits under the Repair card, so this button is hidden. */}
                <Animated.View style={[styles.sosBanner, styles.bannerAbs, { display: sosStage === 'flow' ? 'none' : 'flex', width: lerpB(sosFull ? bannerW : bannerW * SOS_SPLIT, 0), height: lerpB(ROW_H, COMPACT_H), top: 0, left: 0, opacity: fadeOut }]}>
                  <Gradient stops={SOS_GRADIENT} />
                  <View style={styles.sheen} pointerEvents="none" />
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => setSOSStage('map')} accessibilityLabel="Open SOS">
                    <Animated.View style={[styles.sosBannerContent, styles.bannerFull, { width: sosFull ? bannerW : bannerW * SOS_SPLIT, opacity: fadeOut }]}>
                      <View style={styles.cardStack}>
                        <Text style={styles.sosWord}>SOS</Text>
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

                {/* Towing beside the SOS card, on the same row: a neutral card, so red stays with SOS alone. Hidden while a tow runs. */}
                <Animated.View style={[styles.towingCard, styles.bannerAbs, skyPeriod === 'night' && styles.nightLift, { display: towStatus.running ? 'none' : 'flex', left: towFull ? 0 : bannerW * SOS_SPLIT + BANNER_GAP, width: lerpB(towFull ? bannerW : bannerW * (1 - SOS_SPLIT) - BANNER_GAP, 0), height: lerpB(ROW_H, COMPACT_H), top: 0, opacity: fadeOut }]}>
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => setSelectedService(categoryInfo('12'))} accessibilityLabel="Towing">
                    <Animated.View style={[styles.towingContent, styles.bannerFull, { width: towFull ? bannerW : bannerW * (1 - SOS_SPLIT) - BANNER_GAP }]}>
                      <View style={styles.towingRow}>
                        <CategoryPhoto categoryId="12" size={18} />
                        <Text style={styles.towingLabel}>TOWING</Text>
                      </View>
                    </Animated.View>
                  </Pressable>
                </Animated.View>

                {/* Post a job: full card below the SOS card, the right half of the row once scrolled */}
                <Animated.View style={[styles.jobBanner, styles.bannerAbs, skyPeriod === 'night' && styles.nightLift, { width: bannerW, height: lerpB(JOB_H, COMPACT_H), top: lerpB(ROW_H + BANNER_GAP, 0), left: 0 }]}>
                  <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} onPress={() => openPost(null)} accessibilityLabel="Post a repair job">
                    <Animated.View style={[styles.jobBannerContent, styles.bannerFull, HOME_FLOW === 'search' && { bottom: undefined, height: JOB_TOP_H }, { width: bannerW, opacity: fadeOut }]}>
                      <View style={styles.jobLeft}>
                        <Text style={styles.jobBannerTitle}>වාහනයේ <Text style={styles.jobBannerLatin}>Repair</Text> එකක්ද?</Text>
                      </View>
                    </Animated.View>
                    <Animated.View style={[styles.compactRow, { opacity: fadeIn }]} pointerEvents="box-none">
                      <Pressable style={styles.compactRow} onPress={() => openPost(null)} accessibilityLabel="Post a repair job">
                        <View style={styles.compactPlus}>
                          <View style={styles.plusBarH} />
                          <View style={styles.plusBarV} />
                        </View>
                        <Text style={styles.compactJob}>Quotes ඉල්ලන්න</Text>
                      </Pressable>
                    </Animated.View>
                  </Pressable>
                  {/* The search part of the card is its own touch zone: touching the search bar or the space round it never reaches the post-a-job press behind it. */}
                  {HOME_FLOW === 'search' && searchLive && <View style={{ position: 'absolute', left: 0, right: 0, top: JOB_TOP_H, bottom: 0 }} onStartShouldSetResponder={() => true} />}
                  {/* The search bar inside the blue card, under the free-quotes text; the ＋ above still posts a job. */}
                  {HOME_FLOW === 'search' && (
                    <Animated.View pointerEvents={searchLive ? 'auto' : 'none'} style={{ position: 'absolute', left: JOB_INSET, bottom: JOB_INSET, width: Math.max(0, (bannerW - 2 * JOB_INSET) * 0.54 - 4), opacity: fadeOut }}>
                      <HomeSearch
                        inCard
                        onService={(c, sub) => {
                          setSelectedSubName(sub);
                          setSelectedService(c);
                        }}
                        onGarage={setSearchGarage}
                        onPost={(categoryId, text) => openPost({ categoryId, description: text, vehicleId: selectedVehicle } as unknown as JobDraft)}
                      />
                    </Animated.View>
                  )}
                  {HOME_FLOW === 'search' && searchLive && (
                    <Pressable style={({ pressed }) => [styles.quoteAction, { width: Math.max(0, (bannerW - 2 * JOB_INSET) * 0.46 - 4) }, pressed && styles.pressed]} onPress={() => openPost(null)} accessibilityLabel="Post a repair job">
                      <Text style={styles.quoteActionText}>Quotes ඉල්ලන්න</Text>
                    </Pressable>
                  )}
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        )}

        <Animated.View
          {...tabSwipe.panHandlers}
          style={[
            styles.sheet,
            activeTab === 'home' && styles.sheetOverlap,
            activeTab === 'home' && styles.sheetHome,
            { opacity: pageAnim, transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
          ]}
        >
          {activeTab === 'home' ? (
            <HomeScreen
              onSOSPress={() => setSOSStage('map')}
              sosReturn={sosStage === 'flow' && sosHidden ? (
                <Pressable style={styles.sosReturnInline} onPress={() => setSosHidden(false)} accessibilityLabel="Back to the SOS job">
                  <Text style={styles.sosReturnText}>{sosStatus.label ? `🚨 ${sosStatus.label} ›` : '🚨 SOS රැකියාවට ආපසු ›'}</Text>
                </Pressable>
              ) : null}
              towReturn={towMinimised && towStatus.running ? (
                <Pressable style={styles.towReturnInline} onPress={() => setTowMinimised(false)} accessibilityLabel="Back to the towing job">
                  <Text style={styles.sosReturnText}>{`🛻 ${towStatus.label} ›`}</Text>
                </Pressable>
              ) : null}
              onPostJob={() => openPost(null)}
              onServicePress={(c, sub) => {
                setSelectedSubName(sub);
                setSelectedService(c);
              }}
              onBookGarage={(garage, back) => openBooking({ garage, back })}
              onScrollChange={handleHomeScroll}
              collapsePx={collapsePx}
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
            <ActivityScreen onHeaderProgress={(p) => martHeaderCollapse.setValue(p)} onOpenMart={() => setActiveTab('mart')} onOpenBids={() => setActiveTab('bids')} onBookAgain={(b) => setSelectedService(categoryInfo(b.categoryId))} />
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
            <ProfileScreen activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} onHeaderProgress={(p) => martHeaderCollapse.setValue(p)} onOpenHome={() => setActiveTab('home')} onOpenActivity={() => { focusActivity({ kind: 'done' }); setActiveTab('activity'); }} />
          )}
        </Animated.View>

        <View style={styles.bottomNavContainer}>
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
        {/* Above the toasts: a notice never covers the way to SOS. */}
        {/* Folded Home: the chat sits in the bottom-right corner, where the SOS disc was, so it never covers the Quotes bar. */}
        {activeTab === 'home' && homeFolded && (
          <View style={styles.foldChatCorner} pointerEvents="box-none">
            <ChatHeaderButton round night={skyPeriod === 'night'} />
          </View>
        )}
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
        {/* Something in OnMart for the owner while they are elsewhere shows on the OnMart tab; the page being open counts it as seen. */}
        <MartSeenTracker active={activeTab === 'mart'} segment={martSegment} />
        <ServiceReminders />
        <PaymentReminders />
        {/* The chat icon stays put at the top right however the header folds away while the page scrolls. */}
        <Animated.View
          style={[styles.floatChat, activeTab !== 'home' && { top: -2 }, { opacity: Animated.multiply(chatHide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), activeTab === 'home' ? bannerFold.interpolate({ inputRange: [0.4, 1], outputRange: [1, 0], extrapolate: 'clamp' }) : 1), transform: [{ translateY: Animated.multiply(activeTab === 'home' ? noDrop : martHeaderCollapse, chatDockDrop) }, { translateY: chatHide.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }] }]}
          pointerEvents={chatBlocked || (activeTab === 'home' && homeFolded) ? 'none' : 'box-none'}        >
          <ChatHeaderButton scrolled={activeTab === 'home' ? homeFold : martHeaderCollapse} night={skyPeriod === 'night'} />
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
            onMinimize={() => setSosHidden(true)}
            onStatus={setSosStatus}
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
      {sosStage === 'flow' && sosHidden && activeTab !== 'home' && (
        <Pressable style={styles.sosReturn} onPress={() => setSosHidden(false)} accessibilityLabel="Back to the SOS job">
          <Text style={styles.sosReturnText}>{sosStatus.label ? `🚨 ${sosStatus.label} ›` : '🚨 SOS රැකියාවට ආපසු ›'}</Text>
        </Pressable>
      )}
      {towMinimised && towStatus.running && activeTab !== 'home' && (
        <Pressable style={styles.towReturn} onPress={() => setTowMinimised(false)} accessibilityLabel="Back to the towing job">
          <Text style={styles.sosReturnText}>{`🛻 ${towStatus.label} ›`}</Text>
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

      <Modal visible={selectedService !== null && selectedService.id !== '12'} animationType="fade" statusBarTranslucent onRequestClose={() => setSelectedService(null)}>
        {selectedService && selectedService.id !== '12' && (
          <ServiceBrowseScreen service={selectedService} initialSub={selectedSubName} vehicleId={selectedVehicle} onPostJob={HOME_FLOW === 'search' ? (categoryId) => { setSelectedService(null); openPost({ categoryId, description: '', vehicleId: selectedVehicle } as unknown as JobDraft); } : undefined} onClose={() => setSelectedService(null)} onBook={(garage, back) => openBooking({ garage, categoryId: selectedService.id, back })} />
        )}
        <Toast topOffset={84} />
      </Modal>
      {/* The towing flow is not a Modal: a Modal unmounts its contents when hidden, which would lose a running tow. Minimising hides this layer and keeps the flow mounted. */}
      {selectedService?.id === '12' && (
        <View pointerEvents={towMinimised ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, styles.towLayer, towMinimised && styles.towLayerHidden]}>
          <TowFlow onClose={closeTow} onMinimize={() => setTowMinimised(true)} onStatus={setTowStatus} active={!towMinimised} />
        </View>
      )}
      <PayFirstSheet visible={payFirst} onClose={() => setPayFirst(false)} onViewOwed={() => {
          focusActivity({ kind: 'done' });
          setActiveTab('activity');
        }} />
      <GarageReviewsSheet
        garage={searchGarage}
        onClose={() => setSearchGarage(null)}
        onReopen={setSearchGarage}
        onBook={searchGarage ? () => { const g = searchGarage; setSearchGarage(null); openBooking({ garage: g, back: () => setSearchGarage(g) }); } : undefined}
      />
      <DirectBookingSheet
        garage={booking?.garage ?? null}
        categoryId={booking?.categoryId}
        initial={booking?.initial}
        defaultVehicleId={selectedVehicle}
        onClose={() => {
          // The form closes, booked or not, and the garage's profile it was opened from comes back: the owner stays where they were.
          const back = booking?.back;
          setBooking(null);
          back?.();
        }}
        // The form's last step says the request was sent and points to the Activity tab; closing it brings the garage's profile back.
        onViewActivity={() => {
          setBooking(null);
          setSelectedService(null);
          setSearchGarage(null);
          focusActivity({ kind: 'current', current: 'direct' });
          setActiveTab('activity');
        }}
      />
      <BookedPrompt
        garageName={bookedGarage}
        onClose={() => setBookedGarage(null)}
        onGo={() => {
          setBookedGarage(null);
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
    </TowProvider></TowRecordsProvider>
    </EvBookingProvider>
    </PlaceCommunityProvider>
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
  sosReturnInline: { marginHorizontal: 16, marginTop: 4, marginBottom: 14, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, backgroundColor: '#dc2626', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sosReturnText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff' },
  // The towing return bar: the same shape as SOS's, in the blue of the towing flow.
  towReturn: { position: 'absolute', zIndex: 60, left: 16, right: 16, bottom: 96, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, backgroundColor: '#1d367f', shadowColor: '#1d367f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 },
  towLayer: { zIndex: 150, elevation: 150, backgroundColor: 'transparent' },
  towLayerHidden: { display: 'none' },
  towReturnInline: { marginHorizontal: 16, marginTop: 4, marginBottom: 14, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, backgroundColor: '#1d367f', shadowColor: '#1d367f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sheetOverlap: { marginTop: -18, overflow: 'hidden' },
  // Home: the list sits in its own rounded, shadowed sheet that slides up over the padding under the banners.
  // No border or shadow where the sheet meets the banners: the header's sky shades into the same page colour.
  // Solid: the page colour behind the lists.
  sheetHome: { marginTop: -16, zIndex: 2, backgroundColor: 'transparent' },
  // Sticky banners on Home (outside the sheet so they don't move when sheet expands)
  // Starts 4px above the container (over only the last strip of the header, so the buildings stay visible) and runs down over the sheet's top; a plain rectangle, no corners.
    // The page colour behind the banners, from exactly where the header ends (the container itself overlaps the header by 18).
  skyShade: { position: 'absolute', left: 0, right: 0, top: 16, height: 262, overflow: 'hidden' },
  sheetBack: { position: 'absolute', left: 0, right: 0, top: 16, bottom: 0, backgroundColor: pageBg() },
  stickyBannersContainer: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 26, zIndex: 1, backgroundColor: 'transparent' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  foldChatCorner: { position: 'absolute', right: 16, bottom: 92, zIndex: 3 },
  sosBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#B91C1C', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#c81e2b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 7 },
  // A soft light disc in the corner: depth without clutter.
  sheen: { position: 'absolute', top: -70, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  sosBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, gap: 12 },
  sosLeft: { flex: 1, gap: 3 },
  sosBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: '#ffffff', marginBottom: 3 },
  jobBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: '#ffffff', marginBottom: 3 },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  // Solid white badges carry their colour in the text, so the small label reads on the white.
  badgeTextSos: { color: '#b91c1c' },
  badgeTextJob: { color: '#1b3a96' },
  heroTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
  heroSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
  towingCard: { borderRadius: 22, backgroundColor: '#0D2B3E', overflow: 'hidden' },
  // At night the navy cards would sink into the dark sky: a thin light edge and a soft glow lift them off it.
  nightLift: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', shadowColor: '#7dd3fc', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  towingContent: { alignItems: 'center', justifyContent: 'center', gap: 2, left: 0 },
  cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // One wordmark line: heavy Latin on the deeper red, white on it is about 7:1.
  sosWord: { fontSize: 16, lineHeight: 20, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 1.2 },
  towingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  // The same type as SOS: one bold size, caps with tracking, white on the coloured button.
  towingLabel: { fontSize: 16, lineHeight: 20, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 1.2 },
  towingText: { alignItems: 'flex-start', gap: 2 },
  cardLabel: { fontSize: 15, lineHeight: 18, fontFamily: FONTS.titleBold, color: '#ffffff' },
  cardSub: { fontSize: 12, lineHeight: 15, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
  jobBannerLatin: { fontSize: 19, fontFamily: FONTS.titleBold },
  quoteAction: { position: 'absolute', right: JOB_INSET, bottom: JOB_INSET, height: 44, paddingHorizontal: 10, borderRadius: 22, backgroundColor: '#1A73E8', alignItems: 'center', justifyContent: 'center' },
  quoteActionText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff', textAlign: 'center' },
  // No shadow keys at all (the app's PickMe shape adds a soft shadow to any style that has one): its shadow showed as a pale streak between this card and the search bar.
  jobSearchTint: { position: 'absolute', left: 0, right: 0, top: JOB_TOP_H - 14, bottom: 0 },
  jobQuoteOutline: { position: 'absolute', left: 10, right: 10, top: 10, height: JOB_TOP_H - 14 },
  jobBanner: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#0D2B3E', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', shadowColor: '#0D2B3E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
  jobBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  jobLeft: { flex: 1, gap: 2 },
  jobBannerTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.2 },
  jobBannerSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
  jobCta: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bannerAbs: { position: 'absolute' },
  bannerFull: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  compactRow: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  compactSos: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  compactSmall: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  compactPlus: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  compactDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  // The plus is drawn (not a glyph) so its stroke weight matches the dot's.
  plusBarH: { position: 'absolute', width: 12, height: 2.5, borderRadius: 2, backgroundColor: '#ffffff' },
  plusBarV: { position: 'absolute', width: 2.5, height: 12, borderRadius: 2, backgroundColor: '#ffffff' },
  compactPlusText: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: -2 },
  compactJob: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff' },
  jobCtaText: { fontSize: 26, fontWeight: '700', color: '#1b3a96', marginTop: -2 },
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
}));
