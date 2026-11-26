import { FlowButton } from '../FlowButton';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, INSPECTION_FEE, PhotoStrip, getThemeMode, themedStyles, VoiceNotePlayer, workshopBill } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { formatTime, money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * The garage's diagnosis: the owner ticks the lines they agree to (all, some or none).
 * Only ticked parts are ordered and only ticked lines are billed. Stopping here costs
 * the inspection fee only. With `extraId`, the same for extra work found mid-repair
 * (saying no to all of it just means the garage finishes the agreed work).
 */
export const ApprovalSheet: React.FC<{
  workshop: OwnerWorkshop | null;
  extraId?: string;
  onClose: () => void;
  /** The answer was already given: change it (the chat's edit chip on the owner's answer line). */
  change?: boolean;
}> = ({ workshop, extraId, onClose, change }) => {
  const { approveDiagnosis, decideExtra, declineDiagnosis, changeDiagnosisDecision, changeExtraDecision } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    const x = extraId ? workshop.progress.extras?.find((e) => e.id === extraId) : undefined;
    const given = x ? x.decision?.approvedLineIds : workshop.progress.decision?.approvedLineIds;
    setPicked(change && given ? given : (x ? x.lines : (workshop.progress.diagnosis?.lines ?? [])).map((l) => l.id));
    setConfirmStop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  const x = extraId ? w?.progress.extras?.find((e) => e.id === extraId) : undefined;
  const d = x ? { findings: x.reason, photos: x.photos, voiceNotes: x.voiceNotes, lines: x.lines, finishBy: 0 } : w?.progress.diagnosis;
  if (!w || !d) return null;
  // Extra work builds on what is already approved; a diagnosis on the agreed price.
  // (When changing an answer, the bill without this answer is the base.)
  const baseProgress = change && x ? { ...w.progress, extras: w.progress.extras?.map((e) => (e.id === x.id ? { ...e, decision: undefined } : e)) } : w.progress;
  const base = x ? workshopBill(w.agreedPrice, baseProgress).total : w.agreedPrice;
  // Parts the owner buys themselves (in OnMart) are paid to the shop, not added to the garage's bill.
  const extra = d.lines.filter((l) => picked.includes(l.id) && l.source !== 'owner').reduce((s, l) => s + l.price, 0);
  const total = base + extra;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Sheet
      visible={!!workshop}
      title={`${x ? 'අමතර වැඩ — ඔබගේ අනුමැතියට' : 'පරීක්ෂා වාර්තාව'}${change ? ' · වෙනස් කිරීම' : ''}`}
      subtitle={x ? `${w.garageName} · අලුත්වැඩියාව අතරතුර හමු විය` : w.garageName}
      onClose={onClose}
      noDividers
      footer={
        confirmStop ? (
          <View style={styles.footer}>
            <Text style={styles.warn}>රැකියාව නවත්වන්නද? පරීක්ෂා ගාස්තුව {money(INSPECTION_FEE)} පමණක් ගෙවා වාහනය ආපසු ගන්න.</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FlowButton label="නැත" variant="ghost" onPress={() => setConfirmStop(false)} />
              </View>
              <View style={styles.flex1}>
                <FlowButton
                  label="ඔව්, නවත්වන්න"
                  variant="danger"
                  onPress={() => {
                    declineDiagnosis(w.id);
                    onClose();
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          // One main action across the sheet, with the total on one line; saying no stands under it, apart from the thumb's first reach.
          <View style={styles.footer}>
            <FlowButton
              label={`${change ? 'වෙනස්කම් සුරකින්න' : 'අනුමත කරන්න'} · ${money(total)}`}
              icon="✓"
              variant="success"
              onPress={() => {
                if (change) {
                  if (x) changeExtraDecision(w.id, x.id, picked);
                  else changeDiagnosisDecision(w.id, picked);
                } else if (x) decideExtra(w.id, x.id, picked);
                else approveDiagnosis(w.id, picked);
                onClose();
              }}
            />
            {x || change ? (
              <FlowButton
                label={x ? 'අමතර වැඩ එපා' : 'කිසිවක් එපා'}
                variant="ghost"
                onPress={() => {
                  if (x) (change ? changeExtraDecision : decideExtra)(w.id, x.id, []);
                  else changeDiagnosisDecision(w.id, []);
                  onClose();
                }}
              />
            ) : (
              <Pressable style={styles.stopLink} onPress={() => setConfirmStop(true)} accessibilityRole="button" accessibilityLabel="Stop the job">
                <Text style={styles.stopText}>රැකියාව නවත්වන්න</Text>
              </Pressable>
            )}
          </View>
        )
      }
    >
      {/* While extra work waits, the garage goes on with what is already approved. */}
      {!!x && !change && <Text style={styles.sub}>ඔබ පිළිතුරු දෙන තුරු ගරාජය දැනටමත් අනුමත කළ වැඩ දිගටම කරයි.</Text>}

      {/* 1. What was found, and the proof of it. */}
      <View style={styles.found}>
        <Text style={styles.label}>ගරාජය සොයාගත් දේ</Text>
        <Text style={styles.findings}>{d.findings}</Text>
        {!!d.photos?.length && <PhotoStrip photos={d.photos} height={80} />}
        {d.voiceNotes?.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} />)}
        {!!d.finishBy && (
          <View style={styles.timeChip}>
            <Text style={styles.timeChipText}>⏱️ අවසන් කිරීමට {formatTime(d.finishBy)} පමණ</Text>
          </View>
        )}
      </View>

      {/* 2. The decision, with its rule right under the question, before anything is ticked. */}
      <View style={styles.choose}>
        <Text style={styles.heading}>ඔබ එකඟ වන දේ තෝරන්න</Text>
        <Text style={styles.sub}>තෝරා නොගත් දේ කිසිවක් කෙරෙන්නේ හෝ අය කෙරෙන්නේ නැත.</Text>
      </View>
      <View style={styles.lines}>
        {d.lines.map((l) => {
          const on = picked.includes(l.id);
          return (
            <Pressable key={l.id} style={[styles.line, on && styles.lineOn]} onPress={() => toggle(l.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Approve line ${l.name}`}>
              <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
              <View style={styles.flex1}>
                <View style={styles.lineTop}>
                  <Text style={[styles.lineName, styles.flex1]}>
                    {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                    {l.qty > 1 ? ` ×${l.qty}` : ''}
                  </Text>
                  <Text style={[styles.price, !on && styles.priceOff]}>{money(l.price)}</Text>
                </View>
                {l.kind === 'part' && (
                  <Text style={styles.sub}>
                    {l.partType} · {l.source === 'order' ? 'ඔබ අනුමත කළ පසු ඇණවුම් කරයි' : l.source === 'owner' ? 'ඔබ OnMart හි මිලදී ගත යුතුය — වෙළඳසැලට ගෙවන්න, ගරාජයේ බිලට නොවේ' : 'ගරාජයේ තොගයේ'}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 3. What it comes to, like a receipt: the total last and largest. */}
      <View style={styles.card}>
        <Row label={x ? 'දැනට අනුමත මුළු මුදල' : 'එකඟ වූ මිල'} value={money(base)} />
        <Row label={`තෝරාගත් අමතර (${picked.length}/${d.lines.length})`} value={money(extra)} />
        <View style={styles.rule} />
        <Row label="නව එකතුව" value={money(total)} strong />
      </View>
      <Text style={styles.sub}>වැඩ අතරතුර අමතර දෙයක් හමු වුවහොත් ගරාජය නැවත ඔබගෙන් අසයි.</Text>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.sumRow}>
    <Text style={strong ? styles.sumStrong : styles.rowLabel}>{label}</Text>
    <Text style={strong ? styles.totalValue : styles.sumValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 10 },
    footer: { gap: 8 },
    warn: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 21 },
    stopLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    stopText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    found: { gap: 8, padding: 14, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f1f2' },
    label: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    findings: { fontSize: 14.5, lineHeight: 23, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    timeChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    timeChipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    choose: { gap: 4, marginTop: 8, paddingHorizontal: 2 },
    heading: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20 },
    lines: { gap: 8 },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56, borderRadius: 22, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff' },
    lineOn: { borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: 'rgba(16, 185, 129, 0.06)' },
    lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#fff' },
    lineName: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    price: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceOff: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    card: { gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 22, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.1, shadowRadius: 14, elevation: 3 },
    rule: { height: 1.5, backgroundColor: Colors.textMuted, opacity: 0.35 },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    rowLabel: { flexShrink: 1, fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sumValue: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sumStrong: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.titleBold, color: Colors.textMain },
    totalValue: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
