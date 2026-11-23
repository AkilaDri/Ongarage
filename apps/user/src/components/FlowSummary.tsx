import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

type Row = { label: string; value: string; /** Show at most this many lines of the value (the rest is cut off). */ lines?: number; /** Two short items side by side: this row and the next `half` row share one line. */ half?: boolean };

/** "Your request at a glance": the last look before a flow sends it. The Bids card's look (26px corners, a light edge, a soft blue shadow); the title, then each item as a label above its value with a hairline between items. Rows marked `half` sit side by side in pairs. */
export const FlowSummary: React.FC<{ title: string; rows: Row[] }> = ({ title, rows }) => {
  const lines: Row[][] = [];
  rows.forEach((r) => {
    const last = lines[lines.length - 1];
    if (r.half && last && last.length === 1 && last[0].half) last.push(r);
    else lines.push([r]);
  });
  return (
    <View style={styles.card} accessibilityLabel="Summary">
      <Text style={styles.title}>{title}</Text>
      {lines.map((line, i) => (
        <View key={`${line[0].label}-${i}`} style={[styles.line, i < lines.length - 1 && styles.rowLine]}>
          {line.map((r) => (
            <View key={r.label} style={[styles.cell, line.length > 1 && styles.cellHalf]}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value} numberOfLines={r.lines}>{r.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1d4ed8', paddingBottom: 6 },
    line: { flexDirection: 'row', gap: 14, paddingVertical: 14 },
    rowLine: { borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8' },
    cell: { flex: 1, gap: 3 },
    cellHalf: { flexBasis: 0 },
    label: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    value: { fontSize: 14.5, lineHeight: 20, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
