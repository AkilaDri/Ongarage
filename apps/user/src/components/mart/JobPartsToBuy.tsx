import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, availabilityAt, Colors, FONTS, linesOwnerBuys, martShop, money, themedStyles, softEdge, softFill, softShadow, type DiagnosisLine } from '@ongarage/shared';
import { useWorkshops } from '../../context/WorkshopContext';

export type JobPartItem = {
  workshopId: string;
  garageName: string;
  vehicleId?: string;
  line: DiagnosisLine;
  bought?: { shopName: string; amount: number };
};

/** Parts a garage told the owner to buy themselves for a booked job, and the shops it recommended. */
export const useJobPartsToBuy = (): JobPartItem[] => {
  const { workshops } = useWorkshops();
  return Object.values(workshops)
    .filter((w) => w.progress.stage !== 'closed' && w.progress.stage !== 'declined')
    .flatMap((w) => linesOwnerBuys(w.progress).map((line) => ({ workshopId: w.id, garageName: w.garageName, vehicleId: w.vehicleId, line, bought: w.partsBought?.[line.id] })));
};

/**
 * "Parts to buy for this job": what the garage approved but wants the owner to buy, with the shops it recommended.
 * Compact: a one-line prompt (used outside OnMart) that opens OnMart.
 */
export const JobPartsToBuy: React.FC<{ onBuy?: (item: JobPartItem) => void; onOpenMart?: () => void; compact?: boolean }> = ({ onBuy, onOpenMart, compact }) => {
  const items = useJobPartsToBuy();
  if (items.length === 0) return null;
  const todo = items.filter((i) => !i.bought);

  if (compact) {
    if (todo.length === 0) return null;
    return (
      <Pressable style={styles.prompt} onPress={onOpenMart} accessibilityLabel="Parts to buy for your job">
        <Text style={styles.promptText}>🛍️ ඔබගේ රැකියාවට OnMart හි මිලදී ගත යුතු කොටස් {todo.length} ක් ඇත ›</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🛍️ ඔබගේ රැකියාවට මිලදී ගත යුතු කොටස්</Text>
      <Text style={styles.sub}>ගරාජය මෙම කොටස් ඔබ මිලදී ගන්න කියා ඇත. ඔවුන් නිර්දේශ කළ වෙළඳසැල්වලින් හෝ වෙනත් වෙළඳසැලකින් මිලදී ගන්න; මුදල වෙළඳසැලට ගෙවන්න — ගරාජයේ බිලට නොවේ. භාරදීම ඔබ මිලදී ගන්නා තුරු නතර වේ.</Text>
      {items.map((i) => (
        <View key={`${i.workshopId}:${i.line.id}`} style={styles.item}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>
              🔩 {i.line.name} ×{i.line.qty} · {i.line.partType}
            </Text>
            <Text style={styles.sub}>{i.garageName}</Text>
          </View>
          {!!i.line.partNo && <Text style={styles.sub}>කොටස් අංකය: {i.line.partNo}</Text>}
          {i.bought ? (
            <Text style={styles.done}>
              ✓ {i.bought.shopName} වෙතින් මිලදී ගත්තා · {money(i.bought.amount)}
            </Text>
          ) : (
            <>
              {(i.line.recommendedShopIds ?? []).map((id) => {
                const shop = martShop(id);
                const a = shop?.liveStock ? availabilityAt(id, i.line.name, i.line.partType ?? 'GarageChoice') : undefined;
                return (
                  <Text key={id} style={styles.shop} numberOfLines={1}>
                    🤝 {shop?.name ?? id}
                    {shop ? ` · ${shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} කි.මී.` : ''}
                    {shop?.liveStock ? (a ? ` · ✓ ${money(a.price)}` : ' · තොගයේ නැත') : ''}
                  </Text>
                );
              })}
              {!!onBuy && <ActionButton label="OnMart හි ඉල්ලන්න" icon="📨" variant="primary" compact onPress={() => onBuy(i)} />}
            </>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)', ...softShadow() },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    item: { gap: 6, padding: 12, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    shop: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    done: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    prompt: { padding: 14, borderRadius: 18, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    promptText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.warning, lineHeight: 18 },
  })
);
