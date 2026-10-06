import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';

const KEY = 'ongarage.owner.notifications';

type Prefs = { jobUpdates: boolean; bids: boolean; offers: boolean };
const DEFAULTS: Prefs = { jobUpdates: true, bids: true, offers: false };

const ROWS: { id: keyof Prefs; title: string; sub: string }[] = [
  { id: 'jobUpdates', title: 'රැකියා යාවත්කාලීන', sub: 'SOS, වෙන්කිරීම්, අනුමැතිය අවශ්‍ය අවස්ථා' },
  { id: 'bids', title: 'නව ලංසු', sub: 'ඔබගේ රැකියාවලට ගරාජ ලංසු තැබූ විට' },
  { id: 'offers', title: 'දීමනා සහ ප්‍රවර්ධන', sub: 'ගරාජවලින් විශේෂ දීමනා' },
];

/** Notifications, language and privacy. Notification choices are kept on this device. */
export const AppSettingsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(KEY)
      .then((v) => v && setPrefs({ ...DEFAULTS, ...JSON.parse(v) }))
      .catch(() => {});
  }, [visible]);

  const toggle = (id: keyof Prefs) => {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <Sheet visible={visible} title="යෙදුම් සැකසුම්" subtitle="දැනුම්දීම්, භාෂාව සහ පෞද්ගලිකත්වය" onClose={onClose}>
      <Text style={styles.label}>දැනුම්දීම්</Text>
      <View style={styles.list}>
        {ROWS.map((r, i) => (
          <Pressable key={r.id} style={[styles.row, i > 0 && styles.divider]} onPress={() => toggle(r.id)} accessibilityRole="switch" accessibilityState={{ checked: prefs[r.id] }} accessibilityLabel={r.title}>
            <View style={styles.flex1}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.sub}>{r.sub}</Text>
            </View>
            <View style={[styles.switch, prefs[r.id] && styles.switchOn]}>
              <View style={[styles.knob, prefs[r.id] && styles.knobOn]} />
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>භාෂාව</Text>
      <View style={[styles.list, styles.row]}>
        <View style={styles.flex1}>
          <Text style={styles.title}>සිංහල</Text>
          <Text style={styles.sub}>ඉංග්‍රීසි සහ දෙමළ ඉදිරියේදී</Text>
        </View>
        <Text style={styles.check}>✓</Text>
      </View>

      <Text style={styles.label}>පෞද්ගලිකත්වය</Text>
      <View style={[styles.list, styles.note]}>
        <Text style={styles.sub}>
          ඔබගේ දුරකථන අංකය ගරාජයකට පෙනෙන්නේ ඔබ ලංසුවක් පිළිගත් හෝ වෙන්කිරීමක් තහවුරු වූ පසු පමණි. ඔබ එවන විස්තර, ඡායාරූප සහ හඬ සටහන් භාවිතා වන්නේ රැකියාව
          සඳහා පමණි. AI යෝජනා (උදා: සේවා වර්ගය) යෝජනා පමණි — තීරණය ඔබගේයි.
        </Text>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 4 },
    list: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 16, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    divider: { borderTopWidth: 1, borderTopColor: Colors.borderColor },
    note: { padding: 14 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    check: { fontSize: 16, fontWeight: '900', color: Colors.success },
    switch: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: Colors.subtleBorder, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.success },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
  })
);
