import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LkPlate, VehicleLabel, getThemeMode, themedStyles, type Vehicle } from '@ongarage/shared';
import { GarageHistoryTag } from './GarageHistory';

/**
 * The header of a job card, laid out like a Facebook post (the same as the garage app's job cards): a round picture, the garage's name in bold
 * with its New / Old tag, the date in grey under it; at the end three dots (touch for the details) with the price under them.
 */
export const PostHead: React.FC<{
  photo: React.ReactNode;
  name: string;
  /** The garage, for its New / Old tag (omitted for an SOS responder). */
  garage?: { id?: string; name: string };
  meta: string;
  price: string;
  onMore: () => void;
}> = ({ photo, name, garage, meta, price, onMore }) => (
  <View style={styles.head}>
    {photo}
    <View style={styles.flex1}>
      <View style={styles.nameRow}>
        <Text style={[styles.name, styles.shrink]} numberOfLines={1}>
          {name}
        </Text>
        {!!garage && <GarageHistoryTag garage={garage} compact />}
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {meta}
      </Text>
    </View>
    <View style={styles.priceCol}>
      <Pressable style={styles.dotsBtn} onPress={onMore} hitSlop={10} accessibilityLabel="Details">
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Pressable>
      <Text style={styles.price}>{price}</Text>
    </View>
  </View>
);

const KIND = {
  bid: { label: 'ලංසු', tone: 'blue' },
  direct: { label: 'Booking', tone: 'green' },
  sos: { label: 'SOS', tone: 'red' },
} as const;

/**
 * The body of the same card: one line with the number plate, the vehicle and the kind of job (bid, booking, SOS), then the job's subject in
 * bold under it, then whatever status goes with it.
 */
export const PostBody: React.FC<{
  vehicle?: Pick<Vehicle, 'type' | 'name' | 'plate' | 'registrationNo'>;
  kind: keyof typeof KIND;
  subject: string;
  onPress?: () => void;
  children?: React.ReactNode;
}> = ({ vehicle, kind, subject, onPress, children }) => {
  const k = KIND[kind];
  return (
    <Pressable style={styles.body} onPress={onPress} disabled={!onPress} accessibilityLabel={subject}>
      <View style={styles.oneLine}>
        {!!vehicle && <LkPlate plate={vehicle.registrationNo || vehicle.plate} stacked={vehicle.type === 'Motorbike'} small fontSize={11.5} />}
        {!!vehicle && (
          <VehicleLabel type={vehicle.type} style={styles.vehicle} numberOfLines={1}>
            {vehicle.name}
          </VehicleLabel>
        )}
        <View style={[styles.kind, k.tone === 'red' ? styles.kindRed : k.tone === 'green' ? styles.kindGreen : styles.kindBlue]}>
          <Text style={[styles.kindText, k.tone === 'red' ? styles.kindTextRed : k.tone === 'green' ? styles.kindTextGreen : styles.kindTextBlue]}>{k.label}</Text>
        </View>
      </View>
      <Text style={styles.subject}>{subject}</Text>
      {children}
    </Pressable>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    shrink: { flexShrink: 1 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    name: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    meta: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    priceCol: { alignItems: 'flex-end', gap: 2 },
    dotsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 6 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textMuted },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { gap: 10 },
    oneLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 8 },
    vehicle: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 22 },
    kind: { paddingHorizontal: 8, height: 20, justifyContent: 'center', borderRadius: 6 },
    kindBlue: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    kindGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    kindRed: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    kindText: { fontSize: 10.5, fontWeight: '800' },
    kindTextBlue: { color: dark() ? '#8db1ff' : '#1a73e8' },
    kindTextGreen: { color: Colors.success },
    kindTextRed: { color: Colors.errorText },
    subject: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 22 },
  })
);
