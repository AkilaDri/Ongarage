import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { useParts } from '../context/PartsContext';
import { callCustomer, openDirections, sendGarageLocation, serviceMode } from '../utils/contact';
import { ago, formatDate, formatTime } from '../utils/format';
import type { Booking } from '../types';

/** Who travels, in one line, so every booking reads the same way. */
export const ServiceModeNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const mode = serviceMode(b);
  if (mode === 'roadside') {
    return (
      <View style={[styles.note, styles.noteRoadside]}>
        <Text style={styles.noteTitle}>🚨 මාර්ගයේදීම සේවාව (SOS)</Text>
      </View>
    );
  }
  if (mode === 'doorstep') {
    return (
      <View style={[styles.note, styles.noteDoorstep]}>
        <Text style={styles.noteTitle}>🚛 නිවසටම පැමිණීම — ඔබ පාරිභෝගිකයා වෙත යා යුතුයි</Text>
        <Text style={styles.noteSub}>📍 {b.address}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.note, styles.noteWalkin]}>
      <Text style={styles.noteTitle}>🏠 පාරිභෝගිකයා වාහනය ගරාජයට ගෙන එයි</Text>
      <Text style={styles.noteSub}>
        {b.locationSharedAt
          ? `✓ ඔබගේ ස්ථානය සහ දුරකථන අංකය යවා ඇත · ${ago(Date.now() - b.locationSharedAt)} — මගදී ඔවුන්ට ඔබව ඇමතිය හැක.`
          : 'ඔබගේ ස්ථානය තවම යවා නැත.'}
      </Text>
    </View>
  );
};

/**
 * The same controls on every upcoming booking: call the customer, then either
 * directions (garage goes to them) or send the garage's location (they come in),
 * then start / finish the work.
 */
export const BookingActions: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { profile, startBooking, completeBooking, shareLocation } = useGarage();
  const { requestFor } = useParts();
  const mode = serviceMode(b);
  // Starting before ordered parts arrive is allowed (they may be in stock), but asks twice.
  const [warned, setWarned] = useState(false);
  const parts = requestFor(b.id);
  const partsPending = !!parts && parts.status !== 'received';
  const start = () => {
    if (partsPending && !warned) {
      setWarned(true);
      return;
    }
    startBooking(b.id);
  };

  if (b.status === 'completed') {
    return <ActionButton label="පාරිභෝගිකයා අමතන්න" icon="📞" variant="ghost" compact onPress={() => callCustomer(b.customer.phone)} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => callCustomer(b.customer.phone)} />
        </View>
        <View style={styles.flex1}>
          {mode === 'walkin' ? (
            <ActionButton
              label="ස්ථානය යවන්න"
              icon="📍"
              variant="ghost"
              compact
              onPress={() => {
                sendGarageLocation(profile, b, `${formatDate(b.scheduledAt)} · ${formatTime(b.scheduledAt)}`);
                shareLocation(b.id);
              }}
            />
          ) : (
            <ActionButton label="දිශාවන්" icon="🗺️" variant="ghost" compact onPress={() => openDirections(b, profile)} />
          )}
        </View>
      </View>
      {b.status === 'scheduled' && warned && partsPending && <Text style={styles.warn}>⚠️ ඇණවුම් කළ කොටස් තවම ලැබී නැත. කෙසේ වෙතත් ආරම්භ කිරීමට නැවත ඔබන්න.</Text>}
      {b.status === 'scheduled' ? (
        <ActionButton
          label={warned && partsPending ? 'කෙසේ වෙතත් අරඹන්න' : mode === 'walkin' ? 'වාහනය පැමිණියා · වැඩ අරඹන්න' : 'වැඩ අරඹන්න'}
          icon="🔧"
          variant="primary"
          compact
          onPress={start}
        />
      ) : (
        <ActionButton label="සම්පූර්ණ කළා" icon="✓" variant="success" compact onPress={() => completeBooking(b.id)} />
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    note: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 2 },
    noteDoorstep: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.4)' },
    noteWalkin: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)' },
    noteRoadside: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.35)' },
    noteTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 16 },
    noteSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
