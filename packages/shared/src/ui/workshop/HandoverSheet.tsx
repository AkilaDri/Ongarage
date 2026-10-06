import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton } from '../Glass';
import { Sheet } from '../Sheet';
import { PhotoStrip } from '../PhotoStrip';
import { STANDARD_HANDOVER_CHECKS } from '../../marketplace/workshop';
import { money } from '../../utils/format';
import type { DiagnosisLine, HandoverReport } from '../../types';

/**
 * Ready for handover: every approved line ticked off, after-photos, old parts kept for the
 * owner to see, and the final bill. The owner then closes the job with their code.
 */
export const HandoverSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  lines: DiagnosisLine[];
  bill: { labour: number; parts: number; total: number };
  /** Check-in photos, shown as "before". */
  beforePhotos?: string[];
  samplePhotos: string[];
  /** Ordered parts haven't been checked in yet. */
  partsPending?: boolean;
  /** Anything else that must happen first (e.g. the owner still deciding on extra work). */
  blockedReason?: string;
  onSubmit: (report: HandoverReport) => void;
}> = ({ visible, onClose, overlay, lines, bill, beforePhotos = [], samplePhotos, partsPending, blockedReason, onSubmit }) => {
  const checks = [...lines.map((l) => (l.kind === 'part' ? `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''} සවි කළා` : `${l.name} කළා`)), ...STANDARD_HANDOVER_CHECKS];
  const [done, setDone] = useState<boolean[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [oldParts, setOldParts] = useState(true);
  const hasParts = lines.some((l) => l.kind === 'part');

  useEffect(() => {
    if (!visible) return;
    setDone(checks.map(() => false));
    setAfter([]);
    setOldParts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const allDone = done.length === checks.length && done.every(Boolean);
  const valid = allDone && after.length > 0 && !partsPending && !blockedReason;

  const submit = () => {
    onSubmit({ checklist: checks.map((label, i) => ({ label, done: !!done[i] })), beforePhotos, afterPhotos: after, oldPartsKept: hasParts && oldParts, bill, readyAt: Date.now() });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="භාරදීමට සූදානම්"
      subtitle="සියල්ල සම්පූර්ණ කර අයිතිකරුට පෙන්වීමට ඡායාරූප එක් කරන්න"
      onClose={onClose}
      overlay={overlay}
      footer={<ActionButton label={`භාරදීමට සූදානම් ලෙස දන්වන්න · ${money(bill.total)}`} icon="✓" variant="success" disabled={!valid} onPress={submit} />}
    >
      {!!blockedReason && <Text style={styles.warn}>⚠️ {blockedReason}</Text>}
      {partsPending && <Text style={styles.warn}>⚠️ ඇණවුම් කළ කොටස් තවම ලැබී නැත — “කොටස්” ටැබයෙන් ලැබුණු බව සලකුණු කළ පසු භාර දිය හැක.</Text>}
      <Text style={styles.label}>
        කළ වැඩ ({done.filter(Boolean).length}/{checks.length})
      </Text>
      {checks.map((c, i) => (
        <Pressable key={c} style={styles.check} onPress={() => setDone((d) => checks.map((_, j) => (j === i ? !d[j] : !!d[j])))} accessibilityLabel={`Handover check ${i + 1}`}>
          <View style={[styles.box, done[i] && styles.boxOn]}>{done[i] && <Text style={styles.tick}>✓</Text>}</View>
          <Text style={[styles.checkText, done[i] && styles.checkDone]}>{c}</Text>
        </Pressable>
      ))}

      {beforePhotos.length > 0 && (
        <>
          <Text style={styles.label}>පෙර (පැමිණි විට)</Text>
          <PhotoStrip photos={beforePhotos} height={70} />
        </>
      )}
      <Text style={styles.label}>පසු (අවසන් කළ පසු) — අවම 1ක්</Text>
      <PhotoStrip photos={after} height={70} onAdd={after.length < 6 ? () => setAfter((p) => [...p, samplePhotos[(p.length + 1) % samplePhotos.length]]) : undefined} addLabel="ඡායාරූපයක්" />

      {hasParts && (
        <Pressable style={[styles.toggle, oldParts && styles.toggleOn]} onPress={() => setOldParts((v) => !v)} accessibilityLabel="Old parts kept">
          <View style={[styles.box, oldParts && styles.boxOn]}>{oldParts && <Text style={styles.tick}>✓</Text>}</View>
          <Text style={styles.checkText}>ඉවත් කළ පැරණි කොටස් අයිතිකරුට පෙන්වීමට තබා ඇත</Text>
        </Pressable>
      )}

      <View style={styles.summary}>
        <Row label="🔧 වැඩ ගාස්තුව" value={money(bill.labour)} />
        <Row label="🔩 කොටස් (වෙනම බිල්පත)" value={money(bill.parts)} />
        <Row label="අයිතිකරු ගෙවන මුළු මුදල" value={money(bill.total)} strong />
      </View>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={strong ? styles.strong : styles.hint}>{label}</Text>
    <Text style={strong ? styles.strongValue : styles.value}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    warn: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
    boxOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    tick: { fontSize: 13, fontWeight: '900', color: '#fff' },
    checkText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    checkDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, marginTop: 4 },
    toggleOn: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    summary: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6, marginTop: 4 },
    value: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    strongValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
