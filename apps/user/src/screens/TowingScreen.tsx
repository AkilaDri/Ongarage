import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionButton,
  canCancelTow,
  getAi,
  SUGGEST_MIN_CONFIDENCE,
  Colors,
  directionsUrl,
  distanceKm,
  FONTS,
  getThemeMode,
  rankTowOperators,
  roadKm,
  themedStyles,
  TOW_CONDITION_LIST,
  TOW_OVERRUN_PCT,
  TOW_STAGES,
  towClosed,
  towStageIndex,
  type TowCondition,
  type TowQuote,
  type TowStage,
} from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { TOW_OPERATORS, towReviewsOf } from '../constants/towOperators';
import { ReviewsSection, WriteReview, type ReviewView } from '../components/ReviewCard';
import { useUserLocation } from '../context/LocationContext';
import { useVehicles } from '../context/VehiclesContext';
import { useTow } from '../context/TowContext';
import { Toast } from '../components/Toast';

const CONDITION_TEXT: Record<TowCondition, { label: string; hint: string }> = {
  rolls: { label: 'රෝද කැරකෙනවා', hint: 'වාහනය තල්ලු කළ හැකියි' },
  wontRoll: { label: 'ගමන් කරන්නේ නැහැ', hint: 'engine / gearbox / රෝද අගුළු වැටී' },
  stuck: { label: 'හිරවී ඇත', hint: 'කානුවක / මඩේ / ගොහොරුවක' },
  accident: { label: 'අනතුරකට ලක්වී', hint: 'හානි වූ වාහනයක්' },
};
const STAGE_TEXT: Record<TowStage, string> = {
  searching: 'Operator සොයමින්',
  accepted: 'Operator පිළිගත්තා',
  enroute: 'Truck එක මග',
  arrived: 'ඔබ ළඟට ළඟා වුණා',
  loading: 'වාහනය පටවමින්',
  transporting: 'ගමනාන්තයට රැගෙන යමින්',
  delivered: 'වාහනය බාගත්තා',
};

/** The towing breakdown, so an owner sees what the price is made of. */
const QuoteLines: React.FC<{ q: TowQuote }> = ({ q }) => (
  <View style={styles.lines}>
    <Line label="මූලික ගාස්තුව" value={q.baseFee} />
    <Line label={`ගමන (කි.මී. ${q.tripKm})`} value={q.tripFee} />
    {q.pickupFee > 0 && <Line label="Truck එක ඔබ වෙත එන දුර" value={q.pickupFee} />}
    {q.recoveryFee > 0 && <Line label="ගොඩ ගැනීමේ (recovery) ගාස්තුව" value={q.recoveryFee} />}
    {q.nightFee > 0 && <Line label="රාත්‍රී අමතර ගාස්තුව" value={q.nightFee} />}
    <Line label="ඇස්තමේන්තු මුළු මුදල" value={q.total} bold />
  </View>
);
/** An operator's reviews: the summary and the latest as Google-style cards that scroll sideways; once the owner's job is closed they can add their own. */
const OperatorReviews: React.FC<{ id: string; name: string; rating: number; count: number; mine?: ReviewView | null; write?: React.ReactNode }> = ({ id, name, rating, count, mine, write }) => (
  <ReviewsSection avg={rating} count={count + (mine ? 1 : 0)} reviews={[...(mine ? [mine] : []), ...towReviewsOf(id, name)]} write={write} />
);
const Line: React.FC<{ label: string; value: number; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.lineRow}>
    <Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text>
    <Text style={[styles.lineValue, bold && styles.bold]}>රු. {value}</Text>
  </View>
);

/**
 * Towing (service mode 'dispatch'): the owner says where the vehicle is, where it should go and what is wrong, sees the operators that can carry it with the
 * price of each (cheapest first, never paid placement) and asks one; then follows the truck like an SOS call. A final price above the estimate's limit needs the
 * owner's approval. The price is an estimate and is paid to the operator directly.
 */
