import React, { useEffect, useState } from 'react';
import { pickPhotos } from '../../utils/photos';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton, softEdge, softFill, softShadow } from '../Glass';
import { Sheet } from '../Sheet';
import { PhotoStrip } from '../PhotoStrip';
import { LATE_VIA_LABEL, STANDARD_HANDOVER_CHECKS, billWithLate } from '../../marketplace/workshop';
import { fluidFromSub, kindFromSub } from '../../marketplace/service';
import { ServiceRecordFields, emptyServiceForm, toServiceDetails, type ServiceFormValue } from './ServiceRecordFields';
import { money } from '../../utils/format';
import type { DiagnosisLine, HandoverReport, LateLine } from '../../types';

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
  /** Ordered parts haven't been checked in yet. */
  partsPending?: boolean;
  /** Anything else that must happen first (e.g. the owner still deciding on extra work). */
  blockedReason?: string;
  onSubmit: (report: HandoverReport) => void;
  /**
   * A routine service (the Service category): the form also asks for what was done, the mileage and the next service. The
   * booked sub-service picks the starting answers; the last mileage on record is the starting reading.
   */
  serviceForm?: { subService?: string; lastMileageKm?: number };
}> = ({ visible, onClose, overlay, lines, bill, beforePhotos = [], partsPending, blockedReason, onSubmit, serviceForm }) => {
  const checks = [...lines.map((l) => (l.kind === 'part' ? `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''} සවි කළා` : `${l.name} කළා`)), ...STANDARD_HANDOVER_CHECKS];
  const [done, setDone] = useState<boolean[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [oldParts, setOldParts] = useState(true);
  const hasParts = lines.some((l) => l.kind === 'part');
  const [svc, setSvc] = useState<ServiceFormValue>(() => emptyServiceForm());
  // Extra work or parts added now, not approved in the app (agreed by phone / in person, or a part bought outside): they join the bill and the owner confirms them with the close code.
  const [addMore, setAddMore] = useState(false);
  const [late, setLate] = useState<LateLine[]>([]);
  const [draft, setDraft] = useState<{ kind: 'labour' | 'part'; name: string; price: string; via: LateLine['via']; receipt: string[] }>({ kind: 'labour', name: '', price: '', via: 'phone', receipt: [] });
  const draftOk = draft.name.trim().length > 1 && Number(draft.price) > 0;
  const addLate = () => {
    if (!draftOk) return;
    setLate((l) => [...l, { id: 'late-' + Date.now() + '-' + l.length, kind: draft.kind, name: draft.name.trim(), qty: 1, price: Math.round(Number(draft.price)), via: draft.via, receipt: draft.receipt.length ? draft.receipt : undefined, source: draft.kind === 'part' ? 'stock' : undefined }]);
    setDraft((d) => ({ ...d, name: '', price: '', receipt: [] }));
  };
  const finalBill = billWithLate(bill, addMore ? late : []);

  useEffect(() => {
    if (!visible) return;
    setDone(checks.map(() => false));
    setAfter([]);
    setOldParts(true);
    setAddMore(false);
    setLate([]);
    if (serviceForm) setSvc(emptyServiceForm(kindFromSub(serviceForm.subService), fluidFromSub(serviceForm.subService), serviceForm.lastMileageKm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const allDone = done.length === checks.length && done.every(Boolean);
  const serviceDone = !serviceForm || !!toServiceDetails(svc);
  // A simple job needs nothing but the bill: the checklist and the photos are for the garage that wants them.
  const valid = !partsPending && !blockedReason && serviceDone && (!addMore || late.length > 0);

  const submit = () => {
    onSubmit({ service: serviceForm ? toServiceDetails(svc) : undefined, checklist: checks.map((label, i) => ({ label, done: !!done[i] })), beforePhotos, afterPhotos: after, oldPartsKept: hasParts && oldParts, lateLines: addMore && late.length ? late : undefined, bill: finalBill, readyAt: Date.now() });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="වැඩ අවසන් කරන්න"
      subtitle="අමතර දෙයක් තිබේ නම් එකතු කරන්න; ඉන්පසු බිල්පත සකස් වේ"
      onClose={onClose}
      overlay={overlay}
      footer={<ActionButton label={`වැඩ අවසන් · බිල්පත සකස් කරන්න · ${money(finalBill.total)}`} icon="✓" variant="success" disabled={!valid} onPress={submit} />}
    >
      {!!blockedReason && <Text style={styles.warn}>⚠️ {blockedReason}</Text>}
      {serviceForm && <ServiceRecordFields value={svc} onChange={setSvc} />}
      {serviceForm && !serviceDone && <Text style={styles.warn}>⚠️ සේවා වාර්තාව සඳහා වාහනයේ මීටර් කියවීම (km) ඇතුළත් කරන්න.</Text>}
      {partsPending && <Text style={styles.warn}>⚠️ ඇණවුම් කළ කොටස් තවම ලැබී නැත — “Parts” ටැබයෙන් ලැබුණු බව සලකුණු කළ පසු භාර දිය හැක.</Text>}
      <Text style={styles.label}>
        කළ වැඩ — අවශ්‍ය නම් ලකුණු කරන්න ({done.filter(Boolean).length}/{checks.length})
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
      <Text style={styles.label}>පසු (අවසන් කළ පසු) — අවශ්‍ය නම්</Text>
      <PhotoStrip photos={after} height={70} onAdd={after.length < 6 ? () => void pickPhotos(6 - after.length).then((ph) => ph.length && setAfter((p) => [...p, ...ph])) : undefined} addLabel="ඡායාරූපයක්" />

      <Text style={styles.label}>අමතර වැඩක් හෝ කොටසක් එකතු කළාද?</Text>
      <Text style={styles.hint}>ඇප් එකෙන් අනුමැතිය නොගෙන කළ වැඩ, පිටින් ගත් කොටස් මෙතැනින් එකතු කරන්න. ඒවා අවසන් බිල්පතට ඇතුළත් වී, අයිතිකරු කේතයෙන් අවසන් කරන විට දකියි.</Text>
      <View style={styles.pickRow}>
        <Pressable style={[styles.pick, !addMore && styles.pickOn]} onPress={() => setAddMore(false)} accessibilityLabel="No extra work added">
          <Text style={[styles.pickText, !addMore && styles.pickTextOn]}>නැහැ</Text>
        </Pressable>
        <Pressable style={[styles.pick, addMore && styles.pickOn]} onPress={() => setAddMore(true)} accessibilityLabel="Add extra work or parts">
          <Text style={[styles.pickText, addMore && styles.pickTextOn]}>ඔව්, එකතු කරන්න</Text>
        </Pressable>
      </View>
      {addMore && (
        <View style={styles.lateBox}>
          {late.map((l) => (
            <View key={l.id} style={styles.lateLine}>
              <View style={styles.lateInfo}>
                <Text style={styles.checkText}>
                  {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                </Text>
                <Text style={styles.hint}>
                  {LATE_VIA_LABEL[l.via]}
                  {l.receipt?.length ? ' · රිසිට් පත සමඟ' : ''}
                </Text>
              </View>
              <Text style={styles.value}>{money(l.price)}</Text>
              <Pressable onPress={() => setLate((x) => x.filter((y) => y.id !== l.id))} hitSlop={8} accessibilityLabel={'Remove ' + l.name}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.pickRow}>
            {(['labour', 'part'] as const).map((k) => (
              <Pressable key={k} style={[styles.pick, draft.kind === k && styles.pickOn]} onPress={() => setDraft((d) => ({ ...d, kind: k }))} accessibilityLabel={k === 'part' ? 'A part' : 'A job'}>
                <Text style={[styles.pickText, draft.kind === k && styles.pickTextOn]}>{k === 'part' ? '🔩 කොටසක්' : '🔧 වැඩක්'}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} placeholder={draft.kind === 'part' ? 'කොටසේ නම' : 'කළ වැඩේ'} placeholderTextColor={Colors.textMuted} accessibilityLabel="Extra item name" />
          <TextInput style={styles.input} value={draft.price} onChangeText={(price) => setDraft((d) => ({ ...d, price: price.replace(/[^0-9]/g, '') }))} placeholder="මිල (LKR)" keyboardType="number-pad" placeholderTextColor={Colors.textMuted} accessibilityLabel="Extra item price" />
          <Text style={styles.hint}>අයිතිකරු එකඟ වුණේ කොහොමද?</Text>
          <View style={styles.pickRow}>
            {(['phone', 'inPerson', 'other'] as const).map((v) => (
              <Pressable key={v} style={[styles.pick, draft.via === v && styles.pickOn]} onPress={() => setDraft((d) => ({ ...d, via: v }))} accessibilityLabel={LATE_VIA_LABEL[v]}>
                <Text style={[styles.pickText, draft.via === v && styles.pickTextOn]} numberOfLines={1}>
                  {v === 'phone' ? '📞 දුරකථනයෙන්' : v === 'inPerson' ? '🤝 මුහුණට මුහුණ' : 'වෙනත්'}
                </Text>
              </Pressable>
            ))}
          </View>
          {draft.kind === 'part' && (
            <>
              <Text style={styles.hint}>පිටින් ගත් කොටසක් නම් රිසිට් පත (අවශ්‍ය නම්)</Text>
              <PhotoStrip photos={draft.receipt} height={56} onAdd={draft.receipt.length < 2 ? () => void pickPhotos(2 - draft.receipt.length).then((ph) => ph.length && setDraft((d) => ({ ...d, receipt: [...d.receipt, ...ph] }))) : undefined} addLabel="රිසිට් පත" />
            </>
          )}
          <ActionButton label="＋ බිල්පතට එකතු කරන්න" variant="primary" compact disabled={!draftOk} onPress={addLate} />
          {late.length === 0 && <Text style={styles.warn}>⚠️ ඔව් තෝරා ඇත — අඩුම තරමින් එක් දෙයක් එකතු කරන්න, නැත්නම් “නැහැ” තෝරන්න.</Text>}
        </View>
      )}

      {hasParts && (
        <Pressable style={[styles.toggle, oldParts && styles.toggleOn]} onPress={() => setOldParts((v) => !v)} accessibilityLabel="Old parts kept">
          <View style={[styles.box, oldParts && styles.boxOn]}>{oldParts && <Text style={styles.tick}>✓</Text>}</View>
          <Text style={styles.checkText}>ඉවත් කළ පැරණි කොටස් අයිතිකරුට පෙන්වීමට තබා ඇත</Text>
        </Pressable>
      )}

      <View style={styles.summary}>
        <Row label="🔧 වැඩ ගාස්තුව" value={money(finalBill.labour)} />
        <Row label="🔩 කොටස් (වෙනම බිල්පත)" value={money(finalBill.parts)} />
        <Row label="අයිතිකරු ගෙවන මුළු මුදල" value={money(finalBill.total)} strong />
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
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    warn: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    boxOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    tick: { fontSize: 13, fontWeight: '900', color: '#fff' },
    checkText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    checkDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, marginTop: 4, ...softShadow() },
    toggleOn: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    pickRow: { flexDirection: 'row', gap: 8 },
    pick: { flex: 1, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: softFill() },
    pickOn: { backgroundColor: Colors.primary },
    pickText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    pickTextOn: { color: '#ffffff' },
    lateBox: { padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, gap: 10, ...softShadow() },
    lateLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    lateInfo: { flex: 1 },
    remove: { fontSize: 14, color: Colors.errorText, fontFamily: FONTS.bodyBold, paddingHorizontal: 4 },
    input: { height: 42, borderRadius: 12, paddingHorizontal: 12, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, backgroundColor: softFill() },
    summary: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 6, marginTop: 4, ...softShadow() },
    value: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    strongValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
