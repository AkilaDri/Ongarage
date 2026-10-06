import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ActionButton, CloseCode, Colors, directionsUrl, FONTS, pickupCodePayload, themedStyles, type PartsCollectTask } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { formatTime, money } from '../utils/format';
import { Sheet } from './Sheet';

/**
 * A garage sent the technician to a parts shop's counter: go there, show the pickup code
 * (the shop scans it, so only the right garage collects), then bring the parts back.
 */
export const CollectTaskSheet: React.FC<{ task: PartsCollectTask | null; onClose: () => void }> = ({ task, onClose }) => {
  const { duty, collectedAtCounter, deliverParts } = useTech();
  const [shown, setShown] = useState(task);
  useEffect(() => {
    if (task) setShown(task);
  }, [task]);

  const t = task ?? shown;
  if (!t) return null;
  const from = duty.garageId === t.garage.id ? t.garage.coords : undefined;

  return (
    <Sheet
      visible={!!task}
      title={`කොටස් එකතු කිරීම · ${t.shop.name}`}
      subtitle={`${t.garage.name}${t.forJob ? ` · ${t.forJob}` : ''}`}
      onClose={onClose}
      footer={
        t.status === 'assigned' ? (
          <ActionButton label="වෙළඳසැල කේතය පරීක්ෂා කළා · කොටස් ලැබුණා" icon="✓" variant="success" onPress={() => collectedAtCounter(t.id)} />
        ) : t.status === 'collected' ? (
          <ActionButton
            label={`${t.garage.name} වෙත භාර දුන්නා`}
            icon="📦"
            variant="primary"
            onPress={() => {
              deliverParts(t.id);
              onClose();
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.card}>
        {t.lines.map((l) => (
          <Text key={l.id} style={styles.line}>
            🔩 {l.name} ×{l.qty} · {t.partType}
          </Text>
        ))}
        <Text style={styles.sub}>
          {t.amount ? `ගරාජය ගෙවා ඇත · ${money(t.amount)}` : 'ගෙවීම කවුන්ටරයේදී'} · {formatTime(t.holdUntil)} දක්වා තබා ගනී
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>🏪 {t.shop.name}</Text>
        <Text style={styles.sub}>📍 {t.shop.address}</Text>
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${t.shop.phone.replace(/\s/g, '')}`)} />
          </View>
          <View style={styles.flex1}>
            <ActionButton label="දිශාවන්" icon="🗺️" variant="ghost" compact onPress={() => Linking.openURL(directionsUrl(t.shop.coords, from))} />
          </View>
        </View>
      </View>

      {t.status === 'assigned' ? (
        <CloseCode code={t.pickupCode} size={160} payload={pickupCodePayload(t.pickupCode)} title="කවුන්ටරයේදී පෙන්වන්න" caption="වෙළඳසැල QR එක ස්කෑන් කරයි, නැත්නම් ඉලක්කම් 6 කියන්න. කොටස් වර්ගය සහ ප්‍රමාණය පරීක්ෂා කර ගන්න." />
      ) : (
        <Text style={styles.done}>{t.status === 'collected' ? '✓ කොටස් ලැබුණා — ගරාජයට ගෙන යන්න.' : '✓ ගරාජයට භාර දුන්නා.'}</Text>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    actions: { flexDirection: 'row', gap: 8 },
    card: { padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    line: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    done: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText, textAlign: 'center' },
  })
);
