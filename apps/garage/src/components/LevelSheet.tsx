import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Colors,
  DIMENSION_TIPS,
  FEATURE_INFO,
  FONTS,
  LevelBadge,
  levelIndex,
  levelProgress,
  LEVELS,
  RATING_DIMENSIONS,
  themedStyles,
  weakestDimension,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { Sheet } from './Sheet';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The garage's trust score (how it's made up, what to improve) and the level ladder:
 * every level's requirements against today's numbers, and the features each unlocks —
 * locked ones stay visible so the garage knows what it's working towards.
 */
export const LevelSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { trust, levelStats, level, earnedLevel, graceDaysLeft } = useGarage();
  const weakest = weakestDimension(trust.dimensions);
  const current = levelIndex(level.id);

  return (
    <Sheet visible={visible} title="විශ්වාස ලකුණු සහ මට්ටම" subtitle="QR / කේතයෙන් අවසන් කළ රැකියා සහ අයිතිකරුවන්ගේ ශ්‍රේණි මත" onClose={onClose}>
      {graceDaysLeft !== undefined && (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>⚠️ {level.name} මට්ටම අවදානමේ — දින {graceDaysLeft}ක් ඉතිරියි</Text>
          <Text style={styles.sub}>
            දැනට ඔබගේ අගයන් ගැළපෙන්නේ “{earnedLevel.name}” මට්ටමටයි. මෙම කාලය තුළ අවශ්‍යතා නැවත සපුරා ගත්තොත් මට්ටම රැකේ; නැත්නම් එහි විශේෂාංග අහිමි වේ.
          </Text>
        </View>
      )}

      {/* Trust score */}
      <View style={styles.box}>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{trust.score.toFixed(1)}</Text>
          <View style={styles.flex1}>
            <Text style={styles.boxTitle}>විශ්වාස ලකුණු</Text>
            <Text style={styles.sub}>සමාලෝචන {trust.reviewCount} · ශ්‍රේණි හතරක බර තැබූ සාමාන්‍යය, ගැටලු සහ අතහැර දැමූ රැකියා අඩු කරයි</Text>
          </View>
        </View>
        {RATING_DIMENSIONS.map((d) => (
          <View key={d.id} style={styles.dimRow}>
            <Text style={[styles.dimLabel, d.id === weakest && { color: Colors.warning }]}>
              {d.label} <Text style={styles.weight}>×{d.weight}</Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(trust.dimensions[d.id] / 5) * 100}%` }, d.id === weakest && styles.fillWeak]} />
            </View>
            <Text style={styles.dimValue}>{trust.dimensions[d.id].toFixed(1)}</Text>
          </View>
        ))}
        <View style={styles.rates}>
          <Rate label="අවසන් කිරීම" value={pct(trust.completionRate)} ok={trust.completionRate >= 0.9} />
          <Rate label="නියමිත වේලාවට" value={pct(trust.onTimeRate)} ok={trust.onTimeRate >= 0.85} />
          <Rate label="ගැටලු" value={`${(trust.disputeRate * 100).toFixed(1)}%`} ok={trust.disputeRate <= 0.02} />
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>💡 වැඩිදියුණු කළ හැකි: {RATING_DIMENSIONS.find((d) => d.id === weakest)!.label}</Text>
          <Text style={styles.sub}>{DIMENSION_TIPS[weakest]}</Text>
        </View>
      </View>

      {/* Ladder */}
      <Text style={styles.section}>මට්ටම් පඩිපෙළ</Text>
      {LEVELS.map((l, i) => {
        const reached = i <= current;
        const isNext = i === current + 1;
        const items = levelProgress(l, levelStats);
        const met = items.filter((x) => x.met).length;
        return (
          <View key={l.id} style={[styles.level, i === current && styles.levelCurrent, !reached && !isNext && styles.levelFar]} accessibilityLabel={`Ladder ${l.id}`}>
            <View style={styles.rowBetween}>
              <LevelBadge level={l.id} />
              <Text style={[styles.state, { color: reached ? Colors.successText : isNext ? Colors.primary : Colors.textMuted }]}>
                {i === current ? '● ඔබ මෙහි' : reached ? '✓ සපුරා ඇත' : isNext ? `ඊළඟ · ${met}/${items.length}` : '🔒'}
              </Text>
            </View>
            {isNext && items.length > 0 && (
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${(met / items.length) * 100}%` }]} />
              </View>
            )}
            {!reached &&
              items.map((x) => (
                <View key={x.label} style={styles.req}>
                  <Text style={[styles.reqMark, { color: x.met ? Colors.successText : Colors.textMuted }]}>{x.met ? '✓' : '○'}</Text>
                  <Text style={styles.reqLabel}>{x.label}</Text>
                  <Text style={[styles.reqValue, !x.met && { color: Colors.warning }]}>
                    {x.have} / {x.need}
                  </Text>
                </View>
              ))}
            <View style={styles.features}>
              {l.unlocks.map((f) => (
                <View key={f} style={[styles.feature, !reached && styles.featureLocked]}>
                  <Text style={[styles.featureText, !reached && { color: Colors.textMuted }]}>
                    {reached ? FEATURE_INFO[f].icon : '🔒'} {FEATURE_INFO[f].label}
                  </Text>
                </View>
              ))}
            </View>
            {l.id === 'premier' && !reached && <Text style={styles.sub}>ප්‍රිමියර් ආරාධනාවෙන් පමණි — සාධාරණත්ව නිරීක්ෂණයෙන් පසු සහ දායකත්වය සමඟ.</Text>}
          </View>
        );
      })}
      <Text style={styles.sub}>මට්ටමකට අවශ්‍ය අගයන්ට වඩා පහළ ගියොත් දින 30ක සහන කාලයක් ලැබේ. ඉහළ මට්ටම් වෙනුවෙන් ගෙවිය නොහැක — ඒවා ලැබෙන්නේ හොඳ වැඩෙන් පමණි.</Text>
    </Sheet>
  );
};

const Rate: React.FC<{ label: string; value: string; ok: boolean }> = ({ label, value, ok }) => (
  <View style={styles.rate}>
    <Text style={[styles.rateValue, { color: ok ? Colors.successText : Colors.warning }]}>{value}</Text>
    <Text style={styles.rateLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    boxTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 4 },
    warnBox: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)', gap: 4 },
    warnTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    score: { fontSize: 34, fontFamily: FONTS.titleBold, color: Colors.success },
    dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dimLabel: { width: 130, fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    weight: { fontSize: 9.5, color: Colors.textMuted },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.success },
    fillWeak: { backgroundColor: Colors.warning },
    dimValue: { width: 26, textAlign: 'right', fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    rates: { flexDirection: 'row', gap: 8 },
    rate: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.subtleFill },
    rateValue: { fontSize: 14, fontFamily: FONTS.titleBold },
    rateLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    tip: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.08)', gap: 2 },
    tipTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    level: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    levelCurrent: { borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: 'rgba(16, 185, 129, 0.06)' },
    levelFar: { opacity: 0.75 },
    state: { fontSize: 11, fontFamily: FONTS.bodyBold },
    bar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
    req: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqMark: { width: 14, fontSize: 12, fontWeight: '800' },
    reqLabel: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    reqValue: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    features: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    feature: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    featureLocked: { backgroundColor: Colors.subtleFill },
    featureText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
  })
);
