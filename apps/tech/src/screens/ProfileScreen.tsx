import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GlassIcon, glassStyle, ThemeToggle, themedStyles, useTheme } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { ago } from '../utils/format';

// Who the technician is to garages and owners: skills, verification, ratings.
export const ProfileScreen: React.FC = () => {
  const { profile, rating, reviews, links, earnings } = useTech();
  const { isDark, toggle } = useTheme();

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, styles.center]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👨‍🔧</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.sub}>
          {profile.role} · {profile.phone}
        </Text>
        <View style={styles.badges}>
          {profile.nicVerified && (
            <View style={[styles.badge, styles.badgeOk]}>
              <Text style={[styles.badgeText, { color: Colors.successText }]}>✓ ජා.හැ.අ. තහවුරුයි</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile.techCode}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={`★ ${rating.average}`} label={`ශ්‍රේණි ${rating.count}`} color={Colors.warning} />
          <Stat value={String(links.reduce((s, l) => s + l.jobsDone, 0))} label="කළ රැකියා" color={Colors.success} />
          <Stat value={String(links.length)} label="ගරාජ" color={Colors.primary} />
        </View>
      </View>

      <Text style={styles.section}>කුසලතා</Text>
      <View style={styles.chips}>
        {profile.skills.map((s) => (
          <View key={s} style={styles.chip}>
            <Text style={styles.chipText}>{s}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>වාහන හිමියන්ගේ ශ්‍රේණිගත කිරීම්</Text>
      {reviews.slice(0, 4).map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{r.customer}</Text>
            <Text style={styles.stars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
          </View>
          <Text style={styles.review}>“{r.text}”</Text>
          <Text style={styles.sub}>
            {r.garage} · {ago(Date.now() - r.at)}
          </Text>
        </View>
      ))}
      <Text style={styles.hint}>හිමියන් ගරාජයට මෙන්ම ඔබටද ශ්‍රේණි ලබා දෙයි — නිදහස් කාර්මිකයෙකු ලෙස නව ගරාජ ඔබව තෝරා ගන්නේ මෙයින්. ({earnings.filter((e) => e.rating).length} රැකියාවකට ශ්‍රේණි ලැබී ඇත)</Text>

      <Text style={styles.section}>සැකසුම්</Text>
      <View style={[styles.card, styles.row]}>
        <GlassIcon emoji={isDark ? '🌙' : '☀️'} small />
        <View style={styles.flex1}>
          <Text style={styles.title}>{isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය'}</Text>
          <Text style={styles.sub}>යෙදුමේ තේමාව</Text>
        </View>
        <ThemeToggle isDark={isDark} onToggle={toggle} />
      </View>
      <Text style={styles.version}>OnGarage Technician · v0.1.0</Text>
    </ScrollView>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 8 },
    center: { alignItems: 'center', gap: 6 },
    avatar: { width: 76, height: 76, borderRadius: 38, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 36 },
    name: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    badges: { flexDirection: 'row', gap: 6 },
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill },
    badgeOk: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    badgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
    stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 6 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.subtleFill },
    statValue: { fontSize: 16, fontWeight: '900' },
    statLabel: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 1 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    stars: { fontSize: 13, color: Colors.warning, letterSpacing: 2 },
    review: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16, textAlign: 'center' },
    version: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', opacity: 0.6, marginTop: 4 },
  })
);
