import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, canRequestFit, Colors, FITTING_SUPPLY, FONTS, getThemeMode, themedStyles, type PartsFitting, type WorkshopProgress } from '@ongarage/shared';
import { useWorkshops } from '../context/WorkshopContext';
import { useNotice } from '../context/NoticeContext';
import { Sheet } from './Sheet';

/** Can the owner still ask for another part to be fitted? Only while the job is running (not ended, cancelled or declined). */
export const canAskToFit = (w?: { progress: WorkshopProgress }) => !!w && canRequestFit(w.progress);

/**
 * The owner tells the garage that they want another part fitted to the vehicle (which part, and whether they bring it or the garage supplies it).
 * It becomes a request the garage accepts or declines (and a message from the owner in the job's chat). Opened from the chat's bar and from the job cards.
 */
export const FitPartSheet: React.FC<{ id: string; visible: boolean; onClose: () => void }> = ({ id, visible, onClose }) => {
  const { workshops, requestFit } = useWorkshops();
  const { notify } = useNotice();
  const [part, setPart] = useState('');
  const [supply, setSupply] = useState<PartsFitting['supply']>('owner');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPart('');
    setSupply('owner');
    setNote('');
  }, [visible]);

  const w = workshops[id];
  if (!w) return null;

  const send = () => {
    if (!part.trim()) return;
    requestFit(id, { partName: part, supply, note });
    notify({ icon: '🔩', title: 'ගරාජයට දැනුම් දුන්නා', body: `${part.trim()} සවි කිරීමට ඉල්ලුවා — පිළිතුර චැට් එකේ.`, tone: 'primary' });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="අලුත් කොටසක් සවි කරන්න"
      subtitle={`${w.garageName} ට දැනුම් දෙන්න`}
      onClose={onClose}
      footer={<ActionButton label="ගරාජයට දැනුම් දෙන්න" icon="📨" variant="primary" disabled={!part.trim()} onPress={send} />}
    >
      <Text style={styles.heading}>සවි කළ යුතු කොටස</Text>
      <TextInput style={styles.input} placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් සෙට් එක" placeholderTextColor={Colors.textMuted} value={part} onChangeText={setPart} accessibilityLabel="Part to fit" />
      <Text style={styles.heading}>කොටස සපයන්නේ කවුද?</Text>
      <View style={styles.chips}>
        {FITTING_SUPPLY.map((s) => {
          const on = supply === s.id;
          return (
            <Pressable key={s.id} style={[styles.choice, on && styles.choiceOn]} onPress={() => setSupply(s.id)} accessibilityLabel={`Part supplied by ${s.id}`} accessibilityState={{ selected: on }}>
              <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{on ? '✓ ' : ''}{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput style={[styles.input, styles.note]} multiline placeholder="තවත් විස්තර (විකල්ප)" placeholderTextColor={Colors.textMuted} value={note} onChangeText={setNote} maxLength={160} accessibilityLabel="Note about the part" />
    </Sheet>
  );
};

/** "Fit a new part" beside the @ chip in the chat: a chip that opens the form. */
export const ChatFitAction: React.FC<{ id: string }> = ({ id }) => {
  const { workshops } = useWorkshops();
  const [open, setOpen] = useState(false);
  if (!canAskToFit(workshops[id])) return null;
  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen(true)} accessibilityLabel="Ask the garage to fit a new part">
        <Text style={styles.icon}>🔩</Text>
        <Text style={styles.label}>අලුත් කොටසක් සවි කරන්න</Text>
      </Pressable>
      <FitPartSheet id={id} visible={open} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    heading: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    input: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13.5, fontFamily: FONTS.bodyRegular },
    note: { minHeight: 64, textAlignVertical: 'top' },
    chips: { gap: 8 },
    choice: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    choiceOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    choiceText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, lineHeight: 18 },
    choiceTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
  })
);
