import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, CloseCode, Colors, FONTS, pickupCodePayload, themedStyles, type PartQuote, type PartsOrder, softEdge, softShadow } from '@ongarage/shared';
import { allowedTypes, linesSummary, orderTotal, useParts } from '../context/PartsContext';
import { useGarage } from '../context/GarageContext';
import { PART_TYPE_LABEL } from '../constants/parts';
import { countdown, formatDate, formatTime, money } from '../utils/format';
import { Sheet } from './Sheet';

type Sort = 'total' | 'fastest' | 'rating';
const PROBLEMS = ['වැරදි කොටසක්', 'හානි වූ කොටසක්', 'ඉල්ලූ වර්ගය නොවේ'];

const ORDER_STEPS: { id: PartsOrder['status']; label: string }[] = [
  { id: 'confirming', label: 'තොග තහවුරු' },
  { id: 'dispatched', label: 'මගදී' },
  { id: 'arrived', label: 'පැමිණියා' },
  { id: 'received', label: 'ලැබුණා' },
];
const PICKUP_STEPS: { id: PartsOrder['status']; label: string }[] = [
  { id: 'confirming', label: 'තොග තහවුරු' },
  { id: 'ready', label: 'කවුන්ටරයේ' },
  { id: 'arrived', label: 'ගෙනාවා' },
  { id: 'received', label: 'ලැබුණා' },
];

