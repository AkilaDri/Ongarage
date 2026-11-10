import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, directionsUrl, FONTS, Gradient, themedStyles, type TowOperator, type TowQuote } from '@ongarage/shared';
import { RatingSummary, ReviewCard, Stars } from '../../components/ReviewCard';
import { useUserLocation } from '../../context/LocationContext';
import { money } from '../../utils/format';
import { towReviewsOf } from '../../constants/towOperators';

/** The towing blue band, the same as the rest of the flow. */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

type Tab = 'overview' | 'info' | 'reviews';

/**
 * A tow operator's profile, laid out like a garage's: a cover with its status and close button, the name, rating, trucks and distance,
 * round action buttons (way there, call), then three tabs. Only facts the app holds: nothing is invented, and reviews come from the operator's own list.
 * When the operator has quoted this job, the profile can choose its truck.
 */
export const TowOperatorSheet: React.FC<{
  op: TowOperator | null;
  /** Distance from the vehicle, in km. */
  km: number;
  /** The truck's status for this job, as the list shows it. */
  status: string;
  /** The operator's quote for this job, when it has given one. */
  quote?: TowQuote | null;
  onClose: () => void;
  /** Given only when the operator has quoted: the profile's button chooses it. */
  onChoose?: () => void;
  /** Where the panel starts: the top of the white sheet, just under the map. */
  top: number;
}> = ({ op, km, status, quote, onClose, onChoose, top }) => {
  const user = useUserLocation();
  const [tab, setTab] = useState<Tab>('overview');
  const [shown, setShown] = useState(op);
  // Keeps the last operator on screen while the sheet slides away.
  if (op && op !== shown) setShown(op);
  const o = op ?? shown;
  const reviews = o ? towReviewsOf(o.id, o.name) : [];

  const hero = o && (
          <View style={styles.hero}>
            <Gradient stops={TOW_BAND} />
            <Text style={styles.heroEmoji}>🛻</Text>
            <View style={styles.heroChips}>
              <View style={[styles.heroChip, o.available ? styles.chipOn : styles.chipOff]}>
                <Text style={styles.heroChipText}>{o.available ? '● දැන් ලබාගත හැකියි' : '● දැන් කාර්යබහුලයි'}</Text>
              </View>
            </View>
            <Pressable style={styles.heroClose} onPress={onClose} accessibilityLabel="Close the profile">
              <Text style={styles.heroCloseText}>✕</Text>
            </Pressable>
          </View>
        );
  const footer = onChoose && quote ? (
    <View style={styles.footer}>
      <ActionButton label={`මෙම ට්‍රක් තෝරන්න · ${money(quote.total)}`} variant="primary" onPress={onChoose} />
    </View>
  ) : undefined;

  return (
    // A panel in the white sheet's place, below the map: the map stays visible above it.
    <View style={[styles.panel, { top }]}>
      {hero}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {o && (
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{o.name}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Stars rating={o.rating} size={14} />
            <Text style={styles.ratingText}>{`${o.rating.toFixed(1)} · සමාලෝචන ${o.reviews}`}</Text>
          </View>
          <Text style={styles.sub}>{`${km.toFixed(1)} km · ${status}`}</Text>

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => Linking.openURL(directionsUrl(o.coords, user.coords))} accessibilityLabel="Directions">
              <View style={styles.actionDisc}><Text style={styles.actionIcon}>🧭</Text></View>
              <Text style={styles.actionLabel}>දිශාවන්</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${o.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call">
              <View style={styles.actionDisc}><Text style={styles.actionIcon}>📞</Text></View>
              <Text style={styles.actionLabel}>අමතන්න</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(
              [
                { id: 'overview', label: 'දළ විස්තරය' },
                { id: 'info', label: 'ගාස්තු' },
                { id: 'reviews', label: 'සමාලෝචන' },
              ] as { id: Tab; label: string }[]
            ).map((t) => {
              const on = tab === t.id;
              return (
                <Pressable key={t.id} style={[styles.tabBtn, on && styles.tabBtnOn]} onPress={() => setTab(t.id)} accessibilityLabel={`Profile ${t.id}`}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'overview' && (
            <View style={styles.block}>
              <Text style={styles.label}>ට්‍රක් වර්ග</Text>
              {o.trucks.map((t) => (
                <Text key={t} style={styles.line}>{`• ${t}`}</Text>
              ))}
              <Text style={styles.label}>දුරකථන</Text>
              <Text style={styles.line}>{o.phone}</Text>
              {quote && (
                <>
                  <Text style={styles.label}>ඔබේ ගමනට මිල</Text>
                  <Text style={styles.price}>{money(quote.total)}</Text>
                </>
              )}
            </View>
          )}

          {tab === 'info' && (
            <View style={styles.block}>
              <Text style={styles.line}>{`ආරම්භක ගාස්තුව ${money(o.baseFee)}`}</Text>
              <Text style={styles.line}>{`කි.මී. ගාස්තුව ${money(o.perKm)}`}</Text>
              <Text style={styles.line}>{`ට්‍රක් ගෙන යාමේ ගාස්තුව ${money(o.recoveryFee)} (ගල්ගැසුණු / අනතුරු වාහනයට)`}</Text>
              {quote && quote.siteFee > 0 && <Text style={styles.line}>{`ස්ථාන වැඩ ගාස්තුව ${money(quote.siteFee)} (මඩ / ගල්වලින් ඇදීම)`}</Text>}
              <Text style={styles.note}>රාත්‍රියේ අමතර ගාස්තුවක් අයවිය හැක. මිල ඔබේ ගමනට ලැබුණු ඉල්ලීම අනුව පෙන්වයි.</Text>
            </View>
          )}

          {tab === 'reviews' && (
            <View style={styles.block}>
              <RatingSummary avg={o.rating} count={o.reviews} ratings={reviews.map((r) => r.rating)} />
              {reviews.length === 0 ? (
                <Text style={styles.note}>තවම සමාලෝචන නැත.</Text>
              ) : (
                reviews.map((r) => <ReviewCard key={r.id} review={r} />)
              )}
            </View>
          )}
        </View>
      )}
      </ScrollView>
      {footer}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    hero: { height: 150, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    heroEmoji: { fontSize: 64 },
    heroChips: { position: 'absolute', left: 14, top: 14, flexDirection: 'row', gap: 8 },
    heroChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    chipOn: { backgroundColor: 'rgba(22, 163, 74, 0.9)' },
    chipOff: { backgroundColor: 'rgba(15, 23, 42, 0.7)' },
    heroChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    heroClose: { position: 'absolute', right: 14, top: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
    heroCloseText: { fontSize: 16, color: '#0f172a' },
    body: { gap: 10, paddingBottom: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 19, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 26 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ratingText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    sub: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19 },
    actions: { flexDirection: 'row', gap: 18, paddingVertical: 8 },
    action: { alignItems: 'center', gap: 6, minWidth: 64 },
    actionDisc: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    actionIcon: { fontSize: 20 },
    actionLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    tabs: { flexDirection: 'row', marginTop: 4 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnOn: { borderBottomColor: '#1d367f' },
    tabText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    block: { gap: 8, paddingTop: 6 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 6 },
    line: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
    price: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    note: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19, marginTop: 4 },
    footer: { paddingHorizontal: 16, paddingVertical: 12 },
  })
);
