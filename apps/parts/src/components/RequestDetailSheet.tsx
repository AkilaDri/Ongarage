import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, FONTS, GoogleMap, themedStyles, vehicleIcon, zoomToFit, softEdge, softShadow } from '@ongarage/shared';
import { allowedTypes, useShop } from '../context/ShopContext';
import { PART_TYPE_LABEL } from '../constants/mockData';
import { countdown, formatDate, formatTime } from '../utils/format';
import { Sheet } from './Sheet';
import { StockLine } from './StockLine';
import type { IncomingRequest } from '../types';

const MAP_H = 150;
// Stand-in for the old-part photo a garage attaches until uploads exist.
const OLD_PART_PHOTO = 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=900&q=80';

/** Everything a garage sent with a parts request, and where it goes. */
export const RequestDetailSheet: React.FC<{ request: IncomingRequest | null; onClose: () => void; onQuote: (r: IncomingRequest) => void; onPass: (r: IncomingRequest) => void }> = ({
  request: r,
  onClose,
  onQuote,
  onPass,
}) => {
  const { profile, quotes } = useShop();
  if (!r) return null;
  const types = allowedTypes(r, profile.types);
  const quoted = quotes.some((q) => q.requestId === r.id && q.status !== 'withdrawn');
  const cat = r.categoryId ? categoryInfo(r.categoryId) : undefined;
  const mid = { latitude: (profile.coords.latitude + r.garage.coords.latitude) / 2, longitude: (profile.coords.longitude + r.garage.coords.longitude) / 2 };
  const left = r.quoteUntil - Date.now();

  return (
    <Sheet
      visible={!!r}
      title={r.garage.name}
      subtitle={`★ ${r.garage.rating} · කි.මී. ${r.distanceKm} · ${cat ? cat.name : 'කොටස්'}`}
      onClose={onClose}
      footer={
        quoted ? undefined : types.length ? (
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="මඟ හරින්න" icon="✕" variant="ghost" compact onPress={() => onPass(r)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label="මිල ගණන් යවන්න" icon="📨" variant="primary" compact onPress={() => onQuote(r)} />
            </View>
          </View>
        ) : (
          <ActionButton label="මඟ හරින්න" icon="✕" variant="ghost" compact onPress={() => onPass(r)} />
        )
      }
    >
      <View style={styles.timing}>
        <Cell label="මිල ගණන් සඳහා" value={left > 0 ? countdown(left) : 'අවසන්'} color={Colors.primary} />
        <View style={styles.divider} />
        <Cell label="ලැබිය යුත්තේ" value={`${formatDate(r.needBy)} · ${formatTime(r.needBy)}`} />
        <View style={styles.divider} />
        <Cell label="වෙනත් මිල ගණන්" value={String(r.otherQuotes)} />
      </View>

      <Text style={styles.label}>ඉල්ලූ කොටස්</Text>
      <View style={styles.card}>
        <View style={styles.typeRow}>
          <Text style={styles.type}>{PART_TYPE_LABEL[r.partType]}</Text>
          {r.reconApproval === 'approved' && <Text style={[styles.type, styles.recon]}>Recon අයිතිකරු අනුමත</Text>}
        </View>
        {r.lines.map((l) => (
          <StockLine key={l.id} line={l} types={types} />
        ))}
        {types.length === 0 && <Text style={styles.warn}>ඔබ මෙම කොටස් වර්ගය අලෙවි නොකරයි.</Text>}
        {!!r.note && <Text style={styles.sub}>📝 {r.note}</Text>}
      </View>

      <Text style={styles.label}>වාහනය</Text>
      <View style={styles.card}>
        <Text style={styles.value}>
          {vehicleIcon(r.vehicle.type)} {r.vehicle.name} · {r.vehicle.type} · {r.vehicle.plate}
        </Text>
        <Text style={styles.sub}>{r.vehicle.chassis ? `චැසි / මාදිලි අංකය: ${r.vehicle.chassis}` : 'චැසි අංකය දී නැත — සැකයක් ඇත්නම් ගරාජය අමතන්න.'}</Text>
      </View>

      {r.oldPartPhoto && (
        <>
          <Text style={styles.label}>පැරණි කොටසේ ඡායාරූපය</Text>
          <Image source={{ uri: OLD_PART_PHOTO }} style={styles.photo} resizeMode="cover" />
        </>
      )}

      <Text style={styles.label}>බෙදාහැරීම</Text>
      <GoogleMap
        style={[styles.map, { height: MAP_H }]}
        center={mid}
        zoom={zoomToFit(r.distanceKm, mid.latitude, MAP_H)}
        fallbackColor={Colors.primary}
        renderOverlay={(project) => {
          const s = project(profile.coords);
          const g = project(r.garage.coords);
          return (
            <>
              {s && (
                <View style={[styles.pinAnchor, { left: s.x, top: s.y }]} pointerEvents="none">
                  <View style={styles.shopPin}>
                    <Text style={styles.pinEmoji}>🔩</Text>
                  </View>
                </View>
              )}
              {g && (
                <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                  <View style={styles.garagePin}>
                    <Text style={styles.pinEmoji}>🛠️</Text>
                  </View>
                </View>
              )}
            </>
          );
        }}
      />
      <View style={styles.garageRow}>
        <Text style={[styles.sub, styles.flex1]}>📍 {r.garage.address}</Text>
        <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${r.garage.phone}`)}>
          <Text style={styles.callText}>📞 ගරාජය</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const Cell: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.cell}>
    <Text style={styles.cellLabel}>{label}</Text>
    <Text style={[styles.cellValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    value: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    card: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 8, ...softShadow() },
    timing: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    cell: { flex: 1, alignItems: 'center', gap: 3 },
    cellLabel: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    cellValue: { fontSize: 12, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    divider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.borderColor },
    typeRow: { flexDirection: 'row', gap: 6 },
    type: { fontSize: 10, fontWeight: '800', color: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)', overflow: 'hidden' },
    recon: { color: Colors.warning, backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    photo: { height: 170, borderRadius: 14 },
    map: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    shopPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    garagePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    pinEmoji: { fontSize: 14 },
    garageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    callBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    callText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.success },
  })
);
