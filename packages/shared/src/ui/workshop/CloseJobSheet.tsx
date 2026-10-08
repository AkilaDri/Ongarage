import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton, softEdge, softShadow } from '../Glass';
import { Sheet } from '../Sheet';
import { checkCloseCode } from '../../marketplace/closeCode';
import { money } from '../../utils/format';

/**
 * Closing a job with the owner: scan the QR on their phone, or type the six digits they
 * read out. A job can't be closed without it — that's what protects the owner.
 */
export const CloseJobSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  expectedCode: string;
  total: number;
  /** Simulation only: show the owner's code (no second phone in the demo). */
  showSimulatedCode?: boolean;
  onConfirmed: () => void;
  /** Texts for other code checks (e.g. a parts pickup at the shop counter). */
  text?: { title: string; subtitle?: string; hint: string; scan: string };
}> = ({ visible, onClose, overlay, expectedCode, total, showSimulatedCode, onConfirmed, text }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCode('');
    setError(false);
  }, [visible]);

  const confirm = (entered: string) => {
    if (!checkCloseCode(expectedCode, entered)) {
      setError(true);
      return;
    }
    onConfirmed();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={text?.title ?? 'අයිතිකරුගේ කේතයෙන් අවසන් කරන්න'}
      subtitle={text?.subtitle ?? `අයිතිකරු පරීක්ෂා කර තහවුරු කළ පසු · ${money(total)}`}
      onClose={onClose}
      overlay={overlay}
      footer={<ActionButton label={text?.scan ?? 'QR ස්කෑන් කිරීම අනුකරණය කරන්න'} icon="📷" variant="success" onPress={() => confirm(expectedCode)} />}
    >
      <Text style={styles.hint}>{text?.hint ?? 'අයිතිකරුගේ දුරකථනයේ ඇති QR කේතය ස්කෑන් කරන්න. ස්කෑන් කළ නොහැකි නම් ඔවුන් කියන ඉලක්කම් 6 ඇතුළත් කරන්න.'}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={code}
          onChangeText={(t) => {
            setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
            setError(false);
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="______"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Owner close code"
        />
        <Pressable style={[styles.btn, code.length !== 6 && styles.off]} disabled={code.length !== 6} onPress={() => confirm(code)} accessibilityLabel="Confirm owner code">
          <Text style={styles.btnText}>තහවුරු කරන්න</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>කේතය නොගැළපේ — නැවත අසන්න.</Text>}
      {showSimulatedCode && <Text style={styles.hint}>(අනුකරණය: නිවැරදි කේතය {expectedCode})</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    error: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    input: {
      flex: 1,
      minWidth: 0,
      height: 52,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: softEdge(),
      color: Colors.textMain,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 6,
      ...softShadow(),
    },
    inputError: { borderColor: Colors.errorText },
    btn: { paddingHorizontal: 14, height: 52, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
    btnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
    off: { opacity: 0.4 },
  })
);
