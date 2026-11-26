import { FlowButton } from '../FlowButton';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles, workshopBill } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * The owner asked for Genuine and none is available: allow Recon (cheaper, shorter
 * warranty) or wait for Genuine. The garage can't fit Recon without this.
 */
export const ReconSheet: React.FC<{ workshop: OwnerWorkshop | null; reconId?: string; onClose: () => void; /** The answer was already given: change it (the chat's edit chip). */ change?: boolean }> = ({ workshop, reconId, onClose, change }) => {
  const { decideRecon, changeReconDecision } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  useEffect(() => {
    if (workshop) setShown(workshop);
  }, [workshop]);
  // Neither choice is selected for the owner: the sheet opens undecided each time.
  const [pick, setPick] = useState<'genuine' | 'recon' | null>(null);
  useEffect(() => {
    setPick(null);
  }, [workshop?.id, reconId]);

  const w = workshop ?? shown;
  const r = w?.progress.recon?.find((x) => x.id === reconId) ?? w?.progress.recon?.[0];
  if (!w || !r) return null;
  const saving = r.genuinePrice - r.reconPrice;
  // The whole job's new total with each choice. The bill carries the part at the Genuine price, unless Recon was already approved (when changing the answer).
  const now = workshopBill(w.agreedPrice, w.progress).total;
  const genuineTotal = r.status === 'approved' ? now + saving : now;
  const total = pick === null ? null : pick === 'recon' ? genuineTotal - saving : genuineTotal;
  const decide = (approve: boolean) => {
    if (change) changeReconDecision(w.id, r.id, approve);
    else decideRecon(w.id, r.id, approve);
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      title={change ? 'Genuine කොටස් නොමැත · වෙනස් කිරීම' : 'Genuine කොටස් නොමැත'}
      subtitle={w.garageName}
      onClose={onClose}
      noDividers
      footer={
        <View style={styles.footer}>
          {total !== null && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>රැකියාවේ නව එකතුව</Text>
              <Text style={styles.total}>{money(total)}</Text>
            </View>
          )}
          <FlowButton
            label={pick === 'recon' ? 'Recon අනුමතයි' : pick === 'genuine' ? 'Genuine බලා සිටින්න' : 'තෝරන්න'}
            detail={pick === 'recon' ? money(r.reconPrice) : pick === 'genuine' ? money(r.genuinePrice) : undefined}
            icon={pick === 'recon' ? '✓' : undefined}
            variant={pick === 'recon' ? 'success' : 'primary'}
            disabled={pick === null}
            onPress={() => decide(pick === 'recon')}
          />
        </View>
      }
    >
      {r.partNames.map((n) => (
        <Text key={n} style={styles.part}>
          🔩 {n}
        </Text>
      ))}
      {/* The two cards are the choices, each with the same lines in the same order: price, how soon, warranty. */}
      <View style={styles.compare}>
        <Choice
          on={pick === 'genuine'}
          onPress={() => setPick('genuine')}
          name="Genuine"
          price={money(r.genuinePrice)}
          note="ඇස්තමේන්තුව"
          time="තව දිනයක් පමණ"
          warranty={r.genuineWarrantyMonths ? `මාස ${r.genuineWarrantyMonths} වගකීම` : undefined}
          a11y="Wait for Genuine"
        />
        <Choice
          on={pick === 'recon'}
          onPress={() => setPick('recon')}
          name="Recon"
          price={money(r.reconPrice)}
          note={`${money(saving)} අඩුයි`}
          time="දැන් ගත හැක"
          // With no stated period, only the honest general warning on the shorter choice.
          warranty={r.reconWarrantyMonths ? `මාස ${r.reconWarrantyMonths} වගකීම` : 'වගකීම කෙටි විය හැක'}
          warn={!r.reconWarrantyMonths || (!!r.genuineWarrantyMonths && r.reconWarrantyMonths < r.genuineWarrantyMonths)}
          a11y="Approve Recon"
        />
      </View>
      <Text style={styles.sub}>Recon: පරීක්ෂා කර නැවත සකස් කළ, භාවිත කළ මුල් කොටසක්.</Text>
    </Sheet>
  );
};

const Choice: React.FC<{ on: boolean; onPress: () => void; name: string; price: string; note: string; time: string; warranty?: string; warn?: boolean; a11y: string }> = ({ on, onPress, name, price, note, time, warranty, warn, a11y }) => (
  <Pressable style={[styles.choice, on && styles.choiceOn]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y}>
    <Text style={[styles.name, on && styles.onText]}>{name}</Text>
    <Text style={[styles.price, on && styles.onText]}>{price}</Text>
    <Text style={[styles.sub, on && styles.onSub]}>{note}</Text>
    <Text style={[styles.fact, on && styles.onText]}>⏱️ {time}</Text>
    {!!warranty && <Text style={[styles.fact, warn && styles.warnText, on && styles.onText]}>🛡️ {warranty}</Text>}
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    footer: { gap: 10 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    totalLabel: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    total: { fontSize: 20, lineHeight: 26, fontFamily: FONTS.titleBold, color: Colors.success },
    part: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    compare: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
    choice: { flex: 1, gap: 4, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 22, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff' },
    choiceOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    name: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    price: { fontSize: 18, lineHeight: 24, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20 },
    fact: { fontSize: 13, lineHeight: 20, marginTop: 4, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warnText: { color: '#b45309' },
    onText: { color: '#ffffff' },
    onSub: { color: 'rgba(255, 255, 255, 0.85)' },
  })
);
