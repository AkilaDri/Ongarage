import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
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
import { BottomNav, TitleBand, Colors, ThemeProvider, themedStyles, useTheme, headerBand, getThemeMode } from '@ongarage/shared';
import { GarageProvider, useGarage } from './context/GarageContext';
import { PartsProvider, useParts } from './context/PartsContext';
import { GARAGE_TABS, type TabId } from './constants/tabs';
import { GarageHeader } from './components/GarageHeader';
import { Toast } from './components/Toast';
import { SOSInboxScreen } from './screens/SOSInboxScreen';
import { SOSDispatchScreen } from './screens/SOSDispatchScreen';
import { JobFeedScreen } from './screens/JobFeedScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { GarageProfileScreen } from './screens/GarageProfileScreen';
import { OnMartScreen } from './screens/OnMartScreen';

const TAB_TITLES: Partial<Record<TabId, string>> = { jobs: 'ඔබගේ රැකියා අවස්ථා', schedule: 'ඔබගේ රැකියා කාලසටහන', parts: 'OnMart · කොටස් වෙළඳපොළ' };

export default function App() {
  return (
    <ThemeProvider>
      <GarageProvider>
        <PartsProvider>
          <AppShell />
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
  const { dispatch, leaveDispatch, directs } = useGarage();
  // Direct bookings wait on this garage with a deadline, so the Jobs tab shows how many.
  const newDirects = directs.filter((d) => d.status === 'new').length;
  // Parts: quotes waiting for a choice, or a delivery waiting to be checked in.
  const { awaitingChoice, orders } = useParts();
  const partsBadge = awaitingChoice.length + orders.filter((o) => o.status === 'arrived').length;
  const tabs = GARAGE_TABS.map((t) => (t.id === 'jobs' ? { ...t, badge: newDirects } : t.id === 'parts' ? { ...t, badge: partsBadge } : t));
  const [tab, setTab] = useState<TabId>('sos');
  // A booking card can open its parts request in the Parts tab.
  const [partsFocus, setPartsFocus] = useState<string | null>(null);
  const openParts = (requestId: string) => {
    setPartsFocus(requestId);
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

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, tab === 'garage' && styles.containerFull]} edges={['top']}>
        {tab === 'sos' ? <GarageHeader /> : TAB_TITLES[tab] ? <TitleBand title={TAB_TITLES[tab]!} /> : null}
        {/* The tab's screen overlaps the header band with rounded top corners, like the owner app. */}
        <View style={[styles.sheet, tab === 'garage' && styles.sheetFull]}>
          {tab === 'sos' && <SOSInboxScreen />}
          {tab === 'jobs' && <JobFeedScreen />}
          {tab === 'schedule' && <ScheduleScreen onOpenParts={openParts} />}
          {tab === 'parts' && <OnMartScreen focusId={partsFocus} onFocusHandled={() => setPartsFocus(null)} />}
          {tab === 'garage' && <GarageProfileScreen />}
        </View>
        <View style={styles.nav}>
          <BottomNav items={tabs} activeTab={tab} onTabChange={setTab} />
        </View>
        <Toast />
      </SafeAreaView>

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
    containerFull: { backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    sheetFull: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    flex1: { flex: 1 },
    sheet: { flex: 1, marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    nav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  })
);
