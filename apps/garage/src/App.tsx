import { onFly } from './utils/fly';
import { FlyLayer } from './components/FlyLayer';
import { GarageActivityView } from './components/GarageActivityView';
import { GarageCalendar } from './components/GarageCalendar';
import { MoneyCalendarIcon } from './components/MoneyCalendarIcon';
import { pageBg } from './utils/pageBg';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { BottomNav, ClipboardLineIcon, FONTS, ScheduleLineIcon, SosLineIcon, type NavAlert, TitleBand, Colors, ThemeProvider, themedStyles, useTheme, headerBand, getThemeMode, setAppShape } from '@ongarage/shared';

// The garage app has PickMe's shapes (big rounded cards, pill buttons and chips, light edges, soft shadows); the other apps keep the Material shapes. Set before the first screen is drawn.
setAppShape('pickme');
import { GarageProvider, useGarage } from './context/GarageContext';
import { PartsProvider, useParts } from './context/PartsContext';
import { ACTIVE_STAGES, MartProvider, useMart } from './context/MartContext';
import { MART_TABS, type MartNavId } from './constants/martTabs';
import { setMartOpener, setShopOpener } from './utils/martBridge';
import { SosApprovalBanner } from './components/SosApprovalBanner';
import { PaymentPrompt } from './components/PaymentPrompt';
import { PaymentReminders } from './components/PaymentReminders';
import type { MartSegment } from './screens/MartScreen';
import { type OnMartTop } from './screens/OnMartScreen';
import { HEADER_SCROLL, useCollapsingHeader } from './utils/collapsingHeader';
import { chatDockDrop, chatDockOffset } from './utils/chatDock';
import { WallProvider } from './context/WallContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ChatHeaderButton } from './components/ChatHeaderButton';
import { GARAGE_TABS, type TabId } from './constants/tabs';
import { GarageHeader } from './components/GarageHeader';
import { Toast } from './components/Toast';
import { SOSInboxScreen } from './screens/SOSInboxScreen';
import { SOSDispatchScreen } from './screens/SOSDispatchScreen';
import { JobFeedScreen } from './screens/JobFeedScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { GarageProfileScreen } from './screens/GarageProfileScreen';
import { OnMartScreen } from './screens/OnMartScreen';

const TAB_TITLES: Partial<Record<TabId, string>> = { sos: 'SOS · හදිසි ඉල්ලීම්', jobs: 'ඔබගේ රැකියා අවස්ථා', schedule: 'ඔබගේ රැකියා කාලසටහන', parts: 'OnMart · කොටස් වෙළඳපොළ' };

export default function App() {
  return (
    <ThemeProvider>
      <GarageProvider>
        <PartsProvider>
          <MartProvider>
            <WallProvider>
              <ChatProvider>
                <AppShell />
              </ChatProvider>
            </WallProvider>
          </MartProvider>
        </PartsProvider>
      </GarageProvider>
    </ThemeProvider>
  );
}

