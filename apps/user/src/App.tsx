import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Modal } from 'react-native';
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
import { Colors, themedStyles } from '@ongarage/shared';
import { ThemeProvider, useTheme } from '@ongarage/shared';
import { VehiclesProvider } from './context/VehiclesContext';
import { LocationProvider } from './context/LocationContext';
import { BidsProvider } from './context/BidsContext';
import { NoticeProvider } from './context/NoticeContext';
import { BookingsProvider } from './context/BookingsContext';
import { WorkshopProvider } from './context/WorkshopContext';
import { Header } from './components/Header';
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

type SOSStage = 'closed' | 'map' | 'flow';

SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <ThemeProvider>
      <NoticeProvider>
        <WorkshopProvider>
          <VehiclesProvider>
            <BookingsProvider>
              <AppShell />
            </BookingsProvider>
          </VehiclesProvider>
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
  const [postJob, setPostJob] = useState<{ draft: JobDraft | null; buddy: boolean } | null>(null);
  const [bidsTab, setBidsTab] = useState<BidsTab>('received');
  // Booking a garage directly (from Home, a service list, or "book again").
  const [booking, setBooking] = useState<{ garage: Garage; categoryId?: string } | null>(null);

  const closeSOS = useCallback(() => setSOSStage('closed'), []);

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
        {/* One header on every tab, like the garage, parts and technician apps. */}
        <Header activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
        {activeTab === 'home' ? (
          <HomeScreen
            onSOSPress={() => setSOSStage('map')}
            onPostJob={(buddy) => setPostJob({ draft: null, buddy })}
            onServicePress={setSelectedService}
            onBookGarage={(garage) => setBooking({ garage })}
          />
        ) : activeTab === 'bids' ? (
          <BidsScreen
            tab={bidsTab}
            onTabChange={setBidsTab}
            onPostJob={() => setPostJob({ draft: null, buddy: false })}
            onRepublish={(draft) => setPostJob({ draft, buddy: false })}
            onViewActivity={() => setActiveTab('activity')}
          />
        ) : activeTab === 'activity' ? (
          <ActivityScreen onOpenBids={() => setActiveTab('bids')} onBookAgain={(b) => setSelectedService(categoryInfo(b.categoryId))} />
        ) : (
          <ProfileScreen activeVehicle={selectedVehicle} onVehicleChange={setSelectedVehicle} />
        )}

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
            openBuddy={postJob.buddy}
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
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
}));
