import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, View } from 'react-native';
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
import { BottomNav, type NavAlert, TitleBand, Colors, ThemeProvider, themedStyles, useTheme, headerBand, getThemeMode, setAppShape } from '@ongarage/shared';

// This app has PickMe's shapes too (big rounded cards, pill buttons and chips, light edges, soft shadows), like the garage app. Set before the first screen is drawn.
setAppShape('pickme');
import { isActiveSOS, TechProvider, useTech } from './context/TechContext';
import { TECH_TABS, type TabId } from './constants/tabs';
import { ApprovalWaitingBar } from './components/ApprovalWaitingBar';
import { PaymentPrompt } from './components/PaymentPrompt';
import { TechHeader } from './components/TechHeader';
import { Toast } from './components/Toast';
import { ChatProvider } from './context/ChatContext';
import { ChatHeaderButton } from './components/ChatHeaderButton';
import { JobsScreen } from './screens/JobsScreen';
import { GaragesScreen } from './screens/GaragesScreen';
import { EarningsScreen } from './screens/EarningsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SOSJobScreen } from './screens/SOSJobScreen';

const TAB_TITLES: Partial<Record<TabId, string>> = { garages: 'ඔබගේ OnGarage සේවා ස්ථාන', earnings: 'ඔබගේ ආදායම' };

export default function App() {
  return (
    <ThemeProvider>
      <TechProvider>
        <ChatProvider>
          <AppShell />
        </ChatProvider>
      </TechProvider>
    </ThemeProvider>
  );
}

// Reading the theme here re-renders the whole tree on a switch (same approach as
// the other OnGarage apps), so screens pick up the new palette without remounting.
function AppShell() {
  const { isDark } = useTheme();
  const { offers, jobs, invites, earnings, openJob, closeSOS } = useTech();
  // Badges: jobs waiting for an answer, invitations, garages with an open account.
  const unsettled = new Set(earnings.filter((e) => !e.settled).map((e) => e.garageId)).size;
  // What the Jobs tab says without being opened: an offer waits for an answer (red strobe), the garage has not yet approved the repair charge (amber), on the way
  // to the site (blue radar), a job running (calm green).
  const sosJob = jobs.find(isActiveSOS);
  const jobsAlert: NavAlert | undefined = offers.length ? 'incoming' : sosJob?.stage === 'approval' ? 'waiting' : sosJob?.stage === 'enroute' ? 'enroute' : sosJob ? 'active' : undefined;
  const badges: Partial<Record<TabId, number>> = { jobs: offers.length + (jobs.some(isActiveSOS) ? 1 : 0), garages: invites.length, earnings: unsettled };
  const tabs = TECH_TABS.map((t) => ({ ...t, badge: badges[t.id], alert: t.id === 'jobs' ? jobsAlert : undefined }));
  const [tab, setTab] = useState<TabId>('jobs');
  const fade = useRef(new Animated.Value(0)).current;
  // Changing tab brings the new page in: it fades up and rises a little.
  const pageAnim = useRef(new Animated.Value(1)).current;
  const lastTab = useRef(tab);
  useEffect(() => {
    if (lastTab.current === tab) return;
    lastTab.current = tab;
    pageAnim.setValue(0);
    Animated.timing(pageAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [tab, pageAnim]);
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
    setFadeColor(isDark ? '#f0f0f0' : '#07090e');
    fade.setValue(0.75);
    Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  }, [isDark, fade]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, tab === 'me' && styles.containerFull]} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: pageAnim, transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        {tab === 'jobs' ? <TechHeader /> : TAB_TITLES[tab] ? <TitleBand title={TAB_TITLES[tab]!} /> : null}
        {/* The tab's screen overlaps the header band with rounded top corners, like the owner app. */}
        <View style={[styles.sheet, tab === 'me' && styles.sheetFull]}>
          {tab === 'jobs' && <JobsScreen />}
          {tab === 'garages' && <GaragesScreen />}
          {tab === 'earnings' && <EarningsScreen />}
          {tab === 'me' && <ProfileScreen />}
        </View>
        </Animated.View>
        <View style={styles.nav}>
          <BottomNav items={tabs} activeTab={tab} onTabChange={setTab} />
        </View>
        {/* OnChat: the icon stays at the top right on every tab */}
        <View style={styles.floatChat} pointerEvents="box-none">
          <ChatHeaderButton />
        </View>
        {/* Waiting for the garage to approve a repair charge: stays on every tab with a call button. */}
        <ApprovalWaitingBar />
        <Toast />
      </SafeAreaView>

      {/* The job just closed with the owner's code: what did the customer actually pay? */}
      <PaymentPrompt />

      {/* The SOS job in progress, full screen; minimising keeps it running. */}
      <Modal visible={!!openJob} animationType="slide" statusBarTranslucent onRequestClose={closeSOS}>
        {openJob && <SOSJobScreen key={openJob.id} />}
        <Toast topOffset={84} />
      </Modal>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: headerBand().bg },
    containerFull: { backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    sheetFull: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    flex1: { flex: 1 },
    sheet: { flex: 1, marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    nav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    floatChat: { position: 'absolute', top: 10, right: 14, zIndex: 50 },
  })
);