/** One parts request: its quotes while open, then the order's progress. */
export const PartsDetailSheet: React.FC<{ requestId: string | null; onClose: () => void }> = ({ requestId, onClose }) => {
  const { requests, quotes, orders, acceptQuote, askReconApproval, cancelRequest } = useParts();
  const { bookings, team } = useGarage();
  const [sort, setSort] = useState<Sort>('total');
  const [now, setNow] = useState(Date.now());
  const [lastId, setLastId] = useState(requestId);

  useEffect(() => {
    if (requestId) setLastId(requestId);
  }, [requestId]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const r = requests.find((x) => x.id === (requestId ?? lastId));
  if (!r) return null;
  const booking = bookings.find((b) => b.id === r.bookingId);
  const allowed = allowedTypes(r);
  const mine = quotes.filter((q) => q.requestId === r.id && !q.withdrawn && allowed.includes(q.partType));
  const sorted = [...mine].sort((a, b) => (sort === 'total' ? a.total - b.total : sort === 'fastest' ? a.etaMin - b.etaMin : b.shop.rating - a.shop.rating));
  const cheapest = Math.min(...mine.map((q) => q.total));
  const reqOrders = orders.filter((o) => o.requestId === r.id);
  const windowOpen = r.quoteUntil > now;
  // Genuine was asked for and none came: the owner may allow Recon.
  const needsRecon = r.partType === 'Genuine' && r.reconApproval !== 'approved' && !r.searching && mine.length === 0 && r.status === 'open';

  return (
    <Sheet
      visible={!!requestId}
      title={booking ? `කොටස් · ${booking.title}` : 'කොටස් ඉල්ලීම'}
      subtitle={booking ? `${booking.vehicle.name} · ${booking.vehicle.plate} · ${booking.customer.name}` : undefined}
      onClose={onClose}
      footer={
        r.status === 'open' ? (
          <Pressable
            style={styles.cancel}
            onPress={() => {
              cancelRequest(r.id);
              onClose();
            }}
          >
            <Text style={styles.cancelText}>ඉල්ලීම අවලංගු කරන්න</Text>
          </Pressable>
        ) : undefined
      }
    >
      <View style={styles.summary}>
        <Row label="කොටස්" value={linesSummary(r.lines)} />
        <Row label="වර්ගය" value={`${PART_TYPE_LABEL[r.partType]}${r.reconApproval === 'approved' ? ' · Recon අනුමතයි' : ''}`} />
        <Row label="ලැබිය යුත්තේ" value={`${formatDate(r.needBy)} · ${formatTime(r.needBy)}`} />
        {!!r.vehicle.chassis && <Row label="චැසි අංකය" value={r.vehicle.chassis} />}
        {!!r.note && <Row label="සටහන" value={r.note} />}
        {r.oldPartPhoto && <Row label="ඡායාරූපය" value="📷 පැරණි කොටස අමුණා ඇත" />}
      </View>

      {r.status === 'open' && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {r.searching ? `⏳ කි.මී. ${r.radiusKm} ඇතුළත වෙළඳසැල් පිළිතුරු දෙමින්…` : `මිල ගණන් ${mine.length} ක්`}
          </Text>
          <Text style={[styles.statusText, { color: windowOpen ? Colors.primary : Colors.textMuted }]}>{windowOpen ? countdown(r.quoteUntil - now) : 'කාලය අවසන්'}</Text>
        </View>
      )}

      {needsRecon && r.reconApproval !== 'pending' && (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>⚠️ Genuine කොටස් ලබා ගත නොහැක</Text>
          <Text style={styles.sub}>අයිතිකරු Genuine ඉල්ලූ බැවින් Recon යෙදිය හැක්කේ ඔවුන්ගේ අවසරයෙන් පමණි. අනුමත කළහොත් Recon මිල ගණන් ඉල්ලනු ලැබේ.</Text>
          <ActionButton label="Recon සඳහා අයිතිකරුගෙන් අවසර ඉල්ලන්න" icon="📲" variant="primary" compact onPress={() => askReconApproval(r.id)} />
        </View>
      )}
      {r.reconApproval === 'pending' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>📲 අයිතිකරුගේ අවසරය බලාපොරොත්තුවෙන්…</Text>
        </View>
      )}

      {/* Quotes, while the garage is choosing */}
      {r.status === 'open' && mine.length > 0 && (
        <>
          <View style={styles.chips}>
            {(
              [
                ['total', 'අඩුම මුළු මිල'],
                ['fastest', 'වේගවත්ම'],
                ['rating', 'හොඳම ශ්‍රේණිය'],
              ] as [Sort, string][]
            ).map(([id, label]) => (
              <Pressable key={id} style={[styles.chip, sort === id && styles.chipOn]} onPress={() => setSort(id)}>
                <Text style={[styles.chipText, sort === id && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {sorted.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              lines={r.lines}
              late={now + q.etaMin * 60000 > r.needBy}
              cheapest={q.total === cheapest}
              team={team}
              onChoose={() => acceptQuote(q.id)}
              onPickup={(collector) => acceptQuote(q.id, { collector })}
            />
          ))}
        </>
      )}

      {/* Orders for this request, newest first */}
      {reqOrders.map((o) => (
        <OrderCard key={o.id} order={o} quote={quotes.find((q) => q.id === o.quoteId)} partType={r.partType} now={now} />
      ))}
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

type Member = { id: string; name: string; hasApp?: boolean };

const QuoteCard: React.FC<{
  quote: PartQuote;
  lines: { name: string; qty: number }[];
  late: boolean;
  cheapest: boolean;
  team: Member[];
  onChoose: () => void;
  /** Collect from the counter: by the garage (no collector) or a team member. */
  onPickup: (collector?: Member) => void;
}> = ({ quote: q, lines, late, cheapest, team, onChoose, onPickup }) => {
  const [picking, setPicking] = useState(false);
  const [who, setWho] = useState<string>('garage');
  return (
  <View style={[styles.card, cheapest && styles.cardBest]}>
    <View style={styles.rowBetween}>
      <View style={styles.flex1}>
        <Text style={styles.title}>{q.shop.name}</Text>
        <Text style={styles.sub}>
          ★ {q.shop.rating} ({q.shop.ratingCount}) · කි.මී. {q.shop.distanceKm}
        </Text>
        {!!q.tradeDiscountPercent && <Text style={[styles.sub, { color: Colors.primary }]}>🤝 ගිවිසුම් මිල −{q.tradeDiscountPercent}%</Text>}
      </View>
      <View style={[styles.typeBadge, q.partType === 'Recon' && styles.typeRecon]}>
        <Text style={[styles.typeText, q.partType === 'Recon' && { color: Colors.warning }]}>{q.partType}</Text>
      </View>
    </View>
    {lines.map((l, i) => (
      <View key={l.name} style={styles.rowBetween}>
        <Text style={styles.sub}>
          {l.name} ×{l.qty}
        </Text>
        <Text style={styles.sub}>{money(q.unitPrices[i] * l.qty)}</Text>
      </View>
    ))}
    <View style={styles.rowBetween}>
      <Text style={styles.sub}>{q.delivery === 'courier' ? `🛵 ${q.courier}` : '🚚 වෙළඳසැලේ බෙදාහැරීම'}</Text>
      <Text style={styles.sub}>{q.deliveryFee ? money(q.deliveryFee) : 'නොමිලේ'}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.rowBetween}>
      <View style={styles.flex1}>
        <Text style={[styles.sub, late && { color: Colors.errorText }]}>
          ⏱️ මිනි. ~{q.etaMin}
          {late ? ' · ⚠️ වැඩට ප්‍රමාද වේ' : ''} · 🛡️ {q.warrantyMonths ? `මාස ${q.warrantyMonths}` : 'වගකීමක් නැත'}
        </Text>
      </View>
      <Text style={styles.total}>{money(q.total)}</Text>
    </View>
    {cheapest && <Text style={styles.bestTag}>✓ අඩුම මුළු මිල</Text>}
    {picking && q.pickup ? (
      <View style={styles.pickBox}>
        <Text style={styles.sub}>
          🏪 {q.shop.address} · මිනි. ~{q.pickup.readyInMin}කින් සූදානම් · {money(q.pickup.total)} (බෙදාහැරීම් ගාස්තුවක් නැත)
        </Text>
        <Text style={styles.rowLabel}>එකතු කරන්නේ කවුද?</Text>
        <View style={styles.chips}>
          {[{ id: 'garage', name: 'ගරාජයෙන් (මම)' } as Member, ...team].map((m) => (
            <Pressable key={m.id} style={[styles.chip, who === m.id && styles.chipOn]} onPress={() => setWho(m.id)} accessibilityLabel={`Collector ${m.id}`}>
              <Text style={[styles.chipText, who === m.id && styles.chipTextOn]}>
                {m.name}
                {m.hasApp ? ' · ඇප්' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="ආපසු" variant="ghost" compact onPress={() => setPicking(false)} />
          </View>
          <View style={styles.flex2}>
            <ActionButton label={`එකතු කරන්න · ${money(q.pickup.total)}`} icon="🏪" variant="success" compact onPress={() => onPickup(team.find((m) => m.id === who))} />
          </View>
        </View>
      </View>
    ) : (
      <View style={styles.actions}>
        {q.pickup && (
          <View style={styles.flex1}>
            <ActionButton label={`කවුන්ටරයෙන් · ${money(q.pickup.total)}`} icon="🏪" variant="ghost" compact onPress={() => setPicking(true)} />
          </View>
        )}
        <View style={styles.flex1}>
          <ActionButton label={`ගෙන්වන්න · ${money(q.total)}`} icon="🛵" variant={cheapest ? 'success' : 'ghost'} compact onPress={onChoose} />
        </View>
      </View>
    )}
  </View>
  );
};

const OrderCard: React.FC<{ order: PartsOrder; quote?: PartQuote; partType: string; now: number }> = ({ order: o, quote: q, partType, now }) => {
  const { markReceived, reportProblem, rateOrder } = useParts();
  const [problemOpen, setProblemOpen] = useState(false);
  if (!q) return null;
  const failed = o.status === 'unavailable' || o.status === 'problem';
  const pickup = o.fulfilment === 'pickup';
  const steps = pickup ? PICKUP_STEPS : ORDER_STEPS;
  const stepIndex = steps.findIndex((s) => s.id === o.status);

  return (
    <View style={[styles.card, failed && styles.cardFailed]}>
      <View style={styles.rowBetween}>
        <View style={styles.flex1}>
          <Text style={styles.title}>{q.shop.name}</Text>
          <Text style={styles.sub}>
            {q.partType} · {money(orderTotal(o, q))} · {pickup ? `🏪 කවුන්ටරයෙන්${o.collector ? ` · ${o.collector.name}` : ''}` : '🛵 බෙදාහැරීම'} · {formatTime(o.placedAt)}
          </Text>
        </View>
        <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${q.shop.phone}`)}>
          <Text style={styles.callText}>📞 වෙළඳසැල</Text>
        </Pressable>
      </View>

      {failed ? (
        <Text style={styles.failText}>{o.status === 'unavailable' ? '⛔ වෙළඳසැල ළඟ තොග නැත — ඇණවුම අවලංගු විය' : `↩️ ආපසු යවනු ලැබේ: ${o.problem}`}</Text>
      ) : (
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <View key={s.id} style={styles.step}>
              <View style={[styles.stepDot, i <= stepIndex && styles.stepDone]} />
              <Text style={[styles.stepText, i <= stepIndex && { color: Colors.textMain }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {o.status === 'dispatched' && (
        <View style={styles.rowBetween}>
          <Text style={[styles.sub, styles.flex1]}>
            🛵 {o.rider?.name} · {q.delivery === 'courier' ? q.courier : 'වෙළඳසැල'} · {o.etaAt ? `මිනි. ${Math.max(0, Math.round((o.etaAt - now) / 60000))}කින්` : ''}
          </Text>
          {!!o.rider && (
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${o.rider!.phone}`)}>
              <Text style={styles.callText}>📞 රියදුරු</Text>
            </Pressable>
          )}
        </View>
      )}

      {o.status === 'ready' && o.pickupCode && (
        o.collector?.hasApp ? (
          <Text style={styles.sub}>🧑‍🔧 {o.collector.name} ගේ ඇප් එකට පිකප් කේතය යැව්වා · {q.shop.address}. ඔවුන් කොටස් ගෙනා පසු පරීක්ෂා කරන්න.</Text>
        ) : (
          <>
            <CloseCode code={o.pickupCode} size={120} payload={pickupCodePayload(o.pickupCode)} title="කවුන්ටරයේදී පෙන්වන්න" caption={`${q.shop.address}${o.holdUntil ? ` · ${formatTime(o.holdUntil)} දක්වා තබා ගනී` : ''}${o.collector ? ` · ${o.collector.name} එකතු කරයි` : ''}`} />
            <ActionButton label="කොටස් එකතු කර පරීක්ෂා කළා" icon="✓" variant="success" compact onPress={() => markReceived(o.id)} />
          </>
        )
      )}

      {(o.status === 'arrived' || o.status === 'dispatched') && (
        <>
          <Text style={styles.sub}>ලැබුණු කොටස {partType === 'GarageChoice' ? q.partType : partType === 'Genuine' && q.partType === 'Recon' ? 'Recon (අයිතිකරු අනුමත)' : q.partType} බව සහ හොඳ තත්ත්වයේ ඇති බව පරීක්ෂා කරන්න.</Text>
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="ගැටලුවක්" icon="↩" variant="ghost" compact onPress={() => setProblemOpen((p) => !p)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label="ලැබුණා" icon="✓" variant="success" compact onPress={() => markReceived(o.id)} />
            </View>
          </View>
          {problemOpen && (
            <View style={styles.chips}>
              {PROBLEMS.map((p) => (
                <Pressable key={p} style={[styles.chip, styles.chipDanger]} onPress={() => reportProblem(o.id, p)}>
                  <Text style={[styles.chipText, { color: Colors.errorText }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {o.status === 'received' && (
        <View style={styles.rowBetween}>
          <Text style={styles.sub}>{o.rating ? 'ඔබගේ ශ්‍රේණිය' : 'වෙළඳසැල ශ්‍රේණිගත කරන්න'}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => rateOrder(o.id, n)} hitSlop={4} accessibilityLabel={`Rate ${n}`}>
                <Text style={[styles.star, (o.rating ?? 0) >= n && styles.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    rowLabel: { width: 84, fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    rowValue: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    summary: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 6, ...softShadow() },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    warnBox: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)', gap: 8 },
    warnTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
    infoBox: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
    infoText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipDanger: { borderColor: 'rgba(239, 68, 68, 0.45)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    card: { padding: 12, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 6, ...softShadow() },
    cardBest: { borderColor: 'rgba(16, 185, 129, 0.55)' },
    cardFailed: { borderColor: 'rgba(239, 68, 68, 0.4)', opacity: 0.85 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    typeRecon: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    typeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    divider: { height: 1, backgroundColor: Colors.borderColor, marginVertical: 2 },
    total: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.success },
    bestTag: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: Colors.success },
    callBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    callText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    failText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    steps: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
    step: { alignItems: 'center', gap: 4, flex: 1 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.subtleBorder },
    stepDone: { backgroundColor: Colors.success },
    stepText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    actions: { flexDirection: 'row', gap: 8 },
    stars: { flexDirection: 'row', gap: 4 },
    pickBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill },
    star: { fontSize: 20, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
    cancel: { alignItems: 'center', paddingVertical: 10 },
    cancelText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