export const TowingScreen: React.FC<{ vehicleId?: string; onClose: () => void }> = ({ vehicleId, onClose }) => {
  const user = useUserLocation();
  const { vehicles } = useVehicles();
  const tow = useTow();
  const [vid, setVid] = useState<string | undefined>(vehicleId ?? vehicles[0]?.id);
  const [condition, setCondition] = useState<TowCondition>('wontRoll');
  const [destId, setDestId] = useState<string | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mine, setMine] = useState<ReviewView | null>(null);

  // The garages nearest to the vehicle are the suggested places to take it to.
  const destinations = useMemo(
    () => MOCK_GARAGES.map((g) => ({ g, km: distanceKm(user.coords, g.coords) })).sort((a, b) => a.km - b.km).slice(0, 5),
    [user.coords]
  );
  const dest = destinations.find((d) => d.g.id === destId)?.g;
  const options = useMemo(() => (dest ? rankTowOperators(TOW_OPERATORS, user.coords, dest.coords, condition, Date.now()) : []), [dest, condition, user.coords]);
  const picked = options.find((o) => o.op.id === optionId) ?? null;
  const req = tow.request;

  const reviewOperator = async (stars: number, text: string) => {
    if (text.trim()) {
      const m = await getAi().moderate(text);
      if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) return { ok: false as const, reason: 'මෙම සටහන ප්‍රකාශයට පත් කළ නොහැක. අසභ්‍ය වචන, දුරකථන අංක හෝ සබැඳි ඉවත් කරන්න.' };
    }
    tow.rate(stars);
    setMine({ id: 'mine', name: 'ඔබ', rating: stars, at: Date.now(), text: text.trim() || undefined, meta: '✓ ඔබේ Tow request එක' });
    return { ok: true as const };
  };

  const request = () => {
    if (!picked || !dest) return;
    tow.start(picked, { pickup: user.coords, pickupText: user.address, destination: dest.coords, destinationText: dest.name, condition, vehicleId: vid, note: note.trim() || undefined });
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>🛻 Towing</Text>
      <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close towing">
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );

  // A request in progress (or just finished): the live view.
  if (req) {
    const op = TOW_OPERATORS.find((o) => o.id === req.operatorId);
    const idx = towStageIndex(req.stage);
    const closed = towClosed(req);
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.body}>
          {req.cancelled ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>අවලංගු කළා</Text>
              <ActionButton label="අලුත් request එකක්" variant="primary" compact onPress={tow.dismiss} />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{op?.name}</Text>
                <Text style={styles.sub}>
                  ★ {op?.rating} · {req.condition && CONDITION_TEXT[req.condition].label} · ඇස්තමේන්තු පැමිණීම මිනි. {req.etaMin}
                </Text>
                <Text style={styles.sub}>📍 {req.pickupText} → 🏁 {req.destinationText}</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => op && Linking.openURL(`tel:${op.phone.replace(/\s/g, '')}`)} />
                  </View>
                  <View style={styles.flex1}>
                    <ActionButton label="මාර්ගය" icon="🧭" variant="ghost" compact onPress={() => Linking.openURL(directionsUrl(req.destination, req.pickup))} />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                {TOW_STAGES.map((s, i) => (
                  <View key={s} style={styles.stageRow}>
                    <View style={[styles.dot, i < idx && styles.dotDone, i === idx && styles.dotNow]} />
                    <Text style={[styles.stageText, i === idx && styles.bold, i > idx && styles.dim]}>{STAGE_TEXT[s]}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>මිල</Text>
                <QuoteLines q={req.quote} />
                <Text style={styles.note}>ගෙවන්නේ operator ට කෙලින්ම; අවසන් මිල ඇස්තමේන්තුවට වඩා {TOW_OVERRUN_PCT}% ට වැඩි නම් ඔබේ අනුමැතිය ඕන.</Text>
              </View>

              {req.finalPrice !== undefined && (
                <View style={[styles.card, req.approval === 'pending' && styles.cardWarn]}>
                  <Text style={styles.cardTitle}>අවසන් මිල: රු. {req.finalPrice}</Text>
                  {req.approval === 'pending' && (
                    <>
                      <Text style={styles.sub}>ඇස්තමේන්තුවේ සීමාව රු. {req.quote.limit}. මේ මිල අනුමත කරනවාද?</Text>
                      <View style={styles.row}>
                        <View style={styles.flex1}>
                          <ActionButton label="ගැටලුවක් තියෙනවා" variant="ghost" compact onPress={() => tow.answerPrice(false)} />
                        </View>
                        <View style={styles.flex1}>
                          <ActionButton label="අනුමත කරනවා" variant="primary" compact onPress={() => tow.answerPrice(true)} />
                        </View>
                      </View>
                    </>
                  )}
                  {req.approval === 'approved' && <Text style={styles.good}>✓ ඔබ අනුමත කළා</Text>}
                  {req.approval === 'disputed' && <Text style={styles.bad}>⚠️ ගැටලුවක් ලෙස වාර්තා කළා — OnGarage සමාලෝචනය කරයි</Text>}
                  {!req.approval && <Text style={styles.good}>✓ ඇස්තමේන්තුව ඇතුළත</Text>}
                </View>
              )}

              {!!op && (
                <View style={styles.card}>
                  <OperatorReviews id={op.id} name={op.name} rating={op.rating} count={op.reviews} mine={mine} write={closed ? <WriteReview done={!!mine} doneText="✓ ඔබේ සමාලෝචනය එකතු කළා." onSubmit={reviewOperator} /> : undefined} />
                </View>
              )}

              {closed && <ActionButton label="වසන්න" variant="primary" compact onPress={() => { tow.dismiss(); onClose(); }} />}

              {canCancelTow(req) && <ActionButton label="Request එක අවලංගු කරන්න" variant="ghost" compact onPress={tow.cancel} />}
            </>
          )}
        </ScrollView>
        <Toast topOffset={84} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>වාහනය</Text>
        <View style={styles.row}>
          {vehicles.map((v) => (
            <Pressable key={v.id} style={[styles.chip, vid === v.id && styles.chipOn]} onPress={() => setVid(v.id)} accessibilityLabel={`Tow vehicle ${v.name}`}>
              <Text style={[styles.chipText, vid === v.id && styles.chipTextOn]}>{v.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>වාහනයේ තත්වය</Text>
        {TOW_CONDITION_LIST.map((c) => (
          <Pressable key={c} style={[styles.option, condition === c && styles.optionOn]} onPress={() => { setCondition(c); setOptionId(null); }} accessibilityLabel={`Tow condition ${c}`}>
            <Text style={styles.optionTitle}>{CONDITION_TEXT[c].label}</Text>
            <Text style={styles.sub}>{CONDITION_TEXT[c].hint}</Text>
          </Pressable>
        ))}

        <Text style={styles.label}>දැන් ඉන්න තැන</Text>
        <View style={styles.option}>
          <Text style={styles.optionTitle}>📍 {user.address}</Text>
        </View>

        <Text style={styles.label}>රැගෙන යන්න ඕන තැන (garage එකක්)</Text>
        {destinations.map(({ g, km }) => (
          <Pressable key={g.id} style={[styles.option, destId === g.id && styles.optionOn]} onPress={() => { setDestId(g.id); setOptionId(null); }} accessibilityLabel={`Tow to ${g.name}`}>
            <Text style={styles.optionTitle}>{g.name}</Text>
            <Text style={styles.sub}>
              {g.address} · කි.මී. {roadKm(user.coords, g.coords)}
            </Text>
          </Pressable>
        ))}

        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="විශේෂ සටහනක් (විකල්ප)" placeholderTextColor={Colors.textMuted} multiline accessibilityLabel="Tow note" />

        <Text style={styles.label}>සුදුසු operators (අඩුම මිලින් පටන්)</Text>
        {!dest ? (
          <Text style={styles.sub}>ගමනාන්තයක් තෝරන්න.</Text>
        ) : options.length === 0 ? (
          <Text style={styles.sub}>මේ තත්වයට සුදුසු truck එකක් දැනට නැහැ.</Text>
        ) : (
          options.map((o, i) => (
            <Pressable key={o.op.id} style={[styles.option, optionId === o.op.id && styles.optionOn]} onPress={() => setOptionId(o.op.id)} accessibilityLabel={`Tow operator ${o.op.name}`}>
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.optionTitle}>
                    {o.op.name}
                    {i === 0 ? '  · අඩුම මිල' : ''}
                  </Text>
                  <Text style={styles.sub}>
                    ★ {o.op.rating} ({o.op.reviews}) · මිනි. {o.etaMin}කින් · කි.මී. {o.pickupKm}
                  </Text>
                </View>
                <Text style={styles.price}>රු. {o.quote.total}</Text>
              </View>
              {optionId === o.op.id && <QuoteLines q={o.quote} />}
              {optionId === o.op.id && <OperatorReviews id={o.op.id} name={o.op.name} rating={o.op.rating} count={o.op.reviews} />}
            </Pressable>
          ))
        )}
      </ScrollView>
      <View style={styles.footer}>
        <ActionButton label={picked ? `Tow truck ඉල්ලන්න · රු. ${picked.quote.total}` : 'Operator කෙනෙක් තෝරන්න'} icon="🛻" variant="primary" disabled={!picked} onPress={request} />
        <Text style={styles.note}>මිල ඇස්තමේන්තුවක්; operator ට කෙලින්ම ගෙවන්න.</Text>
      </View>
      <Toast topOffset={84} />
    </SafeAreaView>
  );
};

const dark = () => getThemeMode() === 'dark';
const soft = () => (dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9');

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
    close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: soft() },
    closeText: { fontSize: 16, color: Colors.textMain },
    body: { padding: 16, gap: 10, paddingBottom: 40 },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 8 },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    note: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    bold: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    dim: { opacity: 0.5 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eef7' },
    chipOn: { backgroundColor: '#1a73e8' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    option: { padding: 14, borderRadius: 14, gap: 4, backgroundColor: soft() },
    optionOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    optionTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    input: { minHeight: 60, padding: 12, borderRadius: 12, backgroundColor: soft(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    footer: { padding: 16, gap: 6 },
    card: { padding: 14, borderRadius: 14, gap: 8, backgroundColor: soft() },
    cardWarn: { backgroundColor: dark() ? 'rgba(251, 188, 4, 0.14)' : '#fef7e0' },
    cardTitle: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    reviews: { marginTop: 6 },
    lines: { gap: 4, marginTop: 4 },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
    lineLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    lineValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1' },
    dotDone: { backgroundColor: '#16a34a' },
    dotNow: { backgroundColor: '#1a73e8' },
    stageText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    good: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#16a34a' },
    bad: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: dark() ? '#f28b82' : '#b3261e' },
    star: { fontSize: 32, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
  })
);
