import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, PhotoStrip, themedStyles } from '@ongarage/shared';
import { FlowButton } from '../FlowButton';
import { Sheet } from '../Sheet';
import { MOCK_GARAGES } from '../../constants/mockData';
import { useWorkshops, type OwnerWorkshop, type ReceiptDisputeReason } from '../../context/WorkshopContext';

const REASONS: { id: ReceiptDisputeReason; label: string }[] = [
  { id: 'notYet', label: 'මම තවම වාහනය භාර දී නැත' },
  { id: 'onTheWay', label: 'මම පැමිණෙමින් සිටිමි' },
];

/** "No, they do not have it": asks what happened before anything is sent, so a wrong tap can be taken back. */
export const ReceiptReasonSheet: React.FC<{ visible: boolean; onClose: () => void; onPick: (reason: ReceiptDisputeReason, label: string) => void }> = ({ visible, onClose, onPick }) => (
  <Sheet visible={visible} title="මොකක්ද වුණේ?" onClose={onClose}>
    {REASONS.map((r) => (
      <FlowButton key={r.id} label={r.label} variant="primary" onPress={() => onPick(r.id, r.label)} />
    ))}
    <FlowButton label="ආපසු" variant="ghost" onPress={onClose} />
  </Sheet>
);

/**
 * The handover is disputed (the garage says it has the vehicle, the owner says no): what happens now, and the owner's ways on. The same box on the job's card and in
 * its chat. The job is on hold while it stands, and the owner may cancel it without any fee.
 */
export const ReceiptDisputeBox: React.FC<{ workshop: OwnerWorkshop; onUpdate?: (text: string) => void }> = ({ workshop: w, onUpdate }) => {
  const { confirmReceived, escalateReceipt, cancelDisputedReceipt } = useWorkshops();
  const [cancelling, setCancelling] = useState(false);
  const d = w.receiptDispute;
  if (!d) return null;
  const phone = MOCK_GARAGES.find((g) => g.name === w.garageName)?.phone;
  const handedNow = () => {
    confirmReceived(w.id, true);
    onUpdate?.('✅ අයිතිකරු වාහනය භාර දුන් බව තහවුරු කළා.');
  };
  return (
    <View style={styles.box} accessibilityLabel="Handover disputed">
      <Text style={styles.title}>
        {d.status === 'garageHasIt' ? `${w.garageName} කියන්නේ වාහනය ඔවුන් ළඟ ඇති බවයි.` : d.status === 'onGarage' ? 'මෙය OnGarage කණ්ඩායමට යොමු කර ඇත.' : 'ඔබ තවම වාහනය භාර දී නැති බව ගරාජයට දැනුම් දුන්නා.'}
      </Text>
      <Text style={styles.sub}>{d.status === 'garageHasIt' ? 'ඡායාරූපවල අංක තහඩුව ඔබේ වාහනයේදැයි බලන්න.' : 'මෙය විසඳෙන තුරු රැකියාව නවතා ඇත. කිසිවක් අනුමත කිරීමක් හෝ අය කිරීමක් නොවේ.'}</Text>
      {d.status === 'garageHasIt' && !!d.photos?.length && <PhotoStrip photos={d.photos} height={72} />}

      {d.status === 'garageHasIt' ? (
        <>
          <FlowButton label="ඔව්, මම වාහනය භාර දුන්නා" icon="✓" variant="success" onPress={handedNow} />
          <FlowButton label="OnGarage වෙත යොමු කරන්න" variant="ghost" onPress={() => escalateReceipt(w.id)} />
        </>
      ) : (
        <View style={styles.row}>
          {!!phone && (
            <View style={styles.flex1}>
              <FlowButton label="ගරාජයට කතා කරන්න" icon="📞" variant="ghost" onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} />
            </View>
          )}
          <View style={styles.flex1}>
            <FlowButton label="දැන් භාර දුන්නා" icon="✓" variant="success" onPress={handedNow} />
          </View>
        </View>
      )}

      {cancelling ? (
        <View style={styles.confirm}>
          <Text style={styles.title}>රැකියාව අවලංගු කරන්නද? ගාස්තුවක් නැත.</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FlowButton label="නැත" variant="ghost" onPress={() => setCancelling(false)} />
            </View>
            <View style={styles.flex1}>
              <FlowButton label="ඔව්, අවලංගු කරන්න" variant="danger" onPress={() => cancelDisputedReceipt(w.id)} />
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.cancel} onPress={() => setCancelling(true)} accessibilityRole="button" accessibilityLabel="Cancel without a fee">
          ගාස්තුවක් නැතිව රැකියාව අවලංගු කරන්න
        </Text>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    box: { gap: 10, padding: 12, borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.12)' : '#fef7e0' },
    title: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sub: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    row: { flexDirection: 'row', gap: 10 },
    confirm: { gap: 8 },
    cancel: { fontSize: 13, lineHeight: 20, paddingVertical: 12, textAlign: 'center', fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
