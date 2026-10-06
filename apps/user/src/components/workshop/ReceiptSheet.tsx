import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { approvedLines, categoryInfo, Colors, FONTS, themedStyles, workshopBill } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import type { OwnerWorkshop } from '../../context/WorkshopContext';
import { formatDate, formatTime, money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * The receipt of a job closed with the owner's code: labour and parts billed separately,
 * line by line, with the warranty it carries. (A backend would issue and store it.)
 */
export const ReceiptSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { findVehicle } = useVehicles();
  const [shown, setShown] = useState(workshop);
  useEffect(() => {
    if (workshop) setShown(workshop);
  }, [workshop]);

  const w = workshop ?? shown;
  if (!w) return null;
  const p = w.progress;
  const lines = approvedLines(p);
  const labourLines = lines.filter((l) => l.kind === 'labour');
  const partLines = lines.filter((l) => l.kind === 'part');
  const bill = p.handover?.bill ?? workshopBill(w.agreedPrice, p);
  const v = w.vehicleId ? findVehicle(w.vehicleId) : undefined;
  const title = w.title ?? categoryInfo(w.categoryId).name;

  return (
    <Sheet visible={!!workshop} title="රිසිට්පත" subtitle={w.receiptNo ?? ''} onClose={onClose}>
      <View style={styles.paper}>
        <Text style={styles.garage}>{w.garageName}</Text>
        <Text style={styles.sub}>
          {title}
          {v ? ` · ${v.name} ${v.plate}` : ''}
        </Text>
        {!!p.closedAt && (
          <Text style={styles.sub}>
            {formatDate(p.closedAt)} · {formatTime(p.closedAt)}
            {w.technician ? ` · 🧑‍🔧 ${w.technician}` : ''}
          </Text>
        )}
        <View style={styles.rule} />

        <Text style={styles.section}>🔧 වැඩ ගාස්තුව</Text>
        <Row label="එකඟ වූ මිල" value={money(w.agreedPrice)} />
        {labourLines.map((l) => (
          <Row key={l.id} label={l.name} value={money(l.price)} />
        ))}
        <Row label="උප එකතුව" value={money(bill.labour)} strong />

        <Text style={styles.section}>🔩 කොටස් (වෙනම බිල්පත)</Text>
        {partLines.length ? (
          partLines.map((l) => <Row key={l.id} label={`${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''} · ${l.partType}`} value={money(l.price)} />)
        ) : (
          <Text style={styles.sub}>කොටස් නැත</Text>
        )}
        <Row label="උප එකතුව" value={money(bill.parts)} strong />
        <View style={styles.rule} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>ගෙවූ මුළු මුදල</Text>
          <Text style={styles.total}>{money(bill.total)}</Text>
        </View>
        <View style={styles.rule} />
        <Text style={styles.ok}>✓ ඔබගේ කේතයෙන් තහවුරු කළා — OnGarage වාර්තාවේ සටහන් විය</Text>
        {!!p.warrantyUntil && (
          <Text style={styles.sub}>
            🛡️ මාස {w.warrantyMonths} වගකීම · {formatDate(p.warrantyUntil)} දක්වා{p.warrantyUntil < Date.now() ? ' (අවසන්)' : ''}
          </Text>
        )}
        {(p.recon ?? []).some((r) => r.status === 'approved') && <Text style={styles.sub}>♻️ ඔබගේ අවසරයෙන් Recon කොටස් යෙදුවා.</Text>}
      </View>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && styles.strong]} numberOfLines={1}>
      {label}
    </Text>
    <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    paper: { padding: 16, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 5 },
    garage: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    rule: { height: 1, backgroundColor: Colors.borderColor, marginVertical: 6 },
    section: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    rowLabel: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    rowValue: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    total: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.success },
    ok: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
  })
);
