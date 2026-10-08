import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, dayStart, FONTS, GUARANTEE, GUARANTEE_MULTIPLE, INTAKE, PLANS, RISING_HEAD_START_MIN, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { formatDate, money } from '../utils/format';
import { Sheet } from './Sheet';

const DAY = 24 * 60 * 60 * 1000;
const DAY_LABEL = ['අද', 'හෙට', 'අනිද්දා'];

/**
 * Fair share and the subscription, explained to the garage: why it's limited (if it is),
 * how much new work each day still has room for, and what a plan gives — with the value
 * guarantee that refunds the fee when the app didn't bring enough work.
 */
export const FairShareSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { fairnessReasons, limitFrom, intakeOn, subscription, recommendedPlan, subscribe, cancelSubscription, monthWon, valueCheck, team } = useGarage();
  const limited = limitFrom !== undefined && Date.now() >= limitFrom;
  const today = dayStart(Date.now());

  return (
    <Sheet visible={visible} title="සාධාරණ බෙදාහැරීම සහ දායකත්වය" subtitle="කිහිප දෙනෙකුට සියලු රැකියා නොයන ලෙස — ප්‍රමාණයට දඬුවම් නොකර" onClose={onClose}>
      {/* Why */}
      <View style={[styles.box, limited && styles.boxWarn]}>
        <Text style={styles.boxTitle}>{fairnessReasons.length ? (limited ? '⚖️ ඔබගේ දෛනික නව වැඩ සීමා කර ඇත' : '⚖️ දැනුම්දීම: සීමාව ළඟදීම') : '✓ ඔබ සීමා කර නැත'}</Text>
        {fairnessReasons.map((r) => (
          <Text key={r} style={styles.text}>
            • {r}
          </Text>
        ))}
        {!!limitFrom && <Text style={styles.sub}>{limited ? `${formatDate(limitFrom)} සිට ක්‍රියාත්මකයි` : `${formatDate(limitFrom)} සිට ක්‍රියාත්මක වේ`} · OnGarage කණ්ඩායම මාස 3ක දත්ත පරීක්ෂා කර අනුමත කළා.</Text>}
      </View>

      {/* Room per day */}
      <Text style={styles.section}>නව වැඩ සඳහා ඉඩ (වටිනාකම අනුව)</Text>
      {[0, 1, 2].map((i) => {
        const s = intakeOn(today + i * DAY);
        const share = s.limit === Infinity ? 0 : Math.min(1, s.used / s.limit);
        return (
          <View key={i} style={styles.dayRow} accessibilityLabel={`Intake day ${i}`}>
            <Text style={styles.dayLabel}>{DAY_LABEL[i]}</Text>
            {s.limit === Infinity ? (
              <Text style={[styles.text, styles.flex1]}>සීමාවක් නැත · {money(s.used)}</Text>
            ) : (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${share * 100}%` }, s.reached && styles.fillFull]} />
                </View>
                <Text style={[styles.dayValue, s.remaining < INTAKE.lowValueThreshold && { color: Colors.warning }]}>
                  {money(s.used)} / {money(s.limit)}
                </Text>
              </>
            )}
          </View>
        );
      })}
      <Text style={styles.sub}>
        දිනකට රු. {INTAKE.baseDailyValue.toLocaleString()} + සේවකයන් 3ට වැඩි සෑම කෙනෙකුටම රු. {INTAKE.perExtraMechanic.toLocaleString()} (ඔබේ කණ්ඩායම {team.length}) · රු.{' '}
        {INTAKE.lowValueThreshold.toLocaleString()}ට අඩු රැකියා ගණන් නොගනී · SOS කිසිවිටෙක සීමා නොවේ · ඉඩ නැති දිනයකට එන ඍජු වෙන්කිරීම් ප්‍රතික්ෂේප නොකර ඊළඟ නිදහස් දිනයට යෝජනා වේ.
      </Text>
      <Text style={styles.sub}>🌱 මාස 6ට අඩු, හොඳ ලකුණු ඇති නව ගරාජවලට නව රැකියා පළ කිරීම් මිනි. {RISING_HEAD_START_MIN}කට පෙර පෙනේ.</Text>

      {/* Subscription */}
      <Text style={styles.section}>දායකත්වය</Text>
      {subscription ? (
        <View style={[styles.box, styles.boxOk]}>
          <View style={styles.rowBetween}>
            <Text style={styles.boxTitle}>⭐ {subscription.plan.name} · මසකට {money(subscription.plan.fee)}</Text>
            <Pressable onPress={cancelSubscription} hitSlop={6} accessibilityLabel="Cancel subscription">
              <Text style={styles.cancel}>අවලංගු කරන්න</Text>
            </Pressable>
          </View>
          {valueCheck && (
            <>
              <Text style={styles.text}>
                වටිනාකම් සහතිකය: මේ මාසයේ දිනූ වැඩ {money(monthWon)} / ඉලක්කය {money(valueCheck.target)} (ගාස්තුව ×{GUARANTEE_MULTIPLE})
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(1, monthWon / valueCheck.target) * 100}%` }]} />
              </View>
              <Text style={[styles.sub, { color: valueCheck.met ? Colors.successText : Colors.warning }]}>
                {valueCheck.met ? '✓ ඉලක්කය සපුරා ඇත — ගාස්තුව සාධාරණයි' : `ඉලක්කයට නොපැමිණියොත් රු. ${valueCheck.credit.toLocaleString()} ක් ආපසු බැර වේ`}
              </Text>
            </>
          )}
        </View>
      ) : null}
      {PLANS.map((p) => {
        const mine = p.id === recommendedPlan.id;
        const current = subscription?.plan.id === p.id;
        return (
          <View key={p.id} style={[styles.plan, mine && styles.planMine]} accessibilityLabel={`Plan ${p.id}`}>
            <View style={styles.rowBetween}>
              <Text style={styles.boxTitle}>
                {p.name} · {money(p.fee)}/මස
              </Text>
              <Text style={[styles.sub, mine && { color: Colors.primary }]}>{mine ? 'ඔබගේ ආදායම් පරාසය' : `මාසික ආදායම රු. ${(p.minMonthlyEarnings / 1000).toFixed(0)}k+`}</Text>
            </View>
            {p.perks.map((x) => (
              <Text key={x} style={styles.text}>
                ✓ {x}
              </Text>
            ))}
            {mine && !current && <ActionButton label={`${p.name} අරඹන්න · ${money(p.fee)}/මස`} icon="⭐" variant="primary" compact onPress={() => subscribe(p.id)} />}
          </View>
        );
      })}
      <Text style={styles.sub}>
        මිල තීරණය වන්නේ යෙදුමෙන් ඔබ උපයන මුදල අනුවයි — කුඩා ගරාජ අඩුවෙන් ගෙවයි. දායකත්වයෙන් මට්ටමක්, ශ්‍රේණියක් හෝ ලැයිස්තුවේ ස්ථානයක් මිල දී ගත නොහැක. මසක දිනූ වැඩ ගාස්තුව මෙන් {GUARANTEE_MULTIPLE} ගුණයකට අඩු නම් වෙනස ආපසු ලැබේ.
      </Text>

      {/* Guarantee */}
      <View style={styles.box}>
        <Text style={styles.boxTitle}>🛡️ OnGarage Guarantee (ප්‍රිමියර් මට්ටමේ ගරාජ)</Text>
        <Text style={styles.text}>
          ආරක්ෂිත රැකියාවක ගැටලුවක් ගරාජයට විසඳිය නොහැකි නම්, OnGarage එක් ඉල්ලීමකට රු. {GUARANTEE.capPerClaim.toLocaleString()} දක්වා (ගරාජයකට වසරකට රු. {GUARANTEE.capPerGarageYear.toLocaleString()}) ගෙවයි. පළමු රු. {GUARANTEE.deductible.toLocaleString()} ගරාජය ගෙවයි; ඉල්ලීම් විශ්වාස ලකුණු අඩු කරයි. මෙය රක්ෂණයක් නොවේ.
        </Text>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    box: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 6, ...softShadow() },
    boxWarn: { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.07)' },
    boxOk: { borderColor: 'rgba(16, 185, 129, 0.5)' },
    boxTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    section: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dayLabel: { width: 52, fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    dayValue: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
    fillFull: { backgroundColor: Colors.warning },
    plan: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 4, opacity: 0.8, ...softShadow() },
    planMine: { borderColor: 'rgba(56, 189, 248, 0.6)', opacity: 1 },
    cancel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
