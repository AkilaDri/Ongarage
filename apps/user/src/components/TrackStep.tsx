import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** How the owner follows the job: each choice and what it means, in the order offered. */
const TRACK_CHOICES = [
  { live: true, a11y: 'Live tracking', title: '📡 Live track', about: 'ගරාජය ඔබේ වාහනය භාර ගත් මොහොතේ සිට වැඩ අවසන් වන තුරු, සෑම පියවරක්ම ඔබට app එකෙන් බලාගත හැක. වැඩේ පියවරක් වෙනස් වන විට ඔබට දැනුම් දෙයි.' },
  { live: false, a11y: 'Without live tracking', title: '📷 Live නැතුව', about: 'ගරාජය වාහනය භාර ගත් විට, එහි එවේලේ තත්ත්වය පෙන්වන ඡායාරූප ඔබට ලැබේ. අතරමැද පියවර ගැන දැනුම් නොදේ; වැඩ අවසන් වූ විට දැනුම් දෙයි.' },
];

/** The booking flows' tracking step (the garage booking and the booking of an accepted quote): two short choices, what the picked one means, and the rule that holds for both. */
export const TrackStep: React.FC<{ live: boolean; onLive: (live: boolean) => void }> = ({ live, onLive }) => (
  <>
    <View style={styles.headRow}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>✓</Text>
      </View>
      <Text style={styles.question}>වැඩ ගමන හඹා යන ආකාරය</Text>
    </View>
    <View style={styles.grid}>
      {TRACK_CHOICES.map((c) => {
        const on = live === c.live;
        return (
          <Pressable key={c.title} style={[styles.choice, on && styles.choiceOn]} onPress={() => onLive(c.live)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c.a11y}>
            <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{c.title}</Text>
          </Pressable>
        );
      })}
    </View>
    <Text style={styles.desc}>{TRACK_CHOICES.find((c) => c.live === live)?.about}</Text>
    {/* Always in view: following less never means approving less. */}
    <View style={styles.rule}>
      <Text style={styles.ruleIcon}>🛡️</Text>
      <Text style={styles.ruleText}>ඔබ කුමන ක්‍රමය තේරුවත්, අමතර වැඩක් හෝ අමතර වියදමක් ඔබේ අනුමැතිය නැතිව නොකෙරේ. වැඩේ අවසන් වන්නේ ඔබේ කේතයෙන් පමණි.</Text>
    </View>
  </>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 2 },
    badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    badgeText: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#ffffff' },
    question: { flex: 1, fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { width: '48.5%', flexGrow: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.borderColor },
    choiceOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    choiceText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
    choiceTextOn: { color: '#ffffff' },
    desc: { fontSize: 13.5, lineHeight: 22, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    rule: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#eff6ff' },
    ruleIcon: { fontSize: 15, lineHeight: 20 },
    ruleText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
  })
);
