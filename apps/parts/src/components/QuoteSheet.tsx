import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { allowedTypes, courierFee, defaultEtaMin, inStockFor, useShop, variantFor } from '../context/ShopContext';
import { COURIER, listPrice } from '../constants/mockData';
import { formatTime, money } from '../utils/format';
import { Sheet } from './Sheet';
import type { IncomingRequest, QuoteType } from '../types';

const WARRANTY = [0, 1, 3, 6, 12];
const DEFAULT_WARRANTY: Record<QuoteType, number> = { Genuine: 12, OEM: 6, Recon: 1 };

/** Price a request: part type, unit prices (from stock), delivery, arrival time and warranty. */
export const QuoteSheet: React.FC<{ request: IncomingRequest | null; onClose: () => void }> = ({ request, onClose }) => {
  const { profile, stock, sendQuote } = useShop();
  const [shown, setShown] = useState<IncomingRequest | null>(request);
  const [type, setType] = useState<QuoteType>('OEM');
  const [prices, setPrices] = useState<string[]>([]);
  const [method, setMethod] = useState<'courier' | 'shop'>('courier');
  const [ownFee, setOwnFee] = useState('0');
  const [eta, setEta] = useState(30);
  const [warranty, setWarranty] = useState(6);
  const [note, setNote] = useState('');
  // Most garages collect themselves: offer the counter by default.
  const [counter, setCounter] = useState(true);
  const [readyMin, setReadyMin] = useState(15);

  const types = shown ? allowedTypes(shown, profile.types) : [];
  const priceFor = (r: IncomingRequest, t: QuoteType) => r.lines.map((l) => String(variantFor(stock, l.name, t)?.price ?? listPrice(l.name, t)));
  const methods = [profile.courierEnabled && 'courier', profile.ownDelivery && 'shop'].filter(Boolean) as ('courier' | 'shop')[];

  const pickType = (r: IncomingRequest, t: QuoteType) => {
    setType(t);
    setPrices(priceFor(r, t));
    setWarranty(DEFAULT_WARRANTY[t]);
  };

  useEffect(() => {
    if (!request) return;
    setShown(request);
    const ts = allowedTypes(request, profile.types);
    // Prefer the cheapest type the shop can fully supply from stock.
    const cost = (t: QuoteType) => priceFor(request, t).reduce((sum, p, i) => sum + Number(p) * request.lines[i].qty, 0);
    const stocked = ts.filter((t) => inStockFor(stock, request.lines, t)).sort((x, y) => cost(x) - cost(y));
    const first = stocked[0] ?? ts[0] ?? 'OEM';
    pickType(request, first);
    const m = methods[0] ?? 'shop';
    setMethod(m);
    setOwnFee(request.distanceKm <= 3 ? '0' : '300');
    setEta(defaultEtaMin(m, request.distanceKm));
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!shown) return null;

  const units = prices.map((p) => Number(p) || 0);
  const partsTotal = units.reduce((s, u, i) => s + u * shown.lines[i].qty, 0);
  const fee = method === 'courier' ? courierFee(shown.distanceKm) : Number(ownFee) || 0;
  const total = partsTotal + fee;
  const market = shown.lines.reduce((s, l) => s + listPrice(l.name, type) * l.qty, 0);
  const stocked = inStockFor(stock, shown.lines, type);
  const late = Date.now() + eta * 60000 > shown.needBy;
  const valid = units.every((u) => u > 0) && types.length > 0;
  const etaOptions = Array.from(new Set([defaultEtaMin(method, shown.distanceKm), 30, 45, 60, 90])).sort((a, b) => a - b);

  const submit = () => {
    sendQuote({ requestId: shown.id, partType: type, unitPrices: units, delivery: method, deliveryFee: fee, etaMin: eta, warrantyMonths: warranty, note: note.trim() || undefined, pickupReadyMin: counter ? readyMin : undefined });
    onClose();
  };

  return (
    <Sheet
      visible={!!request}
      title="මිල ගණනක් යවන්න"
      subtitle={`${shown.garage.name} · කි.මී. ${shown.distanceKm} · ලැබිය යුත්තේ ${formatTime(shown.needBy)}`}
      onClose={onClose}
      footer={<ActionButton label={`මිල ගණන යවන්න · ${money(total)}`} icon="📨" variant="primary" disabled={!valid} onPress={submit} />}
    >
      <Text style={styles.label}>කොටස් වර්ගය</Text>
      <View style={styles.chips}>
        {types.map((t) => {
          const ok = inStockFor(stock, shown.lines, t);
          return (
            <Pressable key={t} style={[styles.chip, type === t && styles.chipOn]} onPress={() => pickType(shown, t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextOn]}>
                {t}
                {t === 'Recon' && shown.partType === 'Genuine' ? ' (අයිතිකරු අනුමත)' : ''} {ok ? '✓' : '· තොග අඩු'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!stocked && <Text style={styles.warn}>⚠️ මෙම වර්ගයෙන් සියල්ල තොගයේ නැත — තෝරා ගතහොත් තොගය තහවුරු කිරීමට පෙර ලබා ගත යුතුයි.</Text>}

      <Text style={styles.label}>ඒකක මිල</Text>
      {shown.lines.map((l, i) => {
        const v = variantFor(stock, l.name, type);
        return (
          <View key={l.id} style={styles.priceRow}>
            <View style={styles.flex1}>
              <Text style={styles.lineName}>
                {l.name} ×{l.qty}
              </Text>
              <Text style={styles.sub}>
                {v ? `${v.brand ?? type} · තොගයේ ${v.qty}` : 'තොගයේ නැත'} · වෙළඳපොළ {money(listPrice(l.name, type))}
              </Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.currency}>රු.</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="number-pad"
                value={prices[i] ?? ''}
                onChangeText={(t) => setPrices((p) => p.map((x, j) => (j === i ? t.replace(/[^0-9]/g, '') : x)))}
                maxLength={7}
                accessibilityLabel={`Price ${l.name}`}
              />
            </View>
          </View>
        );
      })}

      <Text style={styles.label}>බෙදාහැරීම</Text>
      <View style={styles.chips}>
        {methods.map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, method === m && styles.chipOn]}
            onPress={() => {
              setMethod(m);
              setEta(defaultEtaMin(m, shown.distanceKm));
            }}
          >
            <Text style={[styles.chipText, method === m && styles.chipTextOn]}>{m === 'courier' ? `🛵 ${COURIER} · ${money(courierFee(shown.distanceKm))}` : '🚚 අපගේ බෙදාහැරීම'}</Text>
          </Pressable>
        ))}
      </View>
      {method === 'shop' && (
        <View style={styles.priceRow}>
          <Text style={[styles.sub, styles.flex1]}>බෙදාහැරීමේ ගාස්තුව (0 = නොමිලේ)</Text>
          <View style={styles.priceBox}>
            <Text style={styles.currency}>රු.</Text>
            <TextInput style={styles.priceInput} keyboardType="number-pad" value={ownFee} onChangeText={(t) => setOwnFee(t.replace(/[^0-9]/g, ''))} maxLength={5} />
          </View>
        </View>
      )}

      <Pressable style={[styles.chip, counter && styles.chipOn, styles.counterToggle]} onPress={() => setCounter((c) => !c)} accessibilityLabel="Offer counter pickup">
        <Text style={[styles.chipText, counter && styles.chipTextOn]}>{counter ? '✓ ' : ''}🏪 කවුන්ටරයෙන් එකතු කිරීමටත් ඉඩ දෙන්න (කොටස් මිල පමණි)</Text>
      </Pressable>
      {counter && (
        <View style={styles.chips}>
          {[10, 15, 30].map((m) => (
            <Pressable key={m} style={[styles.chip, readyMin === m && styles.chipOn]} onPress={() => setReadyMin(m)}>
              <Text style={[styles.chipText, readyMin === m && styles.chipTextOn]}>මිනි. {m}කින් සූදානම්</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>ගරාජයට ළඟා වීමට</Text>
      <View style={styles.chips}>
        {etaOptions.map((m) => (
          <Pressable key={m} style={[styles.chip, eta === m && styles.chipOn]} onPress={() => setEta(m)}>
            <Text style={[styles.chipText, eta === m && styles.chipTextOn]}>මිනි. {m}</Text>
          </Pressable>
        ))}
      </View>
      {late && <Text style={styles.warn}>⚠️ මෙම වේලාවෙන් ගරාජයේ වැඩට ප්‍රමාද වේ — ගරාජය මෙය තෝරා නොගැනීමට ඉඩ ඇත.</Text>}

      <Text style={styles.label}>වගකීම</Text>
      <View style={styles.chips}>
        {WARRANTY.map((w) => (
          <Pressable key={w} style={[styles.chip, warranty === w && styles.chipOn]} onPress={() => setWarranty(w)}>
            <Text style={[styles.chipText, warranty === w && styles.chipTextOn]}>{w ? `මාස ${w}` : 'නැත'}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="සටහනක් (උදා: Denso, ජපානයෙන්)" placeholderTextColor={Colors.textMuted} maxLength={100} />

      <View style={styles.summary}>
        <Row label="කොටස්" value={money(partsTotal)} />
        <Row label="බෙදාහැරීම" value={fee ? money(fee) : 'නොමිලේ'} />
        <Row label="ගරාජය සසඳන මුළු මිල" value={money(total)} strong />
        {counter && <Row label="🏪 කවුන්ටරයෙන් එකතු කළොත්" value={money(partsTotal)} />}
        <Text style={[styles.sub, { color: partsTotal <= market ? Colors.success : Colors.warning }]}>
          {partsTotal === market
            ? 'වෙළඳපොළ මිලට සමානයි'
            : partsTotal < market
              ? `වෙළඳපොළ මිලට වඩා ${money(market - partsTotal)} අඩුයි — තරගකාරීයි`
              : `වෙළඳපොළ මිලට වඩා ${money(partsTotal - market)} වැඩියි`}
          {shown.otherQuotes ? ` · තවත් වෙළඳසැල් ${shown.otherQuotes}ක් මිල ගණන් එවා ඇත` : ' · පළමු මිල ගණන ඔබගේ විය හැක'}
        </Text>
      </View>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.sumRow}>
    <Text style={strong ? styles.sumStrongLabel : styles.sub}>{label}</Text>
    <Text style={strong ? styles.sumStrong : styles.sumValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    counterToggle: { marginTop: 4 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    lineName: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 42, width: 118, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    currency: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textMain },
    input: {
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyMedium,
      marginTop: 6,
    },
    summary: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6, marginTop: 6 },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sumValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sumStrongLabel: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sumStrong: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
