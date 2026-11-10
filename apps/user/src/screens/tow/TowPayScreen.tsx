import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseCode, Colors, FONTS, Gradient, makeCloseCode, themedStyles } from '@ongarage/shared';
import { money } from '../../utils/format';
import type { TowFinalDraft } from './TowDropScreen';

/** Screen 6 of the towing flow: the owner pays the final amount, then shows the closing code to the driver. The job closes when the driver scans it. */
export type TowPaidDraft = TowFinalDraft & { closeCode: string; paid: boolean };

const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

export const TowPayScreen: React.FC<{
  draft: TowFinalDraft;
  onNext: (draft: TowPaidDraft) => void;
  /** Puts the tow away: the payment and the code are kept, and the return bar on Home says what is waiting. */
  onMinimize?: () => void;
}> = ({ draft, onNext, onMinimize }) => {
  const { finalAmount, bid, approval } = draft;
  const code = useMemo(() => makeCloseCode(), []);
  const [paid, setPaid] = useState(false);
  const declined = approval === 'declined';

  // The owner pays the amount on the screen; the driver then scans the code, which closes the job.
  const pay = () => setPaid(true);
  const handedOver = () => onNext({ ...draft, closeCode: code, paid: true });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>💳</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>{paid ? 'කේතය පෙන්වන්න' : 'ගෙවීම'}</Text>
              <Text style={styles.pillSub} numberOfLines={1}>{bid.name}</Text>
            </View>
          </View>
          {onMinimize && (
              <View style={styles.topSlot}>
              <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise towing">
                <Text style={styles.minText}>⌄</Text>
              </Pressable>
              </View>
            )}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.progressBar, styles.progressBarOn]} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {!paid && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>ගෙවිය යුතු මුදල</Text>
                <Text style={styles.total}>{money(finalAmount)}</Text>
                {declined && <Text style={styles.sub}>ඔබ ගිවිසගත් මුදල පමණක් ගෙවනවා. අමතර මුදල ගැන වාර්තාවක් තබා ඇත.</Text>}
              </View>
              <Pressable style={styles.action} onPress={pay} accessibilityLabel={`Pay ${money(finalAmount)}`}>
                <Text style={styles.actionTitle}>{`${money(finalAmount)} ගෙවන්න`}</Text>
              </Pressable>
            </>
          )}

          {paid && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>ගෙවීම සම්පූර්ණයි</Text>
                <Text style={styles.sub}>රියදුරාට මේ QR කේතය ස්කෑන් කරන්න කියන්න. කැමරාව ක්‍රියා නොකළොත් අංක රියදුරාට කියන්න.</Text>
              </View>
              <View style={styles.qr}>
                <CloseCode code={code} title="ට්‍රක් රියදුරා සඳහා" caption="මේ කේතය රියදුරාට පෙන්වන්න" />
              </View>
              <Pressable style={styles.action} onPress={handedOver} accessibilityLabel="The driver has scanned the code">
                <Text style={styles.actionTitle}>රියදුරා කේතය ස්කෑන් කළා</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    stepNo: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 18, gap: 12, paddingBottom: 40, alignItems: 'stretch' },
    card: { padding: 16, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 6 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    total: { fontSize: 26, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    qr: { alignItems: 'center', paddingVertical: 8 },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    flex1: { flex: 1 },
  })
);
