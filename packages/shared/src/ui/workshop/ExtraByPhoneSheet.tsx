import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton, softEdge, softShadow } from '../Glass';
import { Sheet } from '../Sheet';
import { money } from '../../utils/format';
import type { ExtraWorkRequest } from '../../types';

/**
 * The owner hasn't answered extra work and the technician's hands are full: call them, then
 * record what they said (no code needed, the owner sees it came by phone), or — when they
 * can't be reached — wait for them (free) or put the extra work aside and finish the agreed
 * work.
 */
export const ExtraByPhoneSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  extra?: ExtraWorkRequest;
  customerName: string;
  onCall: () => void;
  onApproveByPhone: (approvedLineIds: string[]) => void;
  onWait: () => void;
  onDefer: () => void;
}> = ({ visible, onClose, overlay, extra, customerName, onCall, onApproveByPhone, onWait, onDefer }) => {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (visible && extra) setPicked(extra.lines.map((l) => l.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, extra?.id]);

  if (!extra) return null;
  const total = extra.lines.filter((l) => picked.includes(l.id)).reduce((s, l) => s + l.price, 0);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Sheet
      visible={visible}
      title="අයිතිකරු දුරකථනයෙන්"
      subtitle={`${customerName} · අමතර වැඩ ${extra.lines.length} ක්`}
      onClose={onClose}
      overlay={overlay}
      footer={
        <View style={styles.footer}>
          <ActionButton label={picked.length ? `දුරකථනයෙන් අනුමත කළා · ${money(total)}` : 'කිසිවක් අනුමත නැත'} icon="✓" variant="success" compact disabled={!picked.length} onPress={() => { onApproveByPhone(picked); onClose(); }} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={onCall} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label="සම්බන්ධ කර ගත නොහැක" icon="⏳" variant="ghost" compact onPress={() => { onWait(); onClose(); }} />
            </View>
          </View>
        </View>
      }
    >
      <Text style={styles.hint}>
        පාරිභෝගිකයා අමතා කතා කළාට පසු, ඔහු අනුමත කළ පේළි තෝරන්න. කේතයක් අවශ්‍ය නැත — එය “දුරකථනයෙන්” ලෙස සටහන් වී අයිතිකරුගේ යෙදුමේද පෙනේ.
      </Text>
      {extra.lines.map((l) => {
        const on = picked.includes(l.id);
        return (
          <Pressable key={l.id} style={[styles.line, on && styles.lineOn]} onPress={() => toggle(l.id)} accessibilityLabel={`Phone approve ${l.name}`}>
            <Text style={styles.check}>{on ? '☑' : '☐'}</Text>
            <Text style={styles.lineText}>
              {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
            </Text>
            <Text style={styles.price}>{money(l.price)}</Text>
          </Pressable>
        );
      })}
      <View style={styles.wait}>
        <Text style={styles.waitTitle}>අයිතිකරු සම්බන්ධ කර ගත නොහැකි නම්</Text>
        <Text style={styles.hint}>රැඳී සිටීම නොමිලේයි — ගරාජයට ගාස්තුවක් හෝ ප්‍රමාද දඩයක් නැත, සහ ඒ කාලය ප්‍රමාද ගණනයට ඇතුළත් නොවේ. අමතර වැඩ පසුවට තබා, එකඟ වූ වැඩ පමණක් අවසන් කිරීමටද හැක.</Text>
        <ActionButton label="අමතර වැඩ පසුවට තබා, එකඟ වූ වැඩ කරන්න" icon="➡️" variant="ghost" compact onPress={() => { onDefer(); onClose(); }} />
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    footer: { gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    lineOn: { borderColor: Colors.primary },
    check: { fontSize: 16, color: Colors.textMain },
    lineText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    wait: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    waitTitle: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
