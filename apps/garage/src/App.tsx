import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { Colors, FONTS, GlassIcon, ThemeProvider, ThemeToggle, themedStyles, useTheme } from '@ongarage/shared';

type TabId = 'sos' | 'jobs' | 'schedule' | 'profile';

// Each tab is the garage-side counterpart of a step in the vehicle-owner app.
const TABS: { id: TabId; icon: string; label: string; title: string; planned: string[] }[] = [
  {
    id: 'sos',
    icon: '🚨',
    label: 'SOS',
    title: 'හදිසි SOS ඉල්ලීම්',
    planned: [
      'ඔබගේ කලාපය තුළ ලැබෙන SOS ඇඟවීම් (බ්‍රේක්ඩවුන් වර්ගය, වාහනය, දුර)',
      'ඉල්ලීම පිළිගැනීම සහ මිල ගණන් යැවීම',
      'යාන්ත්‍රිකයා / වෑන් පැවරීම සහ සජීවී ස්ථානය බෙදා ගැනීම',
      'පැමිණියා → අලුත්වැඩියාව → අවසන් ලෙස සලකුණු කිරීම',
      'පාරිභෝගිකයාගේ QR කේතය ස්කෑන් කර රැකියාව වසා දැමීම',
    ],
  },
  {
    id: 'jobs',
    icon: '🔨',
    label: 'රැකියා',
    title: 'රැකියා සහ ලංසු',
    planned: [
      'ඔබ ලබා දෙන සේවා සහ දුර අනුව පෙරූ රැකියා ලැයිස්තුව',
      'Buddy රෝග විනිශ්චය, අමතර කොටස් කැමැත්ත, නිවසටම පැමිණීම',
      'ලංසුවක් යැවීම: මිල, වගකීම, ඇස්තමේන්තු කාලය',
      'අවසන් වීමට පෙර ලංසුව සංස්කරණය / ඉවත් කිරීම',
    ],
  },
  {
    id: 'schedule',
    icon: '📅',
    label: 'කාලසටහන',
    title: 'මගේ රැකියා',
    planned: [
      'පිළිගත් වෙන් කිරීම් සහ නිවසටම පැමිණීමේ කාලසටහන',
      'සක්‍රීය සහ සම්පූර්ණ කළ රැකියා',
      'දිනූ / පැරදුණු ලංසු සහ ආදායම',
    ],
  },
  {
    id: 'profile',
    icon: '🏪',
    label: 'ගරාජය',
    title: 'ගරාජ පැතිකඩ',
    planned: [
      'පාරිභෝගිකයන්ට පෙනෙන ගරාජ කාඩ්පත: නම, විශේෂඥතාව, ඡායාරූප',
      'ලබා දෙන සේවා අංශ සහ උප අංශ',
      'විවෘත වේලාවන්, ස්ථානය, දුරකථනය, සේවා කලාපය',
      'යාන්ත්‍රිකයන් සහ වෑන් රථ, ශ්‍රේණිගත කිරීම් සහ සමාලෝචන',
    ],
  },
];

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { isDark, toggle } = useTheme();
  const [tab, setTab] = useState<TabId>('sos');
  const [fontsLoaded] = useFonts({
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <GlassIcon emoji="🛠️" small />
          <View style={styles.flex1}>
            <Text style={styles.brand}>OnGarage Garage</Text>
            <Text style={styles.sub}>ගරාජ හිමිකරුවන් සඳහා</Text>
          </View>
          <View style={styles.devPill}>
            <Text style={styles.devPillText}>සංවර්ධනය වෙමින්</Text>
          </View>
        </View>

        <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
          <View style={[styles.card, styles.row]}>
            <GlassIcon emoji={current.icon} />
            <Text style={[styles.title, styles.flex1]}>{current.title}</Text>
          </View>

          <Text style={styles.section}>සැලසුම් කළ විශේෂාංග</Text>
          {current.planned.map((p) => (
            <View key={p} style={[styles.card, styles.row]}>
              <View style={styles.dot} />
              <Text style={[styles.item, styles.flex1]}>{p}</Text>
            </View>
          ))}

          {tab === 'profile' && (
            <View style={[styles.card, styles.row]}>
              <GlassIcon emoji={isDark ? '🌙' : '☀️'} small />
              <Text style={[styles.item, styles.flex1]}>{isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය'}</Text>
              <ThemeToggle isDark={isDark} onToggle={toggle} />
            </View>
          )}
        </ScrollView>

        <View style={styles.nav}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable key={t.id} style={styles.navItem} onPress={() => setTab(t.id)}>
                <Text style={[styles.navIcon, !active && styles.navIconIdle]}>{t.icon}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderColor,
    },
    brand: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    devPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    devPillText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    body: { padding: 16, gap: 10, paddingBottom: 32 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5, marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    item: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    nav: {
      flexDirection: 'row',
      height: 68,
      paddingBottom: 8,
      backgroundColor: Colors.barBg,
      borderTopWidth: 1,
      borderTopColor: Colors.borderColor,
    },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    navIcon: { fontSize: 20 },
    navIconIdle: { opacity: 0.45 },
    navLabel: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    navLabelActive: { color: Colors.primary, fontFamily: FONTS.bodySemiBold },
  })
);
