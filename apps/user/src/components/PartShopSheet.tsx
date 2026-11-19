import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, MART_SHOPS, availabilityAt, canonicalPartName, shopsNear, themedStyles, type LatLng, type ShopListing } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { money } from '../utils/format';
import { useMart } from '../context/MartContext';

/** What the owner ordered for the technician: enough for the SOS flow to carry on (the bill, the waiting time). */
export type PartOrder = { shopId: string; shopName: string; mode: 'delivery' | 'pickup'; unit: number; fee: number; total: number; etaMin: number };

const round50 = (n: number) => Math.round(n / 50) * 50;
/** Minutes until the part is in the technician's hands: preparing it, then the road (a courier rides about 3.5 min per km in town; the owner walks to the counter and back). */
const etaFor = (mode: 'delivery' | 'pickup', km: number) => (mode === 'delivery' ? 10 + Math.round(km * 3.5) : 5 + Math.round(km * 6));
/** The delivery charge: a courier by distance, the shop's own driver a flat fee, the counter nothing. */
const feeFor = (mode: 'delivery' | 'pickup', s: ShopListing) => (mode === 'pickup' ? 0 : s.courier ? round50(250 + s.distanceKm * 80) : 200);

/**
 * The part the technician is waiting for, ordered without leaving the SOS job: the shops that show it in stock near the breakdown, the quickest first, either
 * brought to the breakdown (a courier or the shop's driver) or fetched by the owner from the counter. The price and the delivery charge are shown before the
 * button, which names the total. A part no shop shows in stock falls back to asking in OnMart.
 */
