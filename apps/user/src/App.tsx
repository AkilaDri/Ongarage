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
import { Colors, FONTS, getThemeMode, Pulse, themedStyles } from '@ongarage/shared';
import { ThemeProvider, useTheme } from '@ongarage/shared';
import { VehiclesProvider } from './context/VehiclesContext';
import { LocationProvider } from './context/LocationContext';
import { BidsProvider } from './context/BidsContext';
import { NoticeProvider } from './context/NoticeContext';
import { BookingsProvider } from './context/BookingsContext';
import { WorkshopProvider } from './context/WorkshopContext';
import { ProfileProvider } from './context/ProfileContext';
import { Header, TitleBand } from './components/Header';
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
import { BottomNav } from '@ongarage/shared';
import { USER_TABS, type TabId } from './constants/tabs';
import { categoryInfo, type Garage, type JobDraft, type PickedLocation, type ServiceCategory } from '@ongarage/shared';

// The title band other tabs show instead of the greeting header (Home has the header; Account has nothing and uses the full screen).
const TAB_TITLES: Partial<Record<TabId, string>> = { bids: 'ඔබගේ ලංසු වල තත්ත්වය', activity: 'ඔබේ ක්‍රියාකාරකම්' };

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
  const [sosStage, setSOSStage] = useState<SOSStage>('closed');
  const [sosLocation, setSOSLocation] = useState<PickedLocation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('premio');
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
  const [postJob, setPostJob] = useState<{ draft: JobDraft | null } | null>(null);
  const [bidsTab, setBidsTab] = useState<BidsTab>('received');
  // Booking a garage directly (from Home, a service list, or "book again").
  const [booking, setBooking] = useState<{ garage: Garage; categoryId?: string } | null>(null);

  const closeSOS = useCallback(() => setSOSStage('closed'), []);

  const handleHomeScroll = useCallback((y: number) => {
    scrollY.current = y;
    // Expand sheet when scrolling down (triggers at ~80px scroll).
    const expandThreshold = 80;
    const progress = Math.min(1, Math.max(0, (y - expandThreshold) / 120));
    sheetScroll.setValue(progress);
  }, [sheetScroll]);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LocationProvider>
    <BidsProvider>
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* One header band on every tab: a short greeting and the active vehicle. */}
        {activeTab === 'home' ? (
          <Header activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
        ) : TAB_TITLES[activeTab] ? (
          <TitleBand title={TAB_TITLES[activeTab]!} />
        ) : null}

        {/* Sticky banners on Home with animated rounded bottom corners */}
        {activeTab === 'home' && (
          <Animated.View
            style={[
              styles.stickyBannersContainer,
              {
                borderBottomLeftRadius: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                borderBottomRightRadius: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                paddingBottom: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ]}
          >
            <Pressable style={({ pressed }) => [styles.sosBanner, pressed && styles.pressed]} onPress={() => setSOSStage('map')} accessibilityLabel="Open SOS">
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
            <Pressable style={({ pressed }) => [styles.jobBanner, pressed && styles.pressed]} onPress={() => setPostJob({ draft: null })} accessibilityLabel="Post a repair job">
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
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.sheet,
            activeTab !== 'profile' && styles.sheetOverlap,
            activeTab === 'home' && {
              marginTop: sheetScroll.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }),
            },
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
              onPostJob={() => setPostJob({ draft: null })}
              onRepublish={(draft) => setPostJob({ draft })}
              onViewActivity={() => setActiveTab('activity')}
            />
          ) : activeTab === 'activity' ? (
            <ActivityScreen onOpenBids={() => setActiveTab('bids')} onBookAgain={(b) => setSelectedService(categoryInfo(b.categoryId))} />
          ) : (
            <ProfileScreen activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
          )}
        </Animated.View>

        <View style={styles.bottomNavContainer}>
          <BottomNav items={USER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
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
    </LocationProvider>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  // The tab's screen overlaps the header band with rounded top corners.
  sheet: { flex: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  sheetOverlap: { marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  // Sticky banners on Home (outside the sheet so they don't move when sheet expands)
  stickyBannersContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8, zIndex: 10, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sosBanner: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#dc2626', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 6 },
  sosBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sosLeft: { flex: 1, gap: 3 },
  sosBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.18)', marginBottom: 2 },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  heroTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#fff' },
  heroSub: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: '#e2e8f0' },
  sosButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sosButtonText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  jobBanner: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#162b63', shadowColor: '#162b63', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 5 },
  jobBannerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  jobLeft: { flex: 1, gap: 2 },
  jobBannerTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff' },
  jobBannerSub: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)' },
  jobCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.85)', flexShrink: 0 },
  jobCtaText: { fontSize: 22, fontWeight: '700', color: '#fff' },
}));
