import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, kitOffers, money, partCategory, shopsInRing, shopsNear, themedStyles, softEdge, softFill, type ServiceKit } from '@ongarage/shared';
import { useUserLocation } from '../../context/LocationContext';
import { useMart } from '../../context/MartContext';
import { useVehicles } from '../../context/VehiclesContext';
import { Sheet } from '../Sheet';

/** A service kit: which nearby shops have every part and what the kit costs there; then ask for each part in one go. */
export const KitSheet: React.FC<{ kit: ServiceKit | null; vehicleId: string; onClose: () => void; onSent: () => void }> = ({ kit, vehicleId, onClose, onSent }) => {
  const { coords } = useUserLocation();
  const { createEnquiry } = useMart();
  const { findVehicle } = useVehicles();
  const [shown, setShown] = React.useState<ServiceKit | null>(kit);
  React.useEffect(() => {
    if (kit) setShown(kit);
  }, [kit]);

  const offers = useMemo(() => (shown ? kitOffers(shown, shopsInRing(shopsNear(coords), 'wider')).slice(0, 6) : []), [shown, coords]);
  if (!shown) return null;
  const k = shown;
  const v = findVehicle(vehicleId);

  const ask = () => {
    k.lines.forEach((l) =>
      createEnquiry({
        brief: { name: l.name, qty: l.qty, partType: 'GarageChoice', categoryId: partCategory(l.name), vehicle: { name: v.name, plate: v.plate, type: v.type, make: v.make, model: v.model, chassisNo: v.chassisNo, engineNo: v.engineNo } },
        audience: 'shops',
        ring: 'nearby',
        validDays: 3,
      })
    );
    onSent();
    onClose();
  };

  return (
    <Sheet
      visible={!!kit}
      title={`${k.icon} ${k.name}`}
      subtitle={`${v.name} · ${v.plate} · ${k.note}`}
      onClose={onClose}
      footer={<ActionButton label={`කොටස් ${k.lines.length} ම ඉල්ලන්න`} icon="📨" variant="primary" onPress={ask} />}
    >
      <View style={styles.card}>
        {k.lines.map((l) => (
          <Text key={l.name} style={styles.line}>
            🔩 {l.name} ×{l.qty}
          </Text>
        ))}
        <Text style={styles.sub}>ඔබගේ වාහනයේ තොරතුරු සමඟ කොටස් එකක් එකක් ලෙස වෙළඳසැල්වලට ඉල්ලීම් යැවේ; පිළිතුරු “මගේ ඉල්ලීම්” හි පෙනේ.</Text>
      </View>

      <Text style={styles.label}>කට්ටලය ඇති වෙළඳසැල්</Text>
      {offers.map((o) => (
        <View key={o.shop.id} style={[styles.row, o.complete && styles.rowOk]}>
          <View style={styles.flex1}>
            <Text style={styles.name} numberOfLines={1}>
              {o.shop.name}
            </Text>
            <Text style={styles.sub}>
              ★ {o.shop.rating.toFixed(1)} · {o.shop.distanceKm < 10 ? o.shop.distanceKm.toFixed(1) : Math.round(o.shop.distanceKm)} කි.මී. · {o.have}/{o.need} තොගයේ
              {o.missing.length ? ` · නැත: ${o.missing.join(', ')}` : ''}
            </Text>
          </View>
          <Text style={[styles.total, !o.complete && { color: Colors.textMuted }]}>{o.have ? money(o.total) : '—'}</Text>
        </View>
      ))}
      <Text style={styles.sub}>මිල සජීවී තොගය පෙන්වන වෙළඳසැල්වල පෙන්වන ඒවාට පමණි; අනෙක් වෙළඳසැල් ඉල්ලීමට පිළිතුරු දෙයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 6 },
    line: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    label: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent' },
    rowOk: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    name: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    total: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.successText },
  })
);
