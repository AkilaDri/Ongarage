import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StayToggle } from './StayToggle';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** Will the owner be with the vehicle? The answer decides how the job is followed and how approvals work, so the app does not pick one for them. */
const STAY_CHOICES = [
  { stays: true, a11y: 'I will stay', label: '🪑 රැඳී සිටිමි', about: 'වැඩ සහ මිල ගැන කාර්මිකයා සමඟ එතනම කතා\u00a0කර\u00a0ගන්න.' },
  { stays: false, a11y: 'I will leave the vehicle', label: '🚶 තබා යනවා', about: 'අතරමැදි පියවර app එකෙන් බලා\u00a0අනුමත\u00a0කරන්න.' },
];

/** The booking flows' step about staying (the garage booking and the booking of an accepted quote): one question, as a toggle, with what the choice means and the rule that holds for both. */
export const TrackStep: React.FC<{ stays: boolean | null; onStays: (stays: boolean) => void }> = ({ stays, onStays }) => (
  <>
    <View style={styles.headRow}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>✓</Text>
      </View>
      <Text style={styles.question}>වැඩ කරන විට ඔබ වාහනය ළඟ සිටිනවාද?</Text>
    </View>
    <StayToggle value={stays} options={STAY_CHOICES} onChange={onStays} empty="පිළිතුරක් තෝරන්න." />
    <View style={styles.rule}>
      <Text style={styles.ruleIcon}>🛡️</Text>
      <Text style={styles.ruleText}>ඔබගේ එකඟතාව නැතිව අමතර වැඩක් හෝ වියදමක් නොකෙරේ. වැඩේ අවසන් වන්නේ ඔබේ කේතයෙන් පමණි.</Text>
    </View>
  </>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 2 },
    badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    badgeText: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#ffffff' },
    question: { flex: 1, fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    rule: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#eff6ff' },
    ruleIcon: { fontSize: 15, lineHeight: 20 },
    ruleText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
  })
);
