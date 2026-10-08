import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Colors, COMMISSION_CAP_PERCENT, FONTS, garageStatement, monthKey, statementText, statementTotals, themedStyles, softEdge, softFill, softShadow, type ReferralStatus } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { useParts } from '../context/PartsContext';
import { money } from '../utils/format';

const MONTHS = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];
const monthName = (key: string) => `${key.slice(0, 4)} ${MONTHS[Number(key.slice(5)) - 1]}`;
const STATUS: Record<ReferralStatus, string> = {
  recommended: 'නිර්දේශ කළා',
  viewed: 'පාරිභෝගිකයා බැලුවා',
  reserved: 'වෙන් කළා',
  purchased: 'මිලදී ගත්තා',
  fitted: 'සවි කළා',
  returned: 'ආපසු දුන්නා',
  lapsed: 'වෙන් වී ගියා',
};

/**
 * The customers this garage sent to parts shops, month by month: how many bought, the parts value, and the
 * commission the shops owe (earned once the part was fitted and the job closed with the owner's code; a part
 * brought back cancels it). Payments happen outside the app, so a shop's month can be marked received and shared.
 */
export const GarageReferralsView: React.FC = () => {
  const { profile } = useGarage();
  const { referrals, settled, settleReferrals } = useParts();
  const now = Date.now();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(new Date(now).getFullYear(), new Date(now).getMonth() - 1, 15).getTime());
  const [month, setMonth] = useState(thisMonth);

  const rows = useMemo(() => garageStatement(referrals, profile.id, month), [referrals, profile.id, month]);
  const totals = statementTotals(rows);
  const leads = referrals.filter((r) => r.garage.id === profile.id && monthKey(r.recommendedAt) === month).sort((a, b) => b.recommendedAt - a.recommendedAt);
  const nameOf = (id: string) => referrals.find((r) => r.shop.id === id)?.shop.name ?? id;
  const owed = rows.filter((r) => r.commission > 0 && !settled[`${month}:${r.shopId}`]).reduce((s, r) => s + r.commission, 0);

  const share = () => Share.share({ message: statementText(`${profile.name} · OnMart නිර්දේශ · ${monthName(month)}`, rows.map((row) => ({ name: nameOf(row.shopId), row }))) });

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.months}>
        {[thisMonth, lastMonth].map((m) => (
          <Pressable key={m} style={[styles.month, month === m && styles.monthOn]} onPress={() => setMonth(m)} accessibilityLabel={`Month ${m}`}>
            <Text style={[styles.monthText, month === m && styles.monthTextOn]}>{monthName(m)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tiles}>
        <Tile value={String(totals.referrals)} label="නිර්දේශ කළ" color={Colors.primary} />
        <Tile value={String(totals.purchases)} label="මිලදී ගත්" color={Colors.success} />
        <Tile value={money(totals.partsValue)} label="කොටස් වටිනාකම" color={Colors.warning} />
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>🤝 ඔබට ලැබිය යුතු කොමිස්</Text>
          <Text style={styles.value}>{money(owed)}</Text>
        </View>
        <Text style={styles.sub}>
          මෙම මාසයේ මුළු කොමිස් {money(totals.commission)}{totals.commission > owed ? ` · ලැබුණු ${money(totals.commission - owed)}` : ''}. කොටස සවි කර රැකියාව අයිතිකරුගේ කේතයෙන් අවසන් වූ පසු පමණක් ලැබිය යුතු වේ; කොටස ආපසු ආවොත් අහෝසි වේ. වෙළඳසැල ගෙවන්නේ තමන්ගේ ආදායමෙන් (උපරිම {COMMISSION_CAP_PERCENT}%) — ගනුදෙනුකරුගේ මිලට එක් නොවේ. ගනුදෙනුකරුට ඔබට කොමිස් ලැබිය හැකි බව පෙන්වයි. ගෙවීම් දැනට යෙදුමෙන් පිටතයි.
        </Text>
      </View>

      <Text style={styles.section}>වෙළඳසැල් අනුව</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>මෙම මාසයේ නිර්දේශ නැත.</Text>
      ) : (
        rows.map((r) => {
          const got = !!settled[`${month}:${r.shopId}`];
          return (
            <View key={r.shopId} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>
                  {nameOf(r.shopId)}
                </Text>
                <Text style={styles.value}>{money(r.partsValue)}</Text>
              </View>
              <Text style={styles.sub}>
                යොමු {r.referrals} · මිලදී ගත් {r.purchases}
                {r.returned ? ` · ආපසු ${r.returned} (කොමිස් අහෝසි)` : ''} · කොමිස් {money(r.commission)}
              </Text>
              {r.commission > 0 && (
                <Pressable style={[styles.settle, got && styles.settleOn]} onPress={() => settleReferrals(month, r.shopId)} accessibilityLabel={`Mark commission received from ${nameOf(r.shopId)}`}>
                  <Text style={[styles.settleText, got && { color: Colors.successText }]}>{got ? '✓ කොමිස් ලැබුණා' : 'ලැබුණු බව සටහන් කරන්න'}</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      <Text style={styles.section}>නිර්දේශ</Text>
      {leads.map((r) => (
        <View key={r.id} style={[styles.lead, r.status === 'lapsed' && styles.dim]}>
          <View style={styles.flex1}>
            <Text style={styles.leadTitle} numberOfLines={1}>
              {r.partName} · {r.shop.name}
            </Text>
            <Text style={styles.sub}>
              {STATUS[r.status]}
              {r.amount ? ` · ${money(r.amount)}` : ''}
              {r.commission ? ` · කොමිස් ${money(r.commission)}` : ''}
            </Text>
          </View>
          <Text style={styles.pct}>{r.commissionPercent}%</Text>
        </View>
      ))}

      {rows.length > 0 && (
        <Pressable style={styles.share} onPress={share} accessibilityLabel="Share statement">
          <Text style={styles.shareText}>📤 මාසික ප්‍රකාශය බෙදාගන්න</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const Tile: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.tile}>
    <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    body: { padding: 16, gap: 12, paddingBottom: 110 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    months: { flexDirection: 'row', gap: 8 },
    month: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill() },
    monthOn: { backgroundColor: Colors.primary },
    monthText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    monthTextOn: { color: '#ffffff' },
    tiles: { flexDirection: 'row', gap: 8 },
    tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    tileValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    tileLabel: { fontSize: 9.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 6, ...softShadow() },
    title: { flex: 1, fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    value: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    settle: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: softFill() },
    settleOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    settleText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    section: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    empty: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
    lead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: softFill() },
    dim: { opacity: 0.55 },
    leadTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    pct: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.primary },
    share: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    shareText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