// Reading the theme here re-renders the whole tree on a switch (same approach as
// the owner app), so screens pick up the new palette without remounting.
function AppShell() {
  const { isDark } = useTheme();
  // The open job (if any) is held by the store; several committed jobs can run at once.
  const { dispatch, leaveDispatch, directs, requests, bookings, activeJobs, isOpen } = useGarage();
  // Direct bookings wait on this garage with a deadline, so the Jobs tab shows how many.
  const newDirects = directs.filter((d) => d.status === 'new').length;
  // Parts: quotes waiting for a choice, or a delivery waiting to be checked in.
  const { awaitingChoice, orders } = useParts();
  const partsBadge = awaitingChoice.length + orders.filter((o) => o.status === 'arrived').length;
  // SOS: requests waiting for an answer. Schedule: the jobs still to do (booked or in progress).
  const scheduleBadge = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled').length;
  // What the SOS tab says without being opened (priority order): a technician's repair charge waits for the owner's answer right now (fast red / amber strobe), new
  // requests while online (red strobe), a technician on the move to the site (blue radar), a job running (calm green).
  const pendingApprovals = activeJobs.filter((d) => d.priceApproval?.status === 'pending');
  const sosAlert: NavAlert | undefined = pendingApprovals.length
    ? 'approval'
    : isOpen && requests.length
      ? 'incoming'
      : activeJobs.some((d) => d.stage === 'techAccept' || d.stage === 'enroute')
        ? 'enroute'
        : activeJobs.length
          ? 'active'
          : undefined;
  const badges: Partial<Record<TabId, number>> = { sos: pendingApprovals.length || requests.length, jobs: newDirects, schedule: scheduleBadge, parts: partsBadge };
  const tabs = GARAGE_TABS.map((t) => ({ ...t, badge: badges[t.id], alert: t.id === 'sos' ? sosAlert : undefined }));
  // Jobs is the home screen: the garage opens on the work waiting for it.
  const [tab, setTab] = useState<TabId>('jobs');
  // The Schedule page has two titles: the schedule itself and the Activity (every transaction, with the commissions).
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [scheduleView, setScheduleView] = useState<'schedule' | 'activity'>('schedule');
  const openScheduleView = (v: 'schedule' | 'activity') => {
    setScheduleView(v);
    header.reset();
  };
  // On the Jobs tab, backing out of a conversation opened from the inbox returns to the inbox.
  const { setInboxReturn } = useChat();
  useEffect(() => setInboxReturn(tab === 'jobs'), [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  // A booking card can open its parts request in the Parts tab.
  const [partsFocus, setPartsFocus] = useState<string | null>(null);
  // OnMart: which part of it is open (the marketplace, job parts, referrals) and which marketplace section (the bottom bar).
  const [martTop, setMartTop] = useState<OnMartTop>('mart');
  const [martSection, setMartSection] = useState<MartSegment>('shops');
  const [martSeed, setMartSeed] = useState('');
  const [martShopReq, setMartShopReq] = useState<{ id: string; at: number; ask?: boolean } | null>(null);
  // A chat can send the garage to OnMart with a part searched (a part it has to buy for a job).
  useEffect(() => {
    setMartOpener((part) => {
      setMartTop('mart');
      setMartSection('shops');
      setMartSeed('');
      setTimeout(() => setMartSeed(part), 0);
      setTab('parts');
    });
    setShopOpener((shopId, ask) => {
      setMartTop('mart');
      setMartSection('shops');
      setMartShopReq({ id: shopId, at: Date.now(), ask });
      setTab('parts');
    });
    return () => {
      setMartOpener(null);
      setShopOpener(null);
    };
  }, []);
  const { enquiries, purchases } = useMart();
  const martBadges: Partial<Record<MartNavId, number>> = { mine: enquiries.length, orders: purchases.filter((p) => ACTIVE_STAGES.includes(p.stage)).length };
  const martTabs = MART_TABS.map((t) => ({ ...t, badge: martBadges[t.id] }));
  // How far the headers have scrolled away on this page: the title band and the page's own tab bar both follow it.
  const header = useCollapsingHeader();
  // A bid sent: the Jobs page's header (and its chips) comes back down, so "My bids" is in view for the token to land on.
  useEffect(() => onFly((k) => k === 'bid' && header.reset()), [header.reset]);
  const martShift = header.shift;
  const [bandH, setBandH] = useState(76);
  useEffect(() => {
    header.reset();
  }, [tab, header.reset]);
  const openParts = (requestId: string) => {
    setPartsFocus(requestId);
    setMartTop('jobs');
    setTab('parts');
  };
  const fade = useRef(new Animated.Value(0)).current;
  const [fadeColor, setFadeColor] = useState(Colors.bgBody);
  const firstRender = useRef(true);
  const [fontsLoaded] = useFonts({
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setFadeColor(isDark ? '#f1f5f9' : '#07090e');
    fade.setValue(0.75);
    Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  }, [isDark, fade]);

  if (!fontsLoaded) return null;

  // Jobs, Schedule and OnMart have a top header band; SOS and Profile start right at the top.
  const band = tab === 'jobs' || tab === 'schedule' || tab === 'parts' ? bandH : 0;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, (tab === 'garage' || tab === 'schedule' || tab === 'sos') && styles.containerFull]} edges={['top']}>
        {tab === 'jobs' || tab === 'schedule' || tab === 'parts' ? (
          // Jobs, Schedule and OnMart: the title band and the sheet move up together as the page's list scrolls (a transform, so
          // nothing is re-laid out). The block reaches one band-height past the bottom (under the bottom bar), so when it has
          // moved up it still fills the screen. The page's own tab bar moves with it (see the page).
          <Animated.View style={{ flex: 1, marginBottom: -band, transform: [{ translateY: martShift.interpolate({ inputRange: [0, HEADER_SCROLL], outputRange: [0, -band], extrapolate: 'clamp' }) }] }}>
            <View onLayout={(e) => e.nativeEvent.layout.height > 0 && setBandH(e.nativeEvent.layout.height)}>
              {tab === 'jobs' && <GarageHeader />}
              {tab === 'parts' && <TitleBand title={TAB_TITLES.parts!} />}
              {tab === 'schedule' && <TitleBand
                  title="Schedule"
                  backgroundColor={pageBg()}
                  right={
                    // Two calendars that can be told apart: the Schedule's is the plain calendar (blue); the Activitys' is a calendar with a coin on its page (green), for the money.
                    <Pressable style={[styles.calendarBtn, scheduleView === 'activity' && styles.calendarBtnMoney]} onPress={() => setCalendarOpen(true)} accessibilityLabel={scheduleView === 'activity' ? 'Open transactions calendar' : 'Open schedule calendar'}>
                      {scheduleView === 'activity' ? <MoneyCalendarIcon size={26} /> : <ScheduleLineIcon active size={26} />}
                    </Pressable>
                  }
                  // The open title stands first; touching the other one swaps them with a slide (the title band does the ordering).
                  tabs={[
                    { id: 'schedule', label: 'Schedule', icon: <ScheduleLineIcon active size={26} />, active: scheduleView === 'schedule', onPress: () => openScheduleView('schedule') },
                    { id: 'activity', label: 'Activitys', icon: <ClipboardLineIcon active size={26} />, active: scheduleView === 'activity', onPress: () => openScheduleView('activity') },
                  ]}
                />}
            </View>
            {/* The tab's screen overlaps the header band with rounded top corners, like the owner app. */}
            <View style={[styles.sheet, tab === 'schedule' && styles.sheetFull]}>
              {tab === 'jobs' && <JobFeedScreen shift={martShift} onScrollY={header.onScrollY} />}
              {tab === 'schedule' && (
                <>
                  {/* Both stay mounted, so the Schedule keeps its tab and scroll while the Activity is open. */}
                  <View style={[styles.flex1, scheduleView !== 'schedule' && { display: 'none' }]}>
                    <ScheduleScreen onOpenParts={openParts} shift={martShift} onScrollY={header.onScrollY} />
                  </View>
                  {scheduleView === 'activity' && <GarageActivityView />}
                </>
              )}
              {tab === 'parts' && (
                <OnMartScreen shift={martShift} onScrollY={header.onScrollY} setBarShown={header.setShown} reset={header.reset} bandHeight={band} top={martTop} onTopChange={setMartTop} section={martSection} onSectionChange={setMartSection} searchSeed={martSeed} shopRequest={martShopReq} focusId={partsFocus} onFocusHandled={() => setPartsFocus(null)} />
              )}
            </View>
          </Animated.View>
        ) : (
          <>
            {tab === 'sos' && <TitleBand title="SOS" icon={<SosLineIcon active size={28} />} backgroundColor={pageBg()} />}
            {/* The tab's screen overlaps the header band with rounded top corners, like the owner app. */}
            <View style={[styles.sheet, (tab === 'garage' || tab === 'sos') && styles.sheetFull]}>
              {tab === 'sos' && <SOSInboxScreen />}
              {tab === 'garage' && <GarageProfileScreen shift={martShift} onScrollY={header.onScrollY} />}
            </View>
          </>
        )}
        <View style={styles.nav}>
          {tab === 'parts' ? (
            <BottomNav
              items={martTabs}
              activeTab={(martTop === 'mart' ? martSection : '') as MartNavId}
              onTabChange={(next) => {
                // The garage in the middle takes the garage back to its own app.
                // OnMart always opens on its Shops tab the next time.
                if (next === 'ongarage') {
                  setMartTop('mart');
                  setMartSection('shops');
                  setTab('jobs');
                  return;
                }
                setMartTop('mart');
                setMartSection(next);
              }}
            />
          ) : (
            <BottomNav items={tabs} activeTab={tab} onTabChange={setTab} />
          )}
        </View>
        {/* The chat icon stays put at the top right however the header folds away while the page scrolls. */}
        <Animated.View style={[styles.floatChat, { transform: [{ translateY: Animated.multiply(Animated.multiply(martShift, 1 / HEADER_SCROLL), chatDockDrop) }] }]} pointerEvents="box-none">
          <ChatHeaderButton />
        </Animated.View>
        {/* A technician's repair charge waits for the owner during an SOS job: it follows the owner to every screen until answered. */}
        <SosApprovalBanner />
        <Toast />
        <FlyLayer />
      </SafeAreaView>

      <GarageCalendar visible={calendarOpen} onClose={() => setCalendarOpen(false)} view={scheduleView} />
      {/* The job just closed with the owner's code: what did the customer actually pay? */}
      <PaymentPrompt />
      <PaymentReminders />

      {/* Hardware back behaves like the dispatch header button. */}
      <Modal visible={!!dispatch} animationType="slide" statusBarTranslucent onRequestClose={leaveDispatch}>
        {dispatch && <SOSDispatchScreen key={dispatch.id} />}
        <Toast topOffset={84} />
      </Modal>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: headerBand().bg },
    containerFull: { backgroundColor: pageBg() },
    sheetFull: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    flex1: { flex: 1 },
    sheet: { flex: 1, marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: pageBg() },
    nav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    calendarBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    calendarBtnMoney: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea' },
    floatChat: { position: 'absolute', top: 10, right: 14, zIndex: 50 },
  })
);
