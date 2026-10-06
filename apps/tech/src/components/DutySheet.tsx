import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, GlassIcon, themedStyles } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { ago } from '../utils/format';
import { Sheet } from './Sheet';

/**
 * Check in to one garage at a time, take a break, or go off duty. The technician's
 * own check-in replaces the manager guessing who is in: a garage's SOS capacity
 * counts only technicians checked in there and not on a break.
 */
export const DutySheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { links, duty, checkIn, checkOut, setBreak } = useTech();
  const current = links.find((l) => l.garage.id === duty.garageId);

  return (
    <Sheet visible={visible} title="රාජකාරිය" subtitle="ඔබ සිටින ගරාජයට පමණක් SOS රැකියා ලැබේ" onClose={onClose}>
      {current && (
        <View style={[styles.card, styles.current]}>
          <Text style={styles.title}>{duty.onBreak ? '☕ විවේකයේ' : '✅ රාජකාරියේ'} · {current.garage.name}</Text>
          <Text style={styles.sub}>
            {duty.onBreak && duty.breakSince ? `විවේකය ${ago(Date.now() - duty.breakSince)} සිට` : duty.since ? `පැමිණියේ ${ago(Date.now() - duty.since)}` : ''}
          </Text>
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="පිටවන්න" icon="🚪" variant="ghost" compact onPress={checkOut} />
            </View>
            <View style={styles.flex1}>
              <ActionButton
                label={duty.onBreak ? 'ආපසු පැමිණියා' : 'විවේකයක්'}
                icon={duty.onBreak ? '✓' : '☕'}
                variant={duty.onBreak ? 'success' : 'primary'}
                compact
                onPress={() => setBreak(!duty.onBreak)}
              />
            </View>
          </View>
          <Text style={styles.hint}>විවේකයේ සිටින විට ඔබට SOS රැකියා නොලැබේ.</Text>
        </View>
      )}

      <Text style={styles.label}>{current ? 'වෙනත් ගරාජයකට මාරු වන්න' : 'රාජකාරියට පැමිණෙන්න'}</Text>
      {links
        .filter((l) => l.garage.id !== duty.garageId)
        .map((l) => (
          <Pressable key={l.garage.id} style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]} onPress={() => checkIn(l.garage.id)} accessibilityLabel={`Check in ${l.garage.name}`}>
            <GlassIcon emoji="🛠️" small />
            <View style={styles.flex1}>
              <Text style={styles.title}>{l.garage.name}</Text>
              <Text style={styles.sub}>
                {l.kind === 'employee' ? 'සේවකයා' : 'නිදහස් කාර්මික'} · SOS රු. {l.rates.sos.toLocaleString()} · වැඩමුළු රු. {l.rates.workshop.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.go}>පැමිණෙන්න ›</Text>
          </Pressable>
        ))}
      <Text style={styles.hint}>එකවර එක් ගරාජයක පමණක් රාජකාරියේ සිටිය හැක — එවිට එක් ගරාජයක් පමණක් ඔබව ධාරිතාවට ගණන් කරයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actions: { flexDirection: 'row', gap: 8 },
    card: { padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    current: { borderColor: 'rgba(16, 185, 129, 0.5)' },
    pressed: { opacity: 0.75 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    go: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
  })
);