export const PartShopSheet: React.FC<{
  visible: boolean;
  partName: string;
  coords: LatLng;
  vehicle: { name: string; plate: string; type: string; make?: string; model?: string };
  onClose: () => void;
  onOrder: (o: PartOrder) => void;
  /** Opens the owner's requests in OnMart (where the answers arrive). */
  onAsk: () => void;
  /** The owner asked shops / the wall: the job card can say so. */
  onAsked?: () => void;
}> = ({ visible, partName, coords, vehicle, onClose, onOrder, onAsk, onAsked }) => {
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const { createEnquiry } = useMart();
  const [sent, setSent] = useState<'shops' | 'wall' | null>(null);
  const stockName = canonicalPartName(partName) ?? partName;
  const rows = useMemo(() => {
    const list = shopsNear(coords, MART_SHOPS).filter((s) => s.isOpen);
    return list
      .map((s) => ({ shop: s, line: availabilityAt(s.id, stockName) }))
      .filter((r): r is { shop: ShopListing; line: NonNullable<ReturnType<typeof availabilityAt>> } => !!r.line)
      .filter((r) => (mode === 'delivery' ? r.shop.courier || r.shop.ownDelivery : r.shop.counterPickup))
      .map((r) => ({ ...r, eta: etaFor(mode, r.shop.distanceKm), fee: feeFor(mode, r.shop) }))
      .sort((a, b) => a.eta - b.eta);
  }, [coords, stockName, mode]);

  const ask = (audience: 'shops' | 'wall') => {
    createEnquiry({
      brief: { name: stockName, qty: 1, partType: 'GarageChoice', vehicle: { name: vehicle.name, plate: vehicle.plate, type: vehicle.type, make: vehicle.make, model: vehicle.model } },
      audience,
      ring: audience === 'wall' ? 'nationwide' : 'nearby',
      validDays: 1,
    });
    setSent(audience);
    onAsked?.();
  };

  if (sent)
    return (
      <Sheet visible={visible} title="ඉල්ලීම යැව්වා" subtitle={partName} onClose={() => { setSent(null); onClose(); }}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{sent === 'wall' ? 'රට පුරා විවෘත පුවරුවට දැමුවා' : 'ළඟ වෙළඳසැල් වෙත යැව්වා'}</Text>
          <Text style={styles.emptySub}>වෙළඳසැල් පිළිතුරු දෙන විට OnMart හි “මගේ ඉල්ලීම්” හි පෙනේ. කාර්මිකයා දැනට රැඳී සිටී.</Text>
          <Pressable style={styles.askBtn} onPress={() => { setSent(null); onAsk(); }} accessibilityRole="button" accessibilityLabel="See the answers in OnMart">
            <Text style={styles.askBtnText}>OnMart හි පිළිතුරු බලන්න</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => { setSent(null); onClose(); }} accessibilityRole="button">
            <Text style={styles.linkBtnText}>අලුත්වැඩියාව වෙත ආපසු</Text>
          </Pressable>
        </View>
      </Sheet>
    );

  return (
    <Sheet visible={visible} title={partName} subtitle="කාර්මිකයා මෙම කොටස සඳහා රැඳී සිටී" onClose={onClose}>
      <View style={styles.modes} accessibilityRole="tablist">
        {(['delivery', 'pickup'] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable key={m} style={[styles.mode, on && styles.modeOn]} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={m === 'delivery' ? 'Bring it to the breakdown' : 'I will fetch it'}>
              <Text style={[styles.modeText, on && styles.modeTextOn]}>{m === 'delivery' ? '🛵 ගෙන එන්න' : '🏪 මමම යන්නම්'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{mode === 'delivery' ? 'කොටස බිඳවැටුණු ස්ථානයටම ගෙන එයි.' : 'ඔබ වෙළඳසැලට ගොස් ඒමට කාර්මිකයා රැඳී සිටී.'}</Text>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{mode === 'delivery' ? 'ගෙන ඒමට හැකි තොගයක් නැත' : 'ළඟ තොගයක් නැත'}</Text>
          <Text style={styles.emptySub}>
            {mode === 'delivery' ? '“මමම යන්නම්” බලන්න, හෝ වෙළඳසැල් වෙතින් විමසන්න.' : '“ගෙන එන්න” බලන්න, හෝ වෙළඳසැල් වෙතින් විමසන්න.'}
          </Text>
        </View>
      ) : (
        rows.map(({ shop, line, eta, fee }) => (
          <View key={shop.id} style={styles.card}>
            <View style={styles.head}>
              <View style={styles.flex1}>
                <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                <Text style={styles.shopSub} numberOfLines={1}>
                  ★ {shop.rating.toFixed(1)} · {shop.distanceKm} km · {line.lowStock ? 'අවසන් ඒවා' : 'තොගයේ ඇත'}
                </Text>
              </View>
              <Text style={styles.eta}>මිනි. {eta}</Text>
            </View>
            <View style={styles.sum}>
              <View style={styles.sumLine}>
                <Text style={styles.sumLabel}>{line.brand ? `${stockName} · ${line.brand}` : stockName}</Text>
                <Text style={styles.sumFig}>{money(line.price)}</Text>
              </View>
              <View style={styles.sumLine}>
                <Text style={styles.sumLabel}>{mode === 'delivery' ? 'ගෙන ඒමේ ගාස්තුව' : 'කවුන්ටරයෙන් ගැනීම'}</Text>
                <Text style={styles.sumFig}>{fee ? `+ ${money(fee)}` : 'නොමිලේ'}</Text>
              </View>
            </View>
            <Pressable
              style={styles.order}
              onPress={() => onOrder({ shopId: shop.id, shopName: shop.name, mode, unit: line.price, fee, total: line.price + fee, etaMin: eta })}
              accessibilityRole="button"
              accessibilityLabel={`Order from ${shop.name}`}
            >
              <Text style={styles.orderText}>ඇණවුම් කරන්න · {money(line.price + fee)}</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.askBlock}>
        <Text style={styles.askTitle}>{rows.length === 0 ? 'තොගය විමසන්න' : 'මෙයින් නැත්නම්, වෙනත් වෙළඳසැල් වෙතින් විමසන්න'}</Text>
        <Pressable style={styles.askBtn} onPress={() => ask('shops')} accessibilityRole="button" accessibilityLabel="Ask the nearby shops">
          <Text style={styles.askBtnText}>🏪 ළඟ වෙළඳසැල් වෙතින් විමසන්න</Text>
        </Pressable>
        <Pressable style={styles.askBtn} onPress={() => ask('wall')} accessibilityRole="button" accessibilityLabel="Post it on the open wall">
          <Text style={styles.askBtnText}>📣 රට පුරා පුවරුවට දමන්න</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    modes: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    mode: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill, borderWidth: 1.5, borderColor: 'transparent' },
    modeOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    modeText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    modeTextOn: { color: '#ffffff' },
    hint: { fontSize: 13, lineHeight: 19, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginBottom: 10, paddingHorizontal: 4 },
    card: { backgroundColor: Colors.bgCard, borderRadius: 22, borderWidth: 1, borderColor: '#f3f4f6', padding: 14, gap: 10, marginBottom: 10 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    shopName: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    shopSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    eta: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.success },
    sum: { gap: 4 },
    sumLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
    sumLabel: { flexShrink: 1, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sumFig: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    order: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a8a', borderWidth: 2, borderColor: '#facc15' },
    orderText: { fontSize: 14.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    empty: { alignItems: 'center', gap: 6, paddingVertical: 16 },
    emptyTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    emptySub: { fontSize: 13, lineHeight: 19, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    askBlock: { gap: 8, marginTop: 6, alignItems: 'stretch' },
    askTitle: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingHorizontal: 4 },
    linkBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
    linkBtnText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    askBtn: { height: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#e8edf8' },
    askBtnText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
  })
);
