import React, { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Colors, COMMISSION_CAP_PERCENT, FONTS, monthKey, shopStatement, statementText, statementTotals, themedStyles, softEdge, softFill, softShadow, type ReferralStatus } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { money } from '../utils/format';
import { Sheet } from './Sheet';

const MONTHS = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];
const monthName = (key: string) => `${key.slice(0, 4)} ${MONTHS[Number(key.slice(5)) - 1]}`;
const STATUS: Record<ReferralStatus, string> = {
  recommended: 'ගරාජය නිර්දේශ කළා',
  viewed: 'ගනුදෙනුකරු බැලුවා',
  reserved: 'වෙන් කළා',
  purchased: 'මිලදී ගත්තා',
  fitted: 'ගරාජය සවි කළා',
  returned: 'ආපසු දුන්නා',
  lapsed: 'වෙන් වී ගියා',
};

/**
 * Which garages sent customers to this shop and what they bought, month by month. A purchase counts once the
 * shop verified the buyer's code; commission is owed to the garage once the part was fitted and the job closed.
 * Paying out happens outside the app, so each garage's month can be marked paid and the statement shared.
 */
export const ReferralsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { profile, referrals, settled, settleReferrals } = useShop();
  const now = Date.now();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(new Date(now).getFullYear(), new Date(now).getMonth() - 1, 15).getTime());
  const [month, setMonth] = useState(thisMonth);

  const rows = useMemo(() => shopStatement(referrals, profile.id, month), [referrals, profile.id, month]);
  const totals = statementTotals(rows);
  const leads = referrals.filter((r) => r.shop.id === profile.id && monthKey(r.recommendedAt) === month).sort((a, b) => b.recommendedAt - a.recommendedAt);
  const nameOf = (id: string) => referrals.find((r) => r.garage.id === id)?.garage.name ?? id;
  const owed = rows.filter((r) => r.commission > 0 && !settled[`${month}:${r.garageId}`]).reduce((s, r) => s + r.commission, 0);

  const share = () => Share.share({ message: statementText(`${profile.name} · ගරාජ නිර්දේශ · ${monthName(month)}`, rows.map((row) => ({ name: nameOf(row.garageId), row }))) });

  return (
    <Sheet visible={visible} title="ගරාජ නිර්දේශ සහ ආදායම" subtitle="ගරාජයක් යවපු ගනුදෙනුකරුවන්ගෙන් ලැබූ විකුණුම්" onClose={onClose}>
      <View style={styles.months}>
        {[thisMonth, lastMonth].map((m) => (
          <Pressable key={m} style={[styles.month, month === m && styles.monthOn]} onPress={() => setMonth(m)} accessibilityLabel={`Month ${m}`}>
            <Text style={[styles.monthText, month === m && styles.monthTextOn]}>{monthName(m)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tiles}>
        <Tile value={money(totals.partsValue)} label="නිර්දේශිත විකුණුම්" color={Colors.success} />
        <Tile value={String(totals.purchases)} label={`මිලදී ගැනීම් (යොමු ${totals.referrals})`} color={Colors.primary} />
        <Tile value={money(owed)} label="ගෙවීමට ඉතිරි කොමිස්" color={Colors.warning} />
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>මෙම මාසයේ ගරාජ නිර්දේශ නැත.</Text>
      ) : (
        rows.map((r) => {
          const paid = !!settled[`${month}:${r.garageId}`];
          return (
            <View key={r.garageId} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>
                  {nameOf(r.garageId)}
                </Text>
                <Text style={styles.value}>{money(r.partsValue)}</Text>
              </View>
              <Text style={styles.sub}>
                යොමු {r.referrals} · මිලදී ගත් {r.purchases}
                {r.returned ? ` · ආපසු ${r.returned} (කොමිස් අහෝසි)` : ''} · කොමිස් {money(r.commission)}
              </Text>
              {r.commission > 0 && (
                <Pressable style={[styles.settle, paid && styles.settleOn]} onPress={() => settleReferrals(month, r.garageId)} accessibilityLabel={`Mark commission paid to ${nameOf(r.garageId)}`}>
                  <Text style={[styles.settleText, paid && { color: Colors.successText }]}>{paid ? '✓ කොමිස් ගෙවූවා' : 'ගෙවූ බව සටහන් කරන්න'}</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {leads.length > 0 && (
        <>
          <Text style={styles.section}>නිර්දේශ</Text>
          {leads.map((r) => (
            <View key={r.id} style={[styles.lead, r.status === 'lapsed' && styles.dim]}>
              <View style={styles.flex1}>
                <Text style={styles.leadTitle} numberOfLines={1}>
                  {r.partName} · {r.garage.name}
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
        </>
      )}

      {rows.length > 0 && (
        <Pressable style={styles.share} onPress={share} accessibilityLabel="Share statement">
          <Text style={styles.shareText}>📤 මාසික ප්‍රකාශය බෙදාගන්න</Text>
        </Pressable>
      )}
      <Text style={styles.note}>
        කොමිස් යනු ඔබ ගරාජයට ගෙවන ප්‍රතිශතයකි (ඔබේ සැකසුමේ, උපරිම {COMMISSION_CAP_PERCENT}%). එය ගනුදෙනුකරුගේ මිලට එක් නොවේ; කොටස සවි කර රැකියාව අයිතිකරුගේ කේතයෙන් අවසන් වූ පසු පමණක් ලැබිය යුතු වේ. කොටස ආපසු ආවොත් එය අහෝසි වේ. ගෙවීම් දැනට යෙදුමෙන් පිටතයි; ගැටලුවක් ඇත්නම් OnGarage වෙත වාර්තා කරන්න.
      </Text>
    </Sheet>
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
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    months: { flexDirection: 'row', gap: 8 },
    month: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill() },
    monthOn: { backgroundColor: Colors.primary },
    monthText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    monthTextOn: { color: '#ffffff' },
    tiles: { flexDirection: 'row', gap: 8 },
    tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    tileValue: { fontSize: 14, fontFamily: FONTS.titleBold },
    tileLabel: { fontSize: 9.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 6, ...softShadow() },
    title: { flex: 1, fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    value: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.success },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    settle: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: softFill() },
    settleOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    settleText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    section: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    lead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: softFill() },
    dim: { opacity: 0.55 },
    leadTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    pct: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.primary },
    share: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    shareText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    empty: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
    note: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
  })
);
