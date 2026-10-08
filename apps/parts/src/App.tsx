import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
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
import { ShopProvider, useShop } from './context/ShopContext';
import { PARTS_TABS, type TabId } from './constants/tabs';
import { ShopHeader } from './components/ShopHeader';
import { Toast } from './components/Toast';
import { RequestsScreen } from './screens/RequestsScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { StockScreen } from './screens/StockScreen';
import { ShopProfileScreen } from './screens/ShopProfileScreen';

const TAB_TITLES: Partial<Record<TabId, string>> = { orders: 'ඔබගේ ඇණවුම්', stock: 'ඔබගේ තොගය' };

export default function App() {
  return (
    <ThemeProvider>
      <ShopProvider>
        <AppShell />
      </ShopProvider>
    </ThemeProvider>
  );
}

// Reading the theme here re-renders the whole tree on a switch (same approach as
// the owner and garage apps), so screens pick up the new palette without remounting.
function AppShell() {
  const { isDark } = useTheme();
  const { newRequests, ordersNeedingAction, stock, newCustomer, newWall, salesNeedingAction } = useShop();
  // Badges: requests waiting for a quote, orders waiting on the shop, items out of stock.
  const outOfStock = stock.filter((i) => i.variants.some((v) => v.qty === 0)).length;
  const badges: Partial<Record<TabId, number>> = { requests: newRequests.length + newCustomer.length + newWall.length, orders: ordersNeedingAction.length + salesNeedingAction.length, stock: outOfStock };
  const tabs = PARTS_TABS.map((t) => ({ ...t, badge: badges[t.id] }));
  const [tab, setTab] = useState<TabId>('requests');
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
      <SafeAreaView style={[styles.container, tab === 'shop' && styles.containerFull]} edges={['top']}>
        {/* Like the owner app: a sky-blue title band, and the tab's screen overlaps it on rounded corners. The Shop tab (profile) has no band and fills the area. */}
        {tab === 'requests' ? <ShopHeader /> : TAB_TITLES[tab] ? <TitleBand title={TAB_TITLES[tab]!} /> : null}
        <View style={[styles.sheet, tab === 'shop' && styles.sheetFull]}>
          {tab === 'requests' && <RequestsScreen />}
          {tab === 'orders' && <OrdersScreen />}
          {tab === 'stock' && <StockScreen />}
          {tab === 'shop' && <ShopProfileScreen />}
        </View>
        <View style={styles.nav}>
          <BottomNav items={tabs} activeTab={tab} onTabChange={setTab} />
        </View>
        <Toast />
      </SafeAreaView>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: headerBand().bg },
    containerFull: { backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    flex1: { flex: 1 },
    sheet: { flex: 1, marginTop: -18, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    sheetFull: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    nav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  })
);
