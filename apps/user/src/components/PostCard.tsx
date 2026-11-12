import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GridRow, LkPlate, getThemeMode, themedStyles, type Vehicle, MoneyText } from '@ongarage/shared';
import { GarageHistoryTag } from './GarageHistory';

/**
 * The header of a job card, laid out like a Facebook post (the same as the garage app's job cards): a round picture, the garage's name in bold
 * with its New / Old tag, the date in grey under it; at the end three dots (touch for the details) with the price under them. When a `chat` button is given it
 * stands in the corner instead of the three dots (the card's details stay one touch away on the card itself).
 */
export const PostHead: React.FC<{
  photo: React.ReactNode;
  name: string;
  /** The garage, for its New / Old tag (omitted for an SOS responder). */
  garage?: { id?: string; name: string };
  meta: string;
  /** Kept for the callers that pass it; the three dots are gone (the card itself opens the details). */
  onMore?: () => void;
  /** The kind of job (bid, booking, SOS): a small tag in the top right corner, like the garage app's cards. */
  kind?: keyof typeof KIND;
  /** How far the header reaches into the card's side padding (px), so it sits about 3px from the edge. */
  bleed?: number;
  /** The OnChat button for this job: shown in the top right corner in place of the three dots. */
  chat?: React.ReactNode;
}> = ({ photo, name, garage, meta, kind, chat, bleed = 0 }) => (
  <View style={[styles.head, !!bleed && { marginHorizontal: -bleed }]}>
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
      {!!kind && <KindTag kind={kind} />}
      {chat}
    </View>
  </View>
);

/** A job's price on a line of its own (label at the left, the price at the right): above the warranty line of a finished job, above the step bar of a running one. */
/** The green "✓ සම්පූර්ණයි" tag of a finished job. */
export const DoneTag: React.FC = () => (
  <View style={styles.doneTag}>
    <Text style={styles.doneTagText}>✓ සම්පූර්ණයි</Text>
  </View>
);

/** The price of a finished job stands beside its rating (the bottom right of the body). */
export const PriceText: React.FC<{ price: string }> = ({ price }) => <MoneyText style={styles.price}>{price}</MoneyText>;

export const PostPrice: React.FC<{ price: string }> = ({ price }) => (
  <GridRow left={<Text style={styles.priceLabel}>💰 මුළු මිල</Text>} right={<MoneyText style={styles.price}>{price}</MoneyText>} />
);

const KIND = {
  bid: { label: 'ලංසු', tone: 'blue' },
  direct: { label: 'Booking', tone: 'green' },
  sos: { label: 'SOS', tone: 'red' },
} as const;

/** The small kind tag (bid, booking, SOS). */
export const KindTag: React.FC<{ kind: keyof typeof KIND }> = ({ kind }) => {
  const k = KIND[kind];
  return (
    <View style={[styles.kind, k.tone === 'red' ? styles.kindRed : k.tone === 'green' ? styles.kindGreen : styles.kindBlue]}>
      <Text style={[styles.kindText, k.tone === 'red' ? styles.kindTextRed : k.tone === 'green' ? styles.kindTextGreen : styles.kindTextBlue]}>{k.label}</Text>
    </View>
  );
};

/**
 * The body of the same card: one line with the number plate, the vehicle and the kind of job (bid, booking, SOS), then the job's subject in
 * bold under it, then whatever status goes with it.
 */
export const PostBody: React.FC<{
  vehicle?: Pick<Vehicle, 'type' | 'name' | 'plate' | 'registrationNo'>;
  kind: keyof typeof KIND;
  subject: string;
  /** The job's price, on the vehicle's line at the right (the same row as the vehicle, not under the corner button). */
  price?: string;
  /** A running job: the kind chip (and status) stands on the vehicle's row and the price on the subject's row, in place of each other. */
  swap?: boolean;
  /** Replaces the price on the vehicle's row (a finished job puts its "✓ සම්පූර්ණයි" tag there and the price beside the rating). */
  topRight?: React.ReactNode;
  onPress?: () => void;
  /** A status tag set on the subject's line, at the right end. */
  status?: React.ReactNode;
  /** How far the soft box reaches into the card's side padding (px). */
  bleed?: number;
  children?: React.ReactNode;
}> = ({ vehicle, subject, price, topRight, onPress, status, bleed = 0, children }) => {
  return (
    <Pressable style={styles.body} onPress={onPress} disabled={!onPress} accessibilityLabel={subject}>
      {/* The same as the garage app's cards: the subject on its own line (a status tag at the right), then the vehicle (number and model) with the price beside it. */}
      <View style={[styles.panel, !!bleed && { marginHorizontal: -bleed }]}>
      <View style={styles.panelIn}>
      <GridRow left={<Text style={styles.subject}>{subject}</Text>} right={status} />
      <GridRow
        left={
          !!vehicle && (
            <View style={styles.oneLine}>
              <LkPlate plate={vehicle.registrationNo || vehicle.plate} stacked={vehicle.type === 'Motorbike'} small fontSize={11.5} />
              <Text style={[styles.vehicle, styles.shrink]} numberOfLines={1}>
                {vehicle.name}
              </Text>
            </View>
          )
        }
        right={topRight ?? (!!price ? <MoneyText style={styles.price}>{price}</MoneyText> : undefined)}
      />
      </View>
      </View>
      {children}
    </Pressable>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    shrink: { flexShrink: 1 },
    // The picture and the corner buttons sit nearer the card's edges (only about 3px of side padding, the body keeps 16).
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    name: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    meta: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    priceCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dotsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 6 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textMuted },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceLabel: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    rightStack: { alignItems: 'flex-end', gap: 6 },
    doneTag: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.16)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
    doneTagText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    tags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    body: { gap: 24 },
    // The subject, the vehicle and the price in one soft box (the gap stays under 6 so the shared card rule leaves it alone).
    panelIn: { gap: 14, marginHorizontal: 6 },
    panel: { gap: 5, padding: 12, paddingHorizontal: 5, borderRadius: 12, borderWidth: 1, borderColor: dark() ? Colors.borderColor : '#e2e8f0', backgroundColor: dark() ? Colors.subtleFill : '#f8fafc' },
    oneLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 8 },
    vehicle: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
    kind: { paddingHorizontal: 8, height: 20, justifyContent: 'center', borderRadius: 6 },
    kindBlue: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    kindGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    kindRed: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    kindText: { fontSize: 10.5, fontWeight: '800' },
    kindTextBlue: { color: dark() ? '#8db1ff' : '#1a73e8' },
    kindTextGreen: { color: Colors.success },
    kindTextRed: { color: Colors.errorText },
    subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    subject: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 18 },
  })
);
