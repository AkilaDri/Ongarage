import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GlassIcon, glassStyle, SERVICE_CATEGORIES, ThemeToggle, themedStyles, useTheme } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { VANS } from '../constants/mockData';
import { ago } from '../utils/format';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { ServicesSheet } from '../components/ServicesSheet';
import { ReviewsSheet } from '../components/ReviewsSheet';
import { TeamManageSheet } from '../components/TeamManageSheet';
import { PublicProfileSheet } from '../components/PublicProfileSheet';

/*
 * Ordered by how often a garage owner needs it on a working day:
 *  - Today (many times a day): who is free right now, SOS radius.
 *  - Reviews (a few times a week): summary, opens the full list with replies.
 *  - Settings (rarely): services, staff register, public profile, theme. Each opens
 *    a sheet, so nothing here can be changed by a stray tap while scrolling.
 */

const RADIUS_PRESETS = [3, 5, 8, 10, 15];
const RADIUS_MIN = 1;
const RADIUS_MAX = 15;

type SheetId = 'attendance' | 'services' | 'reviews' | 'team' | 'profile' | null;

export const GarageProfileScreen: React.FC = () => {
  const { profile, rating, reviews, team, crew, setCoverage, setOnBreak } = useGarage();
  const { isDark, toggle } = useTheme();
  const [sheet, setSheet] = useState<SheetId>(null);
  const close = () => setSheet(null);

  const present = team.filter((m) => crew.presentIds.includes(m.id));
  const absent = team.filter((m) => !crew.presentIds.includes(m.id));
  const unanswered = reviews.filter((r) => !r.reply).length;
  const latest = reviews[0];
  const serviceNames = SERVICE_CATEGORIES.filter((c) => profile.services.includes(c.id)).map((c) => c.name);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {/* ---------- Today ---------- */}
      <Text style={styles.sectionLabel}>අද</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>👨‍🔧 දැන් කණ්ඩායම</Text>
          {crew.confirmed && (
            <Pressable onPress={() => setSheet('attendance')} hitSlop={6}>
              <Text style={styles.link}>පැමිණීම ›</Text>
            </Pressable>
          )}
        </View>

        {!crew.confirmed ? (
          <>
            <Text style={styles.warnText}>⚠️ අද පැමිණීම තහවුරු කර නැත — තහවුරු කරන තුරු SOS භාර ගත නොහැක.</Text>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={() => setSheet('attendance')}>
              <Text style={styles.primaryBtnText}>📋 අද පැමිණීම තහවුරු කරන්න</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.counts}>
              <Count value={crew.free} label="නිදහස්" color={Colors.success} />
              <Count value={crew.breakIds.length} label="විවේකයේ" color={Colors.warning} />
              <Count value={crew.committedJobs} label="SOS රැකියාවල" color={Colors.primary} />
              <Count value={absent.length} label="නිවාඩු" color={Colors.textMuted} />
            </View>

            {present.map((m) => {
              const onJob = crew.onJobIds.includes(m.id);
              const onBreak = crew.breakIds.includes(m.id);
              return (
                <View key={m.id} style={styles.member}>
                  <View style={[styles.avatar, onBreak && styles.avatarBreak, onJob && styles.avatarJob]}>
                    <Text style={styles.avatarEmoji}>{onJob ? '🚐' : onBreak ? '☕' : '👨‍🔧'}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {m.role}
                    </Text>
                  </View>
                  {onJob ? (
                    <View style={[styles.pill, styles.pillJob]}>
                      <Text style={[styles.pillText, { color: Colors.primary }]}>SOS රැකියාවක</Text>
                    </View>
                  ) : (
                    // One clear two-way switch: ready for a job, or away for a while.
                    <View style={styles.segment}>
                      <Pressable
                        style={[styles.segBtn, !onBreak && styles.segReady]}
                        onPress={() => onBreak && setOnBreak(m.id, false)}
                        accessibilityLabel={`${m.name} ready`}
                      >
                        <Text style={[styles.segText, !onBreak && { color: '#fff' }]}>සූදානම්</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.segBtn, onBreak && styles.segBreak]}
                        onPress={() => !onBreak && setOnBreak(m.id, true)}
                        accessibilityLabel={`${m.name} on break`}
                      >
                        <Text style={[styles.segText, onBreak && { color: '#fff' }]}>☕ විවේක</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            {present.length === 0 && <Text style={styles.sub}>අද කිසිවෙකු පැමිණ නැත.</Text>}
            {absent.length > 0 && (
              <Pressable style={styles.absentRow} onPress={() => setSheet('attendance')}>
                <Text style={styles.sub} numberOfLines={1}>
                  🏖️ නිවාඩු: {absent.map((m) => m.name).join(', ')}
                </Text>
                <Text style={styles.link}>වෙනස් කරන්න</Text>
              </Pressable>
            )}
            <Text style={styles.hint}>විවේකයේ සිටින අයව SOS රැකියාවකට පැවරිය නොහැකි අතර ඔබගේ SOS ධාරිතාවද ඒ අනුව අඩු වේ.</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>📡 SOS සේවා කලාපය</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, profile.coverageKm <= RADIUS_MIN && styles.stepOff]}
              disabled={profile.coverageKm <= RADIUS_MIN}
              onPress={() => setCoverage(profile.coverageKm - 1)}
              accessibilityLabel="Decrease radius"
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>කි.මී. {profile.coverageKm}</Text>
            <Pressable
              style={[styles.stepBtn, profile.coverageKm >= RADIUS_MAX && styles.stepOff]}
              disabled={profile.coverageKm >= RADIUS_MAX}
              onPress={() => setCoverage(profile.coverageKm + 1)}
              accessibilityLabel="Increase radius"
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.presets}>
          {RADIUS_PRESETS.map((km) => {
            const active = profile.coverageKm === km;
            return (
              <Pressable key={km} style={[styles.preset, active && styles.presetActive]} onPress={() => setCoverage(km)}>
                <Text style={[styles.presetText, active && { color: '#fff' }]}>{km}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sub}>ඔබට SOS ඉල්ලීම් ලැබෙන්නේ ගරාජයේ සිට මෙම දුර ඇතුළතින් පමණි. කාර්යබහුල වේලාවට අඩු කරන්න.</Text>
      </View>

      {/* ---------- Reviews ---------- */}
      <Text style={styles.sectionLabel}>සමාලෝචන</Text>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => setSheet('reviews')}>
        <View style={styles.row}>
          <Text style={styles.ratingBig}>★ {rating.average}</Text>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>සමාලෝචන {rating.count}</Text>
            <Text style={styles.sub}>{unanswered ? `පිළිතුරු නොදුන් ${unanswered}` : 'සියල්ලට පිළිතුරු දී ඇත ✓'}</Text>
          </View>
          {unanswered > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unanswered}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
        {!!latest && (
          <Text style={styles.latest} numberOfLines={2}>
            “{latest.text}” — {latest.customer}, {ago(Date.now() - latest.at)}
          </Text>
        )}
      </Pressable>

      {/* ---------- Settings ---------- */}
      <Text style={styles.sectionLabel}>සැකසුම්</Text>
      <View style={styles.list}>
        <SettingRow icon="🧰" title="ලබා දෙන සේවා" value={`${serviceNames.length}/${SERVICE_CATEGORIES.length} · ${serviceNames.slice(0, 3).join(', ')}${serviceNames.length > 3 ? '…' : ''}`} onPress={() => setSheet('services')} />
        <SettingRow icon="👥" title="කණ්ඩායම සහ වාහන" value={`සේවකයන් ${team.length} · වාහන ${VANS.length} · එක් කරන්න / ඉවත් කරන්න`} onPress={() => setSheet('team')} divider />
        <SettingRow icon="🪪" title="පාරිභෝගිකයන්ට පෙනෙන ආකාරය" value="ගරාජ කාඩ්පත සහ තොරතුරු" onPress={() => setSheet('profile')} divider />
        <View style={[styles.settingRow, styles.divider]}>
          <GlassIcon emoji={isDark ? '🌙' : '☀️'} small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය'}</Text>
            <Text style={styles.sub}>යෙදුමේ තේමාව</Text>
          </View>
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </View>
      </View>

      <Text style={styles.version}>OnGarage Garage · v0.1.0</Text>

      <AttendanceSheet visible={sheet === 'attendance'} onClose={close} />
      <ServicesSheet visible={sheet === 'services'} onClose={close} />
      <ReviewsSheet visible={sheet === 'reviews'} onClose={close} />
      <TeamManageSheet visible={sheet === 'team'} onClose={close} />
      <PublicProfileSheet visible={sheet === 'profile'} onClose={close} />
    </ScrollView>
  );
};

const Count: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.count}>
    <Text style={[styles.countValue, { color }]}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

const SettingRow: React.FC<{ icon: string; title: string; value: string; onPress: () => void; divider?: boolean }> = ({ icon, title, value, onPress, divider }) => (
  <Pressable style={({ pressed }) => [styles.settingRow, divider && styles.divider, pressed && styles.pressed]} onPress={onPress}>
    <GlassIcon emoji={icon} small />
    <View style={styles.flex1}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {value}
      </Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5, marginTop: 4 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    link: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    pressed: { opacity: 0.75 },
    warnText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    primaryBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary },
    primaryBtnText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#fff' },
    counts: { flexDirection: 'row', gap: 6 },
    count: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, ...glassStyle() },
    countValue: { fontSize: 18, fontWeight: '900' },
    countLabel: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 1 },
    member: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    avatarBreak: { borderColor: 'rgba(245, 158, 11, 0.6)' },
    avatarJob: { borderColor: 'rgba(56, 189, 248, 0.6)' },
    avatarEmoji: { fontSize: 18 },
    memberName: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    pillJob: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.4)' },
    pillText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    segment: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor },
    segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
    segReady: { backgroundColor: Colors.success },
    segBreak: { backgroundColor: Colors.warning },
    segText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    absentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderColor },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    stepOff: { opacity: 0.35 },
    stepText: { fontSize: 18, fontWeight: '700', color: Colors.textMain, lineHeight: 20 },
    stepValue: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.primary, minWidth: 54, textAlign: 'center' },
    presets: { flexDirection: 'row', gap: 6 },
    preset: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.subtleFill },
    presetActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    presetText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    ratingBig: { fontSize: 22, fontWeight: '900', color: Colors.warning },
    badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    chevron: { fontSize: 20, color: Colors.textMuted },
    latest: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    list: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    divider: { borderTopWidth: 1, borderTopColor: Colors.borderColor },
    version: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', opacity: 0.6, marginTop: 4 },
  })
);
