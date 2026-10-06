import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LevelBadge, LEVELS, RATING_DIMENSIONS, themedStyles, type Garage } from '@ongarage/shared';
import { ago } from '../utils/format';
import { Sheet } from './Sheet';

/**
 * A garage as owners judge it: its level, the four rating dimensions, and reviews with
 * the garage's public replies. Every review comes from a job closed with an owner's code.
 */
export const GarageReviewsSheet: React.FC<{ garage: Garage | null; onClose: () => void }> = ({ garage, onClose }) => {
  const [shown, setShown] = useState(garage);
  useEffect(() => {
    if (garage) setShown(garage);
  }, [garage]);

  const g = garage ?? shown;
  if (!g) return null;
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;

  return (
    <Sheet visible={!!garage} title={g.name} subtitle={`★ ${g.rating.toFixed(1)} · සමාලෝචන ${g.reviews}`} onClose={onClose}>
      {level && (
        <View style={styles.box}>
          <LevelBadge level={level.id} />
          <Text style={styles.sub}>{level.note} · OnGarage මට්ටම් තීරණය වන්නේ අවසන් කළ රැකියා, ශ්‍රේණිය සහ ගැටලු අනුපාතය අනුවය.</Text>
          {level.id === 'premier' && <Text style={styles.protected}>🛡️ මෙම ගරාජයේ රැකියා OnGarage Guarantee මගින් ආරක්ෂිතයි (උපරිම රු. 50,000).</Text>}
        </View>
      )}

      {!!g.dimensions && (
        <View style={styles.box}>
          {RATING_DIMENSIONS.map((d) => {
            const v = g.dimensions![d.id];
            return (
              <View key={d.id} style={styles.dimRow}>
                <Text style={styles.dimLabel}>{d.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(v / 5) * 100}%` }]} />
                </View>
                <Text style={styles.dimValue}>{v.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {(g.recentReviews ?? []).map((r) => (
        <View key={r.id} style={styles.review}>
          <View style={styles.rowBetween}>
            <Text style={styles.customer}>{r.customer}</Text>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(r.rating))}
              <Text style={styles.starsOff}>{'★'.repeat(5 - Math.round(r.rating))}</Text>
            </Text>
          </View>
          <Text style={styles.text}>{r.text}</Text>
          <Text style={styles.sub}>{ago(Date.now() - r.at)} · ✓ කේතයෙන් අවසන් කළ රැකියාවක්</Text>
          {!!r.reply && (
            <View style={styles.reply}>
              <Text style={styles.replyLabel}>↳ {g.name} පිළිතුර</Text>
              <Text style={styles.text}>{r.reply.text}</Text>
            </View>
          )}
        </View>
      ))}
      {!g.recentReviews?.length && <Text style={styles.sub}>තවම සමාලෝචන නැත.</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dimLabel: { width: 118, fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.warning },
    dimValue: { width: 26, textAlign: 'right', fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    review: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 4 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    customer: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    stars: { fontSize: 13, color: Colors.warning },
    starsOff: { color: Colors.subtleBorder },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    reply: { marginTop: 4, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 2 },
    protected: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    replyLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
