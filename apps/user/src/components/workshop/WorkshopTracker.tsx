import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Colors,
  FONTS,
  INSPECTION_FEE,
  PhotoStrip,
  StepProgress,
  themedStyles,
  WORKSHOP_STEP_LABELS,
  workshopBill,
  workshopStepIndex,
  type WorkshopStage,
} from '@ongarage/shared';
import { useWorkshops } from '../../context/WorkshopContext';
import { formatDate, money } from '../../utils/format';
import { ApprovalSheet } from './ApprovalSheet';
import { HandoverSheet } from './HandoverSheet';
import { ProblemSheet, TOPIC_LABEL } from './ProblemSheet';
import { WarrantySheet } from './WarrantySheet';

/** The workshop steps as the owner reads them. */
const OWNER_STAGE_TEXT: Record<WorkshopStage, string> = {
  booked: 'වෙන් කළ වේලාව බලාපොරොත්තුවෙන්',
  received: 'ගරාජයට වාහනය ලැබුණා',
  diagnosing: 'ගරාජය වාහනය පරීක්ෂා කරමින්',
  awaitingApproval: 'පරීක්ෂා වාර්තාව ඔබගේ අනුමැතියට',
  repairing: 'අලුත්වැඩියා කරමින්',
  readyForHandover: 'භාරගැනීමට සූදානම්',
  closed: 'අවසන් — වගකීම ක්‍රියාත්මකයි',
  declined: 'ඔබ රැකියාව නැවැත්වූවා',
  disputed: 'ඔබ වාර්තා කළ ගැටලුව',
};

type SheetId = 'approve' | 'handover' | 'problem' | 'warranty' | null;

/**
 * Where a booked repair is, and what the owner does next: approve the diagnosis, collect
 * the vehicle with their code, report a problem, claim the warranty. `detailed` adds the
 * record (diagnosis lines, bill, photos) for the details view.
 */
