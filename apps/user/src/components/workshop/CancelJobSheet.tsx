import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, OWNER_CANCEL_REASONS, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { Sheet } from '../Sheet';

/**
 * Step 1 of cancelling a job with the garage: the owner asks to cancel and says why. The request goes to the garage, which approves it
 * and states what it charges for the work done so far; the owner then decides (`CancelRequestSheet`).
 */
export const CancelJobSheet: React.FC<{
  workshop: OwnerWorkshop | null;
  onClose: () => void;
  /** The request is already sent and the garage has not answered: change its reason / note (the chat's edit chip). */
  editing?: boolean;
  onSaved?: (reason: string, note?: string) => void;
}> = ({ workshop, onClose, editing, onSaved }) => {
  const { requestCancel, editCancelRequest } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setReason(editing ? workshop.progress.cancelRequest?.reason ?? null : null);
    setNote(editing ? workshop.progress.cancelRequest?.note ?? '' : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  if (!w) return null;

  const submit = () => {
    if (!reason) return;
    if (editing) {
      if (editCancelRequest(w.id, { reason, note })) onSaved?.(reason, note.trim() || undefined);
    } else requestCancel(w.id, { reason, note });
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      title={editing ? 'ඉල්ලීම සංස්කරණය' : 'අවලංගු කිරීමට ඉල්ලන්න'}
      subtitle={`${w.garageName} සමඟ ඔබගේ රැකියාව`}
      onClose={onClose}
      footer={
        <View style={styles.row}>
          <View style={styles.flex1}>
            <ActionButton label="අවලංගු නොකරන්න" variant="ghost" compact onPress={onClose} />
          </View>
          <View style={styles.flex1}>
            <ActionButton label={editing ? 'වෙනස්කම් සුරකින්න' : 'ඉල්ලීම ගරාජයට යවන්න'} icon={editing ? '✓' : '📨'} variant="primary" compact disabled={!reason} onPress={submit} />
          </View>
        </View>
      }
    >
      <View style={styles.infoBox} accessibilityLabel="How cancelling works">
        <Text style={styles.infoTitle}>ℹ️ අවලංගු කිරීම මෙහෙමයි</Text>
        <Text style={styles.infoText}>1. ඔබ හේතුව සමඟ ඉල්ලීම යවයි.</Text>
        <Text style={styles.infoText}>2. ගරාජය අවලංගු කිරීම අනුමත කර, මෙතෙක් කළ වැඩවලට වන්දියක් දන්වයි.</Text>
        <Text style={styles.infoText}>3. වන්දියට එකඟ නම් ඔබ රැකියාව අවලංගු කර ගරාජය ශ්‍රේණිගත කරයි. එකඟ නැත්නම් ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යන්න පුළුවන්.</Text>
      </View>

      <Text style={styles.label}>අවලංගු කරන්නේ ඇයි? (ගරාජයට පෙනේ)</Text>
      <View style={styles.chips}>
        {OWNER_CANCEL_REASONS.map((r) => (
          <Pressable key={r} style={[styles.chip, reason === r && styles.chipOn]} onPress={() => setReason(r)} accessibilityLabel={`Reason ${r}`} accessibilityState={{ selected: reason === r }}>
            <Text style={[styles.chipText, reason === r && styles.chipTextOn]}>{reason === r ? '✓ ' : ''}{r}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.note}
        multiline
        placeholder="ගරාජයට දැන ගැනීමට අවශ්‍ය තවත් විස්තර (විකල්ප)"
        placeholderTextColor={Colors.textMuted}
        value={note}
        onChangeText={setNote}
        maxLength={200}
        accessibilityLabel="Cancellation note"
      />
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    infoBox: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    infoTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    infoText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    chipText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    chipTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    note: { minHeight: 64, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
