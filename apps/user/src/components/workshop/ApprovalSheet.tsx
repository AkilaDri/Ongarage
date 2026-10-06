import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, INSPECTION_FEE, PhotoStrip, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { formatTime, money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * The garage's diagnosis: the owner ticks the lines they agree to (all, some or none).
 * Only ticked parts are ordered and only ticked lines are billed. Stopping here costs
 * the inspection fee only.
 */
export const ApprovalSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { approveDiagnosis, declineDiagnosis } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    if (workshop.id !== shown?.id || !picked.length) setPicked(workshop.progress.diagnosis?.lines.map((l) => l.id) ?? []);
    setConfirmStop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  const d = w?.progress.diagnosis;
  if (!w || !d) return null;
  const extra = d.lines.filter((l) => picked.includes(l.id)).reduce((s, l) => s + l.price, 0);
  const total = w.agreedPrice + extra;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Sheet
      visible={!!workshop}
      title="පරීක්ෂා වාර්තාව"
      subtitle={`${w.garageName} · අවසන් කිරීමට ${formatTime(d.finishBy)} පමණ`}
      onClose={onClose}
      footer={
        confirmStop ? (
          <View style={styles.footer}>
            <Text style={styles.warn}>රැකියාව නවත්වන්නද? පරීක්ෂා ගාස්තුව {money(INSPECTION_FEE)} පමණක් ගෙවා වාහනය ආපසු ගන්න.</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <ActionButton label="නැත" variant="ghost" compact onPress={() => setConfirmStop(false)} />
              </View>
              <View style={styles.flex1}>
                <ActionButton
                  label="ඔව්, නවත්වන්න"
                  variant="sos"
                  compact
                  onPress={() => {
                    declineDiagnosis(w.id);
                    onClose();
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="නවත්වන්න" variant="ghost" compact onPress={() => setConfirmStop(true)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton
                label={`අනුමත කරන්න · ${money(total)}`}
                icon="✓"
                variant="success"
                compact
                onPress={() => {
                  approveDiagnosis(w.id, picked);
                  onClose();
                }}
              />
            </View>
          </View>
        )
      }
    >
      <View style={styles.box}>
        <Text style={styles.label}>ගරාජය සොයාගත් දේ</Text>
        <Text style={styles.text}>{d.findings}</Text>
        {!!d.photos?.length && <PhotoStrip photos={d.photos} height={80} />}
      </View>

      <Text style={styles.label}>ඔබ එකඟ වන දේ තෝරන්න</Text>
      {d.lines.map((l) => {
        const on = picked.includes(l.id);
        return (
          <Pressable key={l.id} style={[styles.line, on && styles.lineOn]} onPress={() => toggle(l.id)} accessibilityLabel={`Approve line ${l.name}`}>
            <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
            <View style={styles.flex1}>
              <Text style={styles.lineName}>
                {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                {l.qty > 1 ? ` ×${l.qty}` : ''}
              </Text>
              {l.kind === 'part' && (
                <Text style={styles.sub}>
                  {l.partType} · {l.source === 'order' ? 'ඔබ අනුමත කළ පසු ඇණවුම් කරයි' : 'ගරාජයේ තොගයේ'}
                </Text>
              )}
            </View>
            <Text style={[styles.price, !on && styles.priceOff]}>{money(l.price)}</Text>
          </Pressable>
        );
      })}

      <View style={styles.box}>
        <Row label="එකඟ වූ මිල" value={money(w.agreedPrice)} />
        <Row label={`තෝරාගත් අමතර (${picked.length}/${d.lines.length})`} value={money(extra)} />
        <Row label="නව එකතුව" value={money(total)} strong />
      </View>
      <Text style={styles.sub}>තෝරා නොගත් දේ කිසිවක් කෙරෙන්නේ හෝ අය කෙරෙන්නේ නැත. වැඩ අතරතුර අමතර දෙයක් හමු වුවහොත් ගරාජය නැවත ඔබගෙන් අසයි.</Text>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.sumRow}>
    <Text style={strong ? styles.sumStrong : styles.text}>{label}</Text>
    <Text style={strong ? styles.totalValue : styles.sumValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', gap: 8 },
    footer: { gap: 8 },
    warn: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 18 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    lineOn: { borderColor: 'rgba(16, 185, 129, 0.5)', backgroundColor: 'rgba(16, 185, 129, 0.06)' },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#fff' },
    lineName: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceOff: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sumValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sumStrong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    totalValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
