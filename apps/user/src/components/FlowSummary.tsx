import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** "Your request at a glance": the last look before a flow sends it. Label left, value right; the Bids card's look (26px corners, light edge, soft blue shadow). */
export const FlowSummary: React.FC<{ title: string; rows: { label: string; value: string }[] }> = ({ title, rows }) => (
  <View style={styles.card} accessibilityLabel="Summary">
    <Text style={styles.title}>{title}</Text>
    {rows.map((r) => (
      <View key={r.label} style={styles.row}>
        <Text style={styles.label}>{r.label}</Text>
        <Text style={styles.value}>{r.value}</Text>
      </View>
    ))}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { paddingHorizontal: 16, paddingVertical: 14, gap: 8, borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1d4ed8' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    label: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    value: { flexShrink: 1, fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain, textAlign: 'right' },
  })
);
