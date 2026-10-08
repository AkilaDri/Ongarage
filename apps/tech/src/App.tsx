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
import { BottomNav, Colors, ThemeProvider, themedStyles, useTheme, headerBand, getThemeMode } from '@ongarage/shared';
import { isActiveSOS, TechProvider, useTech } from './context/TechContext';
import { TECH_TABS, type TabId } from './constants/tabs';
import { TechHeader } from './components/TechHeader';
import { Toast } from './components/Toast';
import { JobsScreen } from './screens/JobsScreen';
import { GaragesScreen } from './screens/GaragesScreen';
import { EarningsScreen } from './screens/EarningsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SOSJobScreen } from './screens/SOSJobScreen';

export default function App() {
  return (
    <ThemeProvider>
      <TechProvider>
        <AppShell />
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
  const badges: Partial<Record<TabId, number>> = { jobs: offers.length + (jobs.some(isActiveSOS) ? 1 : 0), garages: invites.length, earnings: unsettled };
  const tabs = TECH_TABS.map((t) => ({ ...t, badge: badges[t.id] }));
  const [tab, setTab] = useState<TabId>('jobs');
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <TechHeader />
        {/* The tab's screen overlaps the header band with rounded top corners, like the owner app. */}
        <View style={styles.sheet}>
          {tab === 'jobs' && <JobsScreen />}
          {tab === 'garages' && <GaragesScreen />}
          {tab === 'earnings' && <EarningsScreen />}
          {tab === 'me' && <ProfileScreen />}
        </View>
        <View style={styles.nav}>
          <BottomNav items={tabs} activeTab={tab} onTabChange={setTab} />
        </View>
        <Toast />
      </SafeAreaView>

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
    flex1: { flex: 1 },
    sheet: { flex: 1, marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    nav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  })
);