export const WorkshopTracker: React.FC<{ id: string; detailed?: boolean }> = ({ id, detailed }) => {
  const { workshops, escalate } = useWorkshops();
  const [sheet, setSheet] = useState<SheetId>(null);
  const w = workshops[id];
  if (!w) return null;
  const p = w.progress;
  const alert = p.stage === 'awaitingApproval' || p.stage === 'readyForHandover';
  const d = p.dispute;
  const inWarranty = p.stage === 'closed' && !!p.warrantyUntil && p.warrantyUntil > Date.now();
  const claim = p.warrantyClaim;
  const bill = p.handover?.bill ?? (p.decision ? workshopBill(w.agreedPrice, p) : null);
  const close = () => setSheet(null);

  const action = () => {
    switch (p.stage) {
      case 'awaitingApproval':
        return <ActionButton label="වාර්තාව බලා අනුමත කරන්න" icon="🔍" variant="primary" compact onPress={() => setSheet('approve')} />;
      case 'readyForHandover':
        return (
          <>
            <ActionButton label="භාරගන්න · කේතය පෙන්වන්න" icon="🔑" variant="success" compact onPress={() => setSheet('handover')} />
            {d?.status === 'rework' && (
              <Pressable onPress={() => escalate(id)} hitSlop={6} accessibilityLabel="Escalate to OnGarage">
                <Text style={styles.link}>තවමත් හරි නැත්නම් · OnGarage වෙත යොමු කරන්න ›</Text>
              </Pressable>
            )}
          </>
        );
      case 'disputed':
        return d?.status === 'escalated' ? (
          <Text style={styles.note}>⚖️ OnGarage කණ්ඩායම පැය 24ක් ඇතුළත ඔබ දෙපාර්ශ්වයම අමතයි.</Text>
        ) : (
          <>
            <Text style={styles.note}>⏳ ගරාජය නැවත පරීක්ෂා කරමින්…</Text>
            <Pressable onPress={() => escalate(id)} hitSlop={6} accessibilityLabel="Escalate to OnGarage">
              <Text style={styles.link}>OnGarage වෙත යොමු කරන්න ›</Text>
            </Pressable>
          </>
        );
      case 'closed':
        if (claim) return <Text style={styles.note}>{claim.status === 'accepted' ? '✅ ගරාජය වගකීම පිළිගත්තා — නොමිලේ හදයි.' : claim.status === 'open' ? '⏳ වගකීම් ඉල්ලීම ගරාජයට යවා ඇත.' : '⚖️ වගකීම් ඉල්ලීම OnGarage සලකා බලයි.'}</Text>;
        return inWarranty ? <ActionButton label="වගකීම් ඉල්ලීමක්" icon="🛡️" variant="ghost" compact onPress={() => setSheet('warranty')} /> : null;
      case 'declined':
        return <Text style={styles.note}>පරීක්ෂා ගාස්තුව {money(INSPECTION_FEE)} පමණක් ගෙවිය යුතුයි.</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      <StepProgress steps={WORKSHOP_STEP_LABELS} current={workshopStepIndex(p.stage)} alert={alert || p.stage === 'disputed'} />
      <View style={styles.rowBetween}>
        <Text style={[styles.stage, alert && { color: Colors.warning }]}>{OWNER_STAGE_TEXT[p.stage]}</Text>
        {p.stage === 'closed' && p.warrantyUntil && <Text style={styles.warranty}>🛡️ {formatDate(p.warrantyUntil)} දක්වා</Text>}
      </View>
      {p.stage === 'repairing' && d?.status === 'rework' && <Text style={styles.note}>🔧 ඔබ වාර්තා කළ ගැටලුව නැවත හදමින්: “{d.text}”</Text>}
      {p.stage === 'disputed' && d && (
        <Text style={styles.sub}>
          {TOPIC_LABEL[d.topic]} · “{d.text}”
        </Text>
      )}
      {action()}

      {detailed && (
        <>
          {!!p.checkInPhotos?.length && (
            <>
              <Text style={styles.label}>ලැබුණු විට තත්ත්වය</Text>
              <PhotoStrip photos={p.checkInPhotos} height={64} />
            </>
          )}
          {p.diagnosis && (
            <View style={styles.box}>
              <Text style={styles.boxTitle}>🔍 {p.diagnosis.findings}</Text>
              {p.diagnosis.lines.map((l) => {
                const ok = p.decision?.approvedLineIds.includes(l.id);
                return (
                  <View key={l.id} style={styles.rowBetween}>
                    <Text style={[styles.sub, p.decision && !ok && styles.struck]} numberOfLines={1}>
                      {p.decision ? (ok ? '✓' : '✕') : '•'} {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                    </Text>
                    <Text style={[styles.sub, p.decision && !ok && styles.struck]}>{money(l.price)}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {bill && (
            <View style={styles.box}>
              <View style={styles.rowBetween}>
                <Text style={styles.sub}>🔧 වැඩ ගාස්තුව</Text>
                <Text style={styles.value}>{money(bill.labour)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.sub}>🔩 කොටස් (වෙනම)</Text>
                <Text style={styles.value}>{money(bill.parts)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.boxTitle}>{p.stage === 'closed' ? 'ගෙවූ මුළු මුදල' : 'මුළු මුදල'}</Text>
                <Text style={styles.total}>{money(bill.total)}</Text>
              </View>
            </View>
          )}
        </>
      )}

      <ApprovalSheet workshop={sheet === 'approve' ? w : null} onClose={close} />
      <HandoverSheet workshop={sheet === 'handover' ? w : null} onClose={close} onProblem={() => setSheet('problem')} />
      <ProblemSheet workshop={sheet === 'problem' ? w : null} onClose={close} />
      <WarrantySheet workshop={sheet === 'warranty' ? w : null} onClose={close} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    stage: { flex: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warranty: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    note: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    link: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    sub: { flexShrink: 1, fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    struck: { textDecorationLine: 'line-through', opacity: 0.7 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.subtleFill, gap: 5 },
    boxTitle: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 18 },
    value: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    total: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
