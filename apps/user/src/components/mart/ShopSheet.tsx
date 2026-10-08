import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, categoryInfo, MART_STOCK, money, ShopCard, shopServiceScore, themedStyles, softEdge, softFill, type ShopListing } from '@ongarage/shared';
import { Sheet } from '../Sheet';

/** One parts shop: who it is, how it performs, how to reach it, and what it shows in stock. */
export const ShopSheet: React.FC<{ shop: ShopListing | null; onClose: () => void; onAsk: (shop: ShopListing) => void }> = ({ shop, onClose, onAsk }) => {
  const [shown, setShown] = React.useState<ShopListing | null>(shop);
  React.useEffect(() => {
    if (shop) setShown(shop);
  }, [shop]);
  if (!shown) return null;
  const s = shown;
  const stock = (MART_STOCK[s.id] ?? []).filter((l) => l.qty > 0);
  const delivery = [s.courier && '🛵 PickMe Flash', s.ownDelivery && '🚚 වෙළඳසැලේ රියදුරු', s.counterPickup && '🏪 කවුන්ටරයෙන් එකතු කිරීම'].filter(Boolean).join(' · ');

  return (
    <Sheet visible={!!shop} title={s.name} subtitle={`${s.district} · ${s.address}`} onClose={onClose} footer={<ActionButton label="මෙම වෙළඳසැලෙන් කොටසක් ඉල්ලන්න" icon="📨" variant="primary" onPress={() => onAsk(s)} />}>
      <ShopCard shop={s} />

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call shop">
          <Text style={styles.actionText}>📞 {s.phone}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${s.coords.latitude},${s.coords.longitude}`)} accessibilityLabel="Directions to shop">
          <Text style={styles.actionText}>🧭 මාර්ගය</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Info icon="🕗" label="විවෘත වේලාවන්" value={s.openHours} />
        <Info icon="🚚" label="ලබා ගැනීම" value={delivery || 'කවුන්ටරයෙන් පමණි'} />
        <Info icon="🧰" label="අලෙවි කරන වර්ග" value={s.types.join(', ')} />
        <Info icon="🔧" label="කොටස් ඇති සේවා වර්ග" value={s.categories.map((c) => categoryInfo(c).name).join(', ')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>වෙළඳසැලේ ක්‍රියාකාරීත්වය</Text>
        <Info icon="⏱️" label="සාමාන්‍ය ප්‍රතිචාර වේලාව" value={`මිනිත්තු ${s.stats.avgResponseMin}`} />
        <Info icon="📦" label="තොග නිරවද්‍යතාව" value={`${Math.round(s.stats.stockAccuracy * 100)}% (තිබෙන බව කී විට සැබවින්ම තිබූ ප්‍රමාණය)`} />
        <Info icon="✅" label="සේවා ලකුණු" value={`${shopServiceScore(s.stats).toFixed(1)} / 5 · ඇණවුම් ${s.stats.ordersDone}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{s.liveStock ? 'සජීවී තොගය' : 'තොගය'}</Text>
        {s.liveStock ? (
          stock.length === 0 ? (
            <Text style={styles.sub}>දැනට තොග පෙන්වා නැත.</Text>
          ) : (
            stock.slice(0, 12).map((l) => (
              <View key={`${l.name}-${l.partType}`} style={styles.stockRow}>
                <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
                  {l.name} · {l.partType}
                  {l.brand ? ` · ${l.brand}` : ''}
                </Text>
                <Text style={styles.price}>{money(l.price)}</Text>
                <Text style={[styles.sub, l.qty <= 2 && { color: Colors.warning }]}>×{l.qty}</Text>
              </View>
            ))
          )
        ) : (
          <Text style={styles.sub}>මෙම වෙළඳසැල සජීවී තොගය පෙන්වන්නේ නැත — කොටසක් තිබේදැයි වෙළඳසැලෙන් අසන්න.</Text>
        )}
      </View>
    </Sheet>
  );
};

const Info: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.flex1}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    actions: { flexDirection: 'row', gap: 8 },
    action: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: softFill() },
    actionText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 10 },
    title: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoIcon: { fontSize: 16, width: 22, textAlign: 'center' },
    infoValue: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    price: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.successText },
  })
);
