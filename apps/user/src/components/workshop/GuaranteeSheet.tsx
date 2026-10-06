import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, claimBlockers, claimSplit, Colors, eligibilityOf, FONTS, GUARANTEE, PhotoStrip, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { SAMPLE_UPLOAD_PHOTOS } from '../../constants/mockData';
import { money } from '../../utils/format';
import { Sheet } from '../Sheet';

const CHECKS: { key: 'protectedJob' | 'closedWithCode' | 'documented' | 'withinWarranty'; label: string }[] = [
  { key: 'protectedJob', label: 'ප්‍රිමියර් ගරාජයක ආරක්ෂිත රැකියාවක්' },
  { key: 'closedWithCode', label: 'ඔබගේ QR / කේතයෙන් අවසන් කළා' },
  { key: 'documented', label: 'පැමිණීමේ සහ භාරදීමේ ඡායාරූප ඇත' },
  { key: 'withinWarranty', label: 'වගකීම් කාලය තුළ' },
];

/**
 * OnGarage Guarantee: when a protected job's fault comes back and the garage can't put it
 * right, OnGarage pays (capped) after the garage has had its say. Not insurance.
 */
export const GuaranteeSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { claimGuarantee } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setReason('');
    setAmount('');
    setPhotos([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  if (!w) return null;
  const e = eligibilityOf(w.progress, Date.now());
  const blockers = claimBlockers(e);
  const value = Number(amount) || 0;
  const split = claimSplit(value);
  const valid = !blockers.length && reason.trim().length >= 10 && value > 0;

  return (
    <Sheet
      visible={!!workshop}
      title="OnGarage Guarantee ඉල්ලීම"
      subtitle={`${w.garageName} · ${w.receiptNo ?? ''}`}
      onClose={onClose}
      footer={
        <ActionButton
          label={blockers.length ? 'මෙම රැකියාවට ඉල්ලිය නොහැක' : 'ඉල්ලීම යවන්න'}
          icon="🛡️"
          variant="primary"
          disabled={!valid}
          onPress={() => {
            claimGuarantee(w.id, reason.trim(), value, photos.length ? photos : undefined);
            onClose();
          }}
        />
      }
    >
      <View style={styles.box}>
        {CHECKS.map((c) => (
          <Text key={c.key} style={[styles.check, { color: e[c.key] ? Colors.successText : Colors.errorText }]}>
            {e[c.key] ? '✓' : '✕'} {c.label}
          </Text>
        ))}
      </View>

      {!blockers.length && (
        <>
          <TextInput
            style={styles.area}
            value={reason}
            onChangeText={setReason}
            placeholder="මොකක්ද වුණේ? ගරාජයට එය නිවැරදි කළ නොහැකි වුණේ ඇයි?"
            placeholderTextColor={Colors.textMuted}
            multiline
            accessibilityLabel="Guarantee reason"
          />
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            placeholder="නිවැරදි කිරීමට වියදම (රු.) — වෙනත් ගරාජයක ඇස්තමේන්තුව"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            accessibilityLabel="Guarantee amount"
          />
          <PhotoStrip photos={photos} height={70} onAdd={photos.length < 4 ? () => setPhotos((p) => [...p, SAMPLE_UPLOAD_PHOTOS[p.length % SAMPLE_UPLOAD_PHOTOS.length]]) : undefined} />
          {value > 0 && (
            <View style={styles.box}>
              <Row label="ගරාජය ගෙවයි (පළමු කොටස)" value={money(split.garagePays)} />
              <Row label="OnGarage Guarantee ගෙවයි" value={money(split.guaranteePays)} strong />
              {split.ownerUncovered > 0 && <Row label="සීමාවෙන් ඔබ්බට (ආවරණය නොවේ)" value={money(split.ownerUncovered)} />}
            </View>
          )}
        </>
      )}
      <Text style={styles.sub}>
        එක් ඉල්ලීමකට උපරිම {money(GUARANTEE.capPerClaim)} · ගරාජයට පළමුව පිළිතුරු දීමට අවස්ථාව ලැබේ · OnGarage කණ්ඩායම ඡායාරූප සහ වාර්තා බලා තීරණය කරයි. මෙය රක්ෂණයක් නොවේ.
      </Text>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.rowValue, strong && { color: Colors.success }]}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    check: { fontSize: 12, fontFamily: FONTS.bodySemiBold },
    area: {
      minHeight: 76,
      padding: 12,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    input: {
      height: 46,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyMedium,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    rowLabel: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    rowValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
