import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, LkPlate, MoneyText, themedStyles, type Garage, type Vehicle } from '@ongarage/shared';
import { CategoryPhoto } from './home/CategoryPhoto';
import { GarageHistoryTag } from './GarageHistory';

export type SummaryLine = { icon: string; text: string; /** Opens the step where this was chosen. */ onChange?: () => void; label: string };

/**
 * The booking as it will appear in the Activity tab, shown before it is sent: who (the service's picture, the garage and its address), what (a soft box with
 * the service, the problem and the vehicle's plate), then one short line for each other choice, each opening its step again, and the rule for the answer.
 */
export const BookingSummaryCard: React.FC<{ garage: Garage; categoryId: string; title: string; description?: string; vehicle?: Vehicle; lines: SummaryLine[]; note: string; /** A price already agreed (an accepted quote), shown in the box so it is seen before sending. */ price?: string }> = ({ garage, categoryId, title, description, vehicle, lines, note, price }) => (
  <View style={styles.card} accessibilityLabel="Summary">
    <View style={styles.head}>
      <CategoryPhoto categoryId={categoryId} size={36} />
      <View style={styles.flex1}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, styles.shrink]}>{garage.name}</Text>
          <GarageHistoryTag garage={garage} part="tag" />
        </View>
        {!!garage.address && <Text style={styles.sub}>{garage.address}</Text>}
      </View>
      <View style={styles.kind}>
        <Text style={styles.kindText}>වෙන්කිරීම</Text>
      </View>
    </View>

    <View style={styles.box}>
      <Text style={styles.jobTitle}>{title}</Text>
      {!!description && <Text style={styles.desc} numberOfLines={2}>{description}</Text>}
      {!!vehicle && (
        <View style={styles.vehicleRow}>
          <LkPlate plate={vehicle.registrationNo || vehicle.plate} stacked={vehicle.type === 'Motorbike'} small />
          <Text style={styles.vehicleName}>{vehicle.name}</Text>
        </View>
      )}
      {!!price && (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>එකඟ වූ මිල</Text>
          <MoneyText icon style={styles.price}>{price}</MoneyText>
        </View>
      )}
    </View>

    <View>
      {lines.map((l) => (
        <Pressable key={l.label} style={styles.line} onPress={l.onChange} disabled={!l.onChange} accessibilityRole={l.onChange ? 'button' : undefined} accessibilityLabel={l.onChange ? `Change ${l.label}` : l.label}>
          <Text style={styles.lineIcon}>{l.icon}</Text>
          <Text style={styles.lineText}>{l.text}</Text>
          {!!l.onChange && <Text style={styles.chevron}>›</Text>}
        </Pressable>
      ))}
    </View>

    <View style={styles.noteRow}>
      <Text style={styles.note}>{note}</Text>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    shrink: { flexShrink: 1 },
    card: { paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    name: { fontSize: 14, lineHeight: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    kind: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff' },
    kindText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    box: { gap: 8, padding: 12, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f1f2' },
    jobTitle: { fontSize: 14.5, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    desc: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vehicleName: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e2e2e6' },
    priceLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    price: { fontSize: 20, lineHeight: 26, fontFamily: FONTS.titleBold, color: Colors.success },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 6 },
    lineIcon: { width: 20, fontSize: 14, textAlign: 'center' },
    lineText: { flex: 1, fontSize: 13.5, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chevron: { fontSize: 18, color: Colors.textMuted },
    noteRow: { borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8', paddingTop: 10 },
    note: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
