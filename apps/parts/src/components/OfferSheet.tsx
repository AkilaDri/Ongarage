import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { buyerLabel, courierFee, defaultEtaMin, useShop, variantFor, type OfferInput } from '../context/ShopContext';
import { COURIER, listPrice } from '../constants/mockData';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { CustomerRequest, QuoteType } from '../types';

const WARRANTY = [0, 1, 3, 6, 12];
const READY = [10, 15, 30, 60];
const HOLD = [2, 4, 8, 24];
const DEFAULT_WARRANTY: Record<QuoteType, number> = { Genuine: 12, OEM: 6, Recon: 1 };

type Draft = { available: boolean; type: QuoteType; price: string; warranty: number; ready: number; hold: number; fit: boolean };

/** Answer a customer's enquiry: for each part, whether you have it, the type, price, warranty and when it is ready. */
export const OfferSheet: React.FC<{ request: CustomerRequest | null; onClose: () => void }> = ({ request, onClose }) => {
  const { profile, stock, respondToCustomer, passCustomer, priceWithDeal, liveDeal } = useShop();
  const [shown, setShown] = useState<CustomerRequest | null>(request);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deliver, setDeliver] = useState(false);
  const [note, setNote] = useState('');

  const typesFor = (partType: string): QuoteType[] => {
    const asked: QuoteType[] = partType === 'GarageChoice' ? ['Genuine', 'OEM', 'Recon'] : [partType as QuoteType];
    return asked.filter((t) => profile.types.includes(t));
  };

  const initDraft = (r: CustomerRequest, i: number): Draft => {
    const b = r.enquiry.briefs[i];
    const types = typesFor(b.partType);
    const type = types.find((t) => (variantFor(stock, b.name, t)?.qty ?? 0) >= b.qty) ?? types[0] ?? 'OEM';
    const v = variantFor(stock, b.name, type);
    return {
      available: !!v && v.qty >= b.qty,
      type,
      price: String(priceWithDeal(b.name, type, v?.price ?? listPrice(b.name, type))),
      warranty: DEFAULT_WARRANTY[type],
      ready: 15,
      hold: 4,
      fit: !!(b.vehicle.chassisNo || b.vehicle.engineNo),
    };
  };

  useEffect(() => {
    if (!request) return;
    setShown(request);
    setDrafts(request.enquiry.briefs.map((_, i) => initDraft(request, i)));
    setDeliver((profile.courierEnabled || profile.ownDelivery) && request.distanceKm <= 30);
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!shown || drafts.length !== shown.enquiry.briefs.length) return null;

  const r = shown;
  const e = r.enquiry;
  const method: 'courier' | 'shop' = profile.courierEnabled ? 'courier' : 'shop';
  const fee = method === 'courier' ? courierFee(r.distanceKm) : r.distanceKm <= 3 ? 0 : 300;
  const set = (i: number, change: Partial<Draft>) => setDrafts((prev) => prev.map((d, k) => (k === i ? { ...d, ...change } : d)));
  const pickType = (i: number, t: QuoteType) => {
    const b = e.briefs[i];
    set(i, { type: t, price: String(priceWithDeal(b.name, t, variantFor(stock, b.name, t)?.price ?? listPrice(b.name, t))), warranty: DEFAULT_WARRANTY[t] });
  };
  const anyAvailable = drafts.some((d) => d.available);
  const valid = anyAvailable && drafts.every((d) => !d.available || Number(d.price) > 0);
  const total = drafts.reduce((s, d, i) => (d.available ? s + (Number(d.price) || 0) * e.briefs[i].qty : s), 0);
  const referred = !!e.jobRef && e.jobRef.recommendedShopIds.includes(profile.id);

  const submit = () => {
    const inputs: OfferInput[] = drafts.map((d, i) => {
      const b = e.briefs[i];
      const v = variantFor(stock, b.name, d.type);
      return {
        briefId: b.id,
        available: d.available,
        partType: d.type,
        brand: v?.brand,
        unitPrice: d.available ? Number(d.price) || 0 : 0,
        qty: b.qty,
        fitmentConfirmed: d.fit,
        warrantyMonths: d.warranty,
        readyInMin: d.ready,
        holdHours: d.hold,
        delivery: deliver ? { fee, etaMin: defaultEtaMin(method, r.distanceKm), courier: method === 'courier' ? COURIER : undefined } : undefined,
        note: note.trim() || undefined,
      };
    });
    respondToCustomer(r.id, inputs);
    onClose();
  };
  const decline = () => {
    passCustomer(r.id);
    onClose();
  };

  return (
    <Sheet
      visible={!!request}
      title="ගනුදෙනුකරුට පිළිතුරු දෙන්න"
      subtitle={`${buyerLabel(r)} · කි.මී. ${r.distanceKm}`}
      onClose={onClose}
      footer={
        anyAvailable ? (
          <ActionButton label={`පිළිතුර යවන්න · ${money(total)}`} icon="📨" variant="primary" disabled={!valid} onPress={submit} />
        ) : (
          <ActionButton label="තොගයේ නැත — මඟ හරින්න" icon="✕" variant="ghost" onPress={decline} />
        )
      }
    >
      {referred && (
        <View style={styles.referral}>
          <Text style={styles.referralText}>
            🤝 {e.jobRef!.garage.name} ඔබව නිර්දේශ කළා. මිල ලැයිස්තුගත මිලට වඩා වැඩි නොවිය යුතුයි; ඔවුන්ට කොමිස් {profile.referralPercent}% ලැබේ (ඔබේ මිලට එක් නොවේ), රැකියාව අවසන් වූ පසු.
          </Text>
        </View>
      )}

      <View style={styles.vehicle}>
        <Text style={styles.vehicleTitle}>
          🚗 {e.briefs[0].vehicle.name} · {e.briefs[0].vehicle.plate}
        </Text>
        <Text style={styles.sub}>
          {[e.briefs[0].vehicle.make, e.briefs[0].vehicle.model, e.briefs[0].vehicle.year].filter(Boolean).join(' ')}
          {e.briefs[0].vehicle.chassisNo ? ` · Chassis ${e.briefs[0].vehicle.chassisNo}` : ''}
          {e.briefs[0].vehicle.engineNo ? ` · Engine ${e.briefs[0].vehicle.engineNo}` : ''}
        </Text>
      </View>

      {e.briefs.map((b, i) => {
        const d = drafts[i];
        const types = typesFor(b.partType);
        const have = types.reduce((s, t) => s + (variantFor(stock, b.name, t)?.qty ?? 0), 0);
        return (
          <View key={b.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.flex1}>
                <Text style={styles.title}>
                  {b.name} ×{b.qty}
                </Text>
                <Text style={styles.sub}>
                  {b.partType === 'GarageChoice' ? 'ඕනෑම වර්ගයක්' : b.partType}
                  {b.partNo ? ` · ${b.partNo}` : ''}
                  {b.photos?.length ? ` · 📷 ${b.photos.length}` : ''}
                </Text>
                {!!b.note && <Text style={styles.sub}>“{b.note}”</Text>}
              </View>
              <Pressable style={[styles.switch, d.available && styles.switchOn]} onPress={() => set(i, { available: !d.available })} accessibilityRole="switch" accessibilityState={{ checked: d.available }} accessibilityLabel={`Have ${b.name}`}>
                <View style={[styles.knob, d.available && styles.knobOn]} />
              </Pressable>
            </View>
            <Text style={[styles.sub, have < b.qty && { color: Colors.warning }]}>
              {types.length === 0 ? 'ඔබ මෙම වර්ගය අලෙවි නොකරයි' : `ඔබගේ තොගය: ${have}${have < b.qty ? ' — ප්‍රමාණවත් නැත' : ''}`}
            </Text>

            {d.available && (
              <>
                <Text style={styles.label}>කොටස් වර්ගය</Text>
                <View style={styles.chips}>
                  {types.map((t) => (
                    <Chip key={t} label={t} on={d.type === t} onPress={() => pickType(i, t)} />
                  ))}
                </View>
                <Text style={styles.label}>ඒකකයක මිල (රු.) · වෙළඳපොළ {money(listPrice(b.name, d.type))}</Text>
                <TextInput style={styles.input} value={d.price} onChangeText={(t) => set(i, { price: t.replace(/[^0-9]/g, '') })} keyboardType="number-pad" accessibilityLabel={`Price of ${b.name}`} />
                {!!liveDeal(b.name, d.type) && <Text style={styles.sub}>🏷️ ඔබගේ දීමනාව (−{liveDeal(b.name, d.type)!.discountPercent}%) ක්‍රියාත්මකයි — මිල ස්වයංක්‍රීයව අඩු කර ඇත.</Text>}
                <Text style={styles.label}>වගකීම (මාස)</Text>
                <View style={styles.chips}>
                  {WARRANTY.map((m) => (
                    <Chip key={m} label={m ? String(m) : 'නැත'} on={d.warranty === m} onPress={() => set(i, { warranty: m })} />
                  ))}
                </View>
                <Text style={styles.label}>කවුන්ටරයේ සූදානම් වන්නේ (මිනිත්තු)</Text>
                <View style={styles.chips}>
                  {READY.map((m) => (
                    <Chip key={m} label={String(m)} on={d.ready === m} onPress={() => set(i, { ready: m })} />
                  ))}
                </View>
                <Text style={styles.label}>වෙන් කළ විට තබා ගන්නේ (පැය)</Text>
                <View style={styles.chips}>
                  {HOLD.map((h) => (
                    <Chip key={h} label={String(h)} on={d.hold === h} onPress={() => set(i, { hold: h })} />
                  ))}
                </View>
                <Pressable style={styles.checkRow} onPress={() => set(i, { fit: !d.fit })} accessibilityRole="checkbox" accessibilityState={{ checked: d.fit }}>
                  <View style={[styles.check, d.fit && styles.checkOn]}>{d.fit && <Text style={styles.checkMark}>✓</Text>}</View>
                  <Text style={[styles.sub, styles.flex1]}>වාහනයේ චැසි / එන්ජින් අංකයට මෙය ගැළපෙන බව මම තහවුරු කරමි</Text>
                </Pressable>
              </>
            )}
          </View>
        );
      })}

      {(profile.courierEnabled || profile.ownDelivery) && (
        <Pressable style={styles.checkRow} onPress={() => setDeliver(!deliver)} accessibilityRole="checkbox" accessibilityState={{ checked: deliver }}>
          <View style={[styles.check, deliver && styles.checkOn]}>{deliver && <Text style={styles.checkMark}>✓</Text>}</View>
          <Text style={[styles.sub, styles.flex1]}>
            {method === 'courier' ? `🛵 ${COURIER} මගින් බෙදාහැරීම` : '🚚 අපගේ රියදුරෙකු මගින් බෙදාහැරීම'} · රු. {fee.toLocaleString()}
          </Text>
        </Pressable>
      )}

      <Text style={styles.label}>ගනුදෙනුකරුට සටහනක් (විකල්ප)</Text>
      <TextInput style={[styles.input, styles.note]} value={note} onChangeText={setNote} multiline placeholder="උදා: සමාන වෙනත් මාදිලියක් ද තිබේ" placeholderTextColor={Colors.textMuted} />
    </Sheet>
  );
};

const Chip: React.FC<{ label: string; on: boolean; onPress: () => void }> = ({ label, on, onPress }) => (
  <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 8 },
    title: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    vehicle: { padding: 12, borderRadius: 14, backgroundColor: softFill(), gap: 2 },
    vehicleTitle: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    referral: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    referralText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary, lineHeight: 17 },
    input: { backgroundColor: softFill(), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, borderWidth: 1, borderColor: softEdge() },
    note: { minHeight: 56, textAlignVertical: 'top', fontFamily: FONTS.bodyRegular, fontSize: 12.5 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.subtleBorder, padding: 3, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.success },
    knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff' },
    knobOn: { alignSelf: 'flex-end' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
  })
);
