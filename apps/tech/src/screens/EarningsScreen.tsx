import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, EmptyState, FONTS, GlassIcon, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { ago, isSameDay, money } from '../utils/format';

const DAY = 24 * 60 * 60 * 1000;

// What each job earned, and the running account with each garage: the pay it owes the
// technician against the cash the technician collected for it. Settled outside the app.
export const EarningsScreen: React.FC = () => {
  const { earnings, links, settleGarage } = useTech();
  const now = Date.now();
  const sum = (from: number) => earnings.filter((e) => now - e.at < from).reduce((s, e) => s + e.pay, 0);
  const today = earnings.filter((e) => isSameDay(e.at, now)).reduce((s, e) => s + e.pay, 0);

  const accounts = links
    .map((l) => {
      const open = earnings.filter((e) => e.garageId === l.garage.id && !e.settled);
      const owed = open.reduce((s, e) => s + e.pay, 0);
      const held = open.reduce((s, e) => s + e.collected, 0);
      return { link: l, jobs: open.length, owed, held, net: owed - held };
    })
    .filter((a) => a.jobs > 0);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <Stat value={money(today)} label="අද" color={Colors.success} />
        <Stat value={money(sum(7 * DAY))} label="දින 7" color={Colors.primary} />
        <Stat value={money(sum(30 * DAY))} label="දින 30" color={Colors.warning} />
      </View>

      <Text style={styles.section}>ගරාජ සමඟ ගිණුම</Text>
      {accounts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.sub}>✓ සියලු ගරාජ සමඟ ගිණුම් පියවා ඇත.</Text>
        </View>
      ) : (
        accounts.map((a) => (
          <View key={a.link.garage.id} style={styles.card}>
            <View style={styles.row}>
              <GlassIcon emoji="🛠️" small />
              <View style={styles.flex1}>
                <Text style={styles.title}>{a.link.garage.name}</Text>
                <Text style={styles.sub}>නොපියවූ රැකියා {a.jobs}</Text>
              </View>
            </View>
            <Line label="ගරාජය ඔබට ගෙවිය යුතු" value={money(a.owed)} />
            <Line label="ඔබ ළඟ ඇති ගරාජයේ මුදල් (අයිතිකරුවන්ගෙන්)" value={`− ${money(a.held)}`} />
            <View style={styles.divider} />
            <Line label={a.net >= 0 ? 'ගරාජය ඔබට ගෙවිය යුතු ශේෂය' : 'ඔබ ගරාජයට භාර දිය යුතු ශේෂය'} value={money(Math.abs(a.net))} strong warn={a.net < 0} />
            <ActionButton label="ගිණුම පියවූ බව සලකුණු කරන්න" icon="🤝" variant="ghost" compact onPress={() => settleGarage(a.link.garage.id)} />
          </View>
        ))
      )}

      <Text style={styles.section}>රැකියා ඉතිහාසය</Text>
      {earnings.length === 0 ? (
        <EmptyState icon="💵" title="තවම ආදායමක් නැත" text="අවසන් කළ රැකියා මෙහි පෙන්වනු ඇත." />
      ) : (
        earnings.map((e) => (
          <View key={e.id} style={[styles.card, styles.row, e.settled && styles.dim]}>
            <GlassIcon emoji={e.icon} small />
            <View style={styles.flex1}>
              <Text style={styles.title}>{e.title}</Text>
              <Text style={styles.sub}>
                {e.garageName} · {ago(now - e.at)}
                {e.collected ? ` · මුදල් ${money(e.collected)}` : ''}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.pay}>{money(e.pay)}</Text>
              <Text style={styles.sub}>{e.rating ? '★'.repeat(e.rating) : e.settled ? 'පියවා ඇත' : 'නොපියවූ'}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Line: React.FC<{ label: string; value: string; strong?: boolean; warn?: boolean }> = ({ label, value, strong, warn }) => (
  <View style={styles.line}>
    <Text style={[strong ? styles.lineStrong : styles.lineLabel, styles.flex1]}>{label}</Text>
    <Text style={[strong ? styles.lineStrong : styles.lineValue, strong && { color: warn ? Colors.warning : Colors.success }]}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    section: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 8, ...softShadow() },
    dim: { opacity: 0.6 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    right: { alignItems: 'flex-end' },
    pay: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.success },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lineLabel: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    lineValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    lineStrong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
