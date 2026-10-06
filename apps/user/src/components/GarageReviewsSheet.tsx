import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, LevelBadge, LEVELS, RATING_DIMENSIONS, themedStyles, type Bid, type Garage } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { ago, money } from '../utils/format';
import { Sheet } from './Sheet';

/** The garage behind a bid: its full profile when known, else what the bid carries. */
export const garageForBid = (b: Bid): Garage =>
  MOCK_GARAGES.find((g) => g.name === b.garageName) ?? {
    id: b.id,
    name: b.garageName,
    specialization: '',
    rating: b.rating,
    reviews: b.reviews,
    distance: b.distanceKm,
    status: 'open',
    phone: '',
    address: '',
    coords: b.coords,
    level: b.level,
  };

/**
 * A garage as owners judge it: its level, the four rating dimensions, and reviews with
 * the garage's public replies. Every review comes from a job closed with an owner's code.
 */
export const GarageReviewsSheet: React.FC<{
  garage: Garage | null;
  onClose: () => void;
  /** Opened from a bid: its offer on top, and accepting it. */
  bid?: Bid;
  onAccept?: () => void;
  /** Opened from Home: call or book this garage. */
  onCall?: () => void;
  onBook?: () => void;
}> = ({ garage, onClose, bid, onAccept, onCall, onBook }) => {
  const [shown, setShown] = useState(garage);
  useEffect(() => {
    if (garage) setShown(garage);
  }, [garage]);

  const g = garage ?? shown;
  if (!g) return null;
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;

  return (
    <Sheet
      visible={!!garage}
      title={g.name}
      subtitle={`★ ${g.rating.toFixed(1)} · සමාලෝචන ${g.reviews}`}
      onClose={onClose}
      footer={
        bid && onAccept ? (
          <ActionButton label={`ලංසුව පිළිගන්න · ${money(bid.price)}`} icon="✓" variant="success" onPress={onAccept} />
        ) : onBook ? (
          <View style={styles.actions}>
            {!!onCall && (
              <View style={styles.flex1}>
                <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={onCall} />
              </View>
            )}
            <View style={styles.flex2}>
              <ActionButton label="වෙන් කරන්න" icon="📅" variant="primary" compact onPress={onBook} />
            </View>
          </View>
        ) : undefined
      }
    >
      {bid && (
        <View style={[styles.box, styles.bidBox]} accessibilityLabel="Bid summary">
          <View style={styles.rowBetween}>
            <Text style={styles.customer}>ඔබගේ රැකියාවට ලංසුව</Text>
            <Text style={styles.bidPrice}>{money(bid.price)}</Text>
          </View>
          <Text style={styles.text}>
            🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours} · 📍 කි.මී. {bid.distanceKm}
          </Text>
        </View>
      )}
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
    actions: { flexDirection: 'row', gap: 8 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    bidBox: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    bidPrice: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.success },
    replyLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
