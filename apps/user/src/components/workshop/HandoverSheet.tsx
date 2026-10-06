import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, CloseCode, Colors, FONTS, PhotoStrip, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { formatDate, money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * Collecting the vehicle: the garage's handover report and bill first. Only when the owner
 * is happy do they show their code (QR + 6 digits) — that closes the job and starts the
 * warranty. Not happy → report a problem instead.
 */
export const HandoverSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void; onProblem: () => void }> = ({ workshop, onClose, onProblem }) => {
  const { showCloseCode, acknowledgeClosed } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [codeShown, setCodeShown] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop]);
  useEffect(() => {
    if (!workshop) setCodeShown(false);
  }, [workshop]);

  const w = workshop ?? shown;
  const h = w?.progress.handover;
  if (!w || !h) return null;
  const closed = w.progress.stage === 'closed';
  const dismiss = () => {
    if (closed) acknowledgeClosed(w.id);
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      title={closed ? 'රැකියාව අවසන්' : 'වාහනය භාරගන්න'}
      subtitle={w.garageName}
      onClose={dismiss}
      footer={
        closed ? (
          <ActionButton label="හරි" icon="✓" variant="success" onPress={dismiss} />
        ) : codeShown ? undefined : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="ගැටලුවක් ඇත" icon="⚠️" variant="ghost" compact onPress={onProblem} />
            </View>
            <View style={styles.flex2}>
              <ActionButton
                label="හරි — කේතය පෙන්වන්න"
                icon="🔳"
                variant="success"
                compact
                onPress={() => {
                  setCodeShown(true);
                  showCloseCode(w.id);
                }}
              />
            </View>
          </View>
        )
      }
    >
      {closed ? (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>🎉 ස්තූතියි! {money(h.bill.total)} ගෙවා රැකියාව අවසන්.</Text>
          {w.progress.warrantyUntil && (
            <Text style={styles.text}>
              🛡️ මාස {w.warrantyMonths} වගකීම · {formatDate(w.progress.warrantyUntil)} දක්වා. ගැටලුවක් ආවොත් “ක්‍රියාකාරකම්” හි වගකීම් ඉල්ලීමක් කරන්න.
            </Text>
          )}
        </View>
      ) : codeShown ? (
        <CloseCode code={w.progress.closeCode} title="මෙම කේතය ගරාජයට පෙන්වන්න" caption="ඔවුන් QR එක ස්කෑන් කරයි, නැත්නම් ඉලක්කම් 6 කියන්න. වාහනය පරීක්ෂා කිරීමට පෙර පෙන්වන්න එපා." />
      ) : (
        <>
          <Text style={styles.label}>පෙර / පසු</Text>
          <PhotoStrip photos={[...(h.beforePhotos ?? []), ...(h.afterPhotos ?? [])]} height={84} />
          <View style={styles.box}>
            <Text style={styles.label}>ගරාජයේ පරීක්ෂා ලැයිස්තුව</Text>
            {h.checklist.map((c) => (
              <Text key={c.label} style={styles.text}>
                {c.done ? '✓' : '•'} {c.label}
              </Text>
            ))}
            {h.oldPartsKept && <Text style={styles.note}>♻️ ඉවත් කළ පැරණි කොටස් ඔබට බැලීමට තබා ඇත.</Text>}
          </View>
          <View style={styles.box}>
            <Row label="🔧 වැඩ ගාස්තුව" value={money(h.bill.labour)} />
            <Row label="🔩 කොටස් (වෙනම බිල්පත)" value={money(h.bill.parts)} />
            <Row label="ගෙවිය යුතු මුළු මුදල" value={money(h.bill.total)} strong />
          </View>
          {w.progress.dispute?.status === 'rework' && <Text style={styles.note}>🔧 ඔබ වාර්තා කළ ගැටලුව නැවත හදා ඇත: “{w.progress.dispute.text}”</Text>}
          <Text style={styles.text}>වාහනය පරීක්ෂා කරන්න (ධාවනය කර බලන්න). සියල්ල හරි නම් පමණක් කේතය පෙන්වන්න.</Text>
        </>
      )}
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.sumRow}>
    <Text style={strong ? styles.sumStrong : styles.text}>{label}</Text>
    <Text style={strong ? styles.total : styles.sumValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', gap: 8 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 5 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    note: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText, lineHeight: 18 },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sumValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sumStrong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    total: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
    done: { padding: 14, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)', gap: 8 },
    doneTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  })
);
