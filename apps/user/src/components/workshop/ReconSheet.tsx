import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * The owner asked for Genuine and none is available: allow Recon (cheaper, shorter
 * warranty) or wait for Genuine. The garage can't fit Recon without this.
 */
export const ReconSheet: React.FC<{ workshop: OwnerWorkshop | null; reconId?: string; onClose: () => void }> = ({ workshop, reconId, onClose }) => {
  const { decideRecon } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  useEffect(() => {
    if (workshop) setShown(workshop);
  }, [workshop]);

  const w = workshop ?? shown;
  const r = w?.progress.recon?.find((x) => x.id === reconId) ?? w?.progress.recon?.[0];
  if (!w || !r) return null;
  const decide = (approve: boolean) => {
    decideRecon(w.id, r.id, approve);
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      title="Genuine කොටස් නොමැත"
      subtitle={`${w.garageName} · Recon යෙදීමට ඔබගේ අවසරය`}
      onClose={onClose}
      footer={
        <View style={styles.row}>
          <View style={styles.flex1}>
            <ActionButton label="Genuine බලා සිටින්න" variant="ghost" compact onPress={() => decide(false)} />
          </View>
          <View style={styles.flex1}>
            <ActionButton label="Recon අනුමතයි" icon="✓" variant="success" compact onPress={() => decide(true)} />
          </View>
        </View>
      }
    >
      <Text style={styles.text}>ඔබ Genuine කොටස් ඉල්ලුවා. ළඟම වෙළඳසැල්වල මේ වන විට Genuine නොමැත:</Text>
      <View style={styles.box}>
        {r.partNames.map((n) => (
          <Text key={n} style={styles.part}>
            🔩 {n}
          </Text>
        ))}
        <View style={styles.compare}>
          <View style={styles.col}>
            <Text style={styles.label}>Genuine (ඇස්තමේන්තුව)</Text>
            <Text style={styles.price}>{money(r.genuinePrice)}</Text>
            <Text style={styles.sub}>සොයා ගැනීමට අමතර දිනයක් පමණ</Text>
          </View>
          <View style={[styles.col, styles.colRecon]}>
            <Text style={styles.label}>Recon</Text>
            <Text style={[styles.price, { color: Colors.success }]}>{money(r.reconPrice)}</Text>
            <Text style={styles.sub}>දැන් ලබා ගත හැක · රු. {(r.genuinePrice - r.reconPrice).toLocaleString()} අඩුයි</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sub}>Recon යනු භාවිත කළ, පරීක්ෂා කර නැවත සකස් කළ මුල් කොටස්ය — කොටසේ වගකීම සාමාන්‍යයෙන් කෙටියි. ඔබ අනුමත නොකළොත් ගරාජය Genuine පමණක් යොදයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 10 },
    part: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    compare: { flexDirection: 'row', gap: 8 },
    col: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 2 },
    colRecon: { borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.45)' },
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
