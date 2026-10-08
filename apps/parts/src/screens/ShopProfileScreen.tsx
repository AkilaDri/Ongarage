import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GlassIcon, SERVICE_CATEGORIES, ThemeToggle, themedStyles, useTheme, softEdge, softShadow, softFill } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { COURIER } from '../constants/mockData';
import { ago } from '../utils/format';
import { Sheet } from '../components/Sheet';
import { ReviewsSheet } from '../components/ReviewsSheet';
import { CatalogueSheet } from '../components/CatalogueSheet';

/*
 * Ordered by how often a shop owner needs it on a working day (as in the garage app):
 *  - Today: delivery area and delivery options.
 *  - Reviews from garages (a few times a week), with replies.
 *  - Settings (rarely): what the shop sells, riders, how garages see it, theme.
 */

const RADIUS_PRESETS = [3, 5, 10, 15, 20];
type SheetId = 'reviews' | 'catalogue' | 'riders' | 'card' | null;

export const ShopProfileScreen: React.FC = () => {
  const { profile, rating, reviews, setRadius, setDelivery } = useShop();
  const { isDark, toggle } = useTheme();
  const [sheet, setSheet] = useState<SheetId>(null);
  const close = () => setSheet(null);
  const unanswered = reviews.filter((r) => !r.reply).length;
  const latest = reviews[0];
  const catNames = SERVICE_CATEGORIES.filter((c) => profile.categories.includes(c.id)).map((c) => c.name);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>අද</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>📡 බෙදාහරින ප්‍රදේශය</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setRadius(profile.deliveryRadiusKm - 1)} accessibilityLabel="Decrease radius">
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>කි.මී. {profile.deliveryRadiusKm}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setRadius(profile.deliveryRadiusKm + 1)} accessibilityLabel="Increase radius">
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.presets}>
          {RADIUS_PRESETS.map((km) => {
            const on = profile.deliveryRadiusKm === km;
            return (
              <Pressable key={km} style={[styles.preset, on && styles.presetOn]} onPress={() => setRadius(km)}>
                <Text style={[styles.presetText, on && { color: '#fff' }]}>{km}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sub}>ඔබට කොටස් ඉල්ලීම් ලැබෙන්නේ මෙම දුර ඇතුළත ගරාජවලින් පමණි.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛵 බෙදාහැරීමේ ක්‍රම</Text>
        <SwitchRow title={COURIER} sub="රියදුරෙකු වෙන් කරයි · ගාස්තුව ගරාජය ගෙවයි" on={profile.courierEnabled} onToggle={() => setDelivery({ courierEnabled: !profile.courierEnabled })} />
        <SwitchRow
          title="අපගේ රියදුරන්"
          sub={`${profile.staff.length} දෙනෙකු · ගාස්තුව ඔබට`}
          on={profile.ownDelivery}
          onToggle={() => setDelivery({ ownDelivery: !profile.ownDelivery })}
          divider
        />
        {!profile.courierEnabled && !profile.ownDelivery && <Text style={styles.warn}>⚠️ බෙදාහැරීමේ ක්‍රමයක් නැතිව මිල ගණන් යැවිය නොහැක.</Text>}
      </View>

      <Text style={styles.sectionLabel}>සමාලෝචන</Text>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => setSheet('reviews')}>
        <View style={styles.row}>
          <Text style={styles.ratingBig}>★ {rating.average}</Text>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>ගරාජවලින් සමාලෝචන {rating.count}</Text>
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
            “{latest.text}” — {latest.garage}, {ago(Date.now() - latest.at)}
          </Text>
        )}
      </Pressable>

      <Text style={styles.sectionLabel}>සැකසුම්</Text>
      <View style={styles.list}>
        <SettingRow icon="🧰" title="අලෙවි කරන කොටස්" value={`${profile.types.join(', ')} · ${catNames.slice(0, 3).join(', ')}${catNames.length > 3 ? '…' : ''}`} onPress={() => setSheet('catalogue')} />
        <SettingRow icon="🚚" title="රියදුරන්" value={profile.staff.map((s) => s.name).join(', ')} onPress={() => setSheet('riders')} divider />
        <SettingRow icon="🪪" title="ගරාජවලට පෙනෙන ආකාරය" value="මිල ගණන් කාඩ්පත සහ තොරතුරු" onPress={() => setSheet('card')} divider />
        <View style={[styles.settingRow, styles.divider]}>
          <GlassIcon emoji={isDark ? '🌙' : '☀️'} small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය'}</Text>
            <Text style={styles.sub}>යෙදුමේ තේමාව</Text>
          </View>
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </View>
      </View>
      <Text style={styles.version}>OnGarage Parts · v0.1.0</Text>

      <ReviewsSheet visible={sheet === 'reviews'} onClose={close} />
      <CatalogueSheet visible={sheet === 'catalogue'} onClose={close} />
      <Sheet visible={sheet === 'riders'} title="රියදුරන්" subtitle="ඔබගේම බෙදාහැරීම් සඳහා" onClose={close}>
        {profile.staff.map((s) => (
          <View key={s.id} style={[styles.card, styles.row]}>
            <GlassIcon emoji="🛵" small />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{s.name}</Text>
              <Text style={styles.sub}>{s.phone}</Text>
            </View>
          </View>
        ))}
      </Sheet>
      <Sheet visible={sheet === 'card'} title="ගරාජවලට පෙනෙන ආකාරය" subtitle="ඔබගේ සෑම මිල ගණනකම ඉහළින් මෙය පෙනේ" onClose={close}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{profile.name}</Text>
              <Text style={styles.sub}>
                ★ {rating.average} ({rating.count}) · කි.මී. 1.8
              </Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{profile.types[0]}</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Info icon="🕗" label="විවෘත වේලාවන්" value={profile.openHours} />
          <Info icon="📞" label="දුරකථනය" value={profile.phone} />
          <Info icon="📍" label="ලිපිනය" value={profile.address} />
          <Info icon="🧰" label="අලෙවි කරන්නේ" value={profile.types.join(', ')} />
        </View>
      </Sheet>
    </ScrollView>
  );
};

const SwitchRow: React.FC<{ title: string; sub: string; on: boolean; onToggle: () => void; divider?: boolean }> = ({ title, sub, on, onToggle, divider }) => (
  <Pressable style={[styles.switchRow, divider && styles.divider]} onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={title}>
    <View style={styles.flex1}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
    <View style={[styles.switch, on && styles.switchOn]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </View>
  </Pressable>
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

const Info: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.row}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.flex1}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    sectionLabel: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    pressed: { opacity: 0.75 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    stepText: { fontSize: 18, fontWeight: '700', color: Colors.textMain, lineHeight: 20 },
    stepValue: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.primary, minWidth: 54, textAlign: 'center' },
    presets: { flexDirection: 'row', gap: 6 },
    preset: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    presetOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    presetText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
    switch: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: Colors.subtleBorder, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.success },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    ratingBig: { fontSize: 22, fontWeight: '900', color: Colors.warning },
    badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    chevron: { fontSize: 20, color: Colors.textMuted },
    latest: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    list: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, overflow: 'hidden', ...softShadow() },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    divider: { borderTopWidth: 1, borderTopColor: Colors.borderColor, paddingTop: 12 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    typeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    infoIcon: { fontSize: 16, width: 22, textAlign: 'center' },
    infoValue: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    version: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', opacity: 0.6, marginTop: 4 },
  })
);
