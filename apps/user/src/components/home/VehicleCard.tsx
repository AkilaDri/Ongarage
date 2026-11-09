import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, serviceReminder, themedStyles, type ServiceDetails } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import { nextServiceOf, useServiceRecords } from '../ServiceRecordsSheet';
import { PayStandingBanner } from '../PayStandingViews';
import { usePayStanding } from '../../context/PayStanding';
import { formatDate, money } from '../../utils/format';

/** The state words of a next service: each one has a word, so the colour is never the only signal. */
const STATE_TEXT: Record<'ok' | 'soon' | 'due' | 'overdue', string> = { ok: 'ok', soon: 'ළඟයි', due: 'දැන් සේවාව', overdue: 'ප්‍රමාදයි' };

/** The job the next service is for, in the owner's words. */
const serviceName = (s: ServiceDetails) => (s.kind === 'oil' ? 'ඔයිල් මාරුව' : s.kind === 'full' ? 'සම්පූර්ණ සේවාව' : 'සේවාව');

/** What the next service says: the date, the mileage, or both. */
const dueText = (s: ServiceDetails) => [s.nextServiceAt ? formatDate(s.nextServiceAt) : '', s.nextServiceKm ? `${s.nextServiceKm.toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ');

/**
 * The active vehicle's status on Home: its next service, what it has cost in garage jobs and SOS, and its last service.
 * Each fact belongs to one screen (docs/owner-vehicle-spine.md §5): the money leads to Activity, the records to Account.
 */
export const VehicleCard: React.FC<{ onOpenActivity: () => void; onOpenAccount: () => void; onOpenPayments: () => void }> = ({ onOpenActivity, onOpenAccount, onOpenPayments }) => {
  const { activeVehicle } = useVehicles();
  const pay = usePayStanding();
  const records = useServiceRecords(activeVehicle);
  const next = useMemo(() => nextServiceOf(records), [records]);
  const last = records.find((r) => r.kind === 'job' && r.service) ?? records[0];
  // Garage jobs and SOS for this vehicle. Parts bought in OnMart are not tied to a vehicle yet, so they are not counted here.
  const spent = records.reduce((sum, r) => sum + r.amount, 0);

  const reminder = next ? serviceReminder(next.service, Date.now(), next.service.mileageKm) : undefined;
  const tone = !reminder || reminder.state === 'ok' ? styles.statusOk : styles.statusDue;

  return (
    <View style={styles.card} accessibilityLabel={`${activeVehicle.name} ${activeVehicle.plate}`}>
      {(pay.warn || pay.limited) && (
        <View style={styles.payRow}>
          <PayStandingBanner onPress={onOpenPayments} />
        </View>
      )}
      <View style={styles.block}>
        <View style={styles.headRow}>
          <Text style={styles.label}>ඊළඟ සේවාව</Text>
          {reminder && (
            <View style={[styles.status, tone]}>
              <Text style={[styles.statusText, tone === styles.statusOk ? styles.statusTextOk : styles.statusTextDue]}>{STATE_TEXT[reminder.state]}</Text>
            </View>
          )}
        </View>
        <Text style={styles.value} numberOfLines={2}>
          {next ? `${serviceName(next.service)} · ${dueText(next.service)}` : 'සේවා දිනය තවම නැත'}
        </Text>
        {!next && <Text style={styles.hint}>ගරාජයෙන් සේවාවක් ගත් විට මෙහි පෙන්වයි.</Text>}
      </View>

      <View style={styles.divider} />

      <Pressable style={({ pressed }) => [styles.block, pressed && styles.pressed]} onPress={onOpenActivity} accessibilityRole="button" accessibilityLabel="Spending on this vehicle">
        <View style={styles.headRow}>
          <Text style={styles.label}>මේ වාහනයට වැය කළ මුදල</Text>
          <Text style={styles.more}>විස්තර ›</Text>
        </View>
        <Text style={styles.total}>{money(spent)}</Text>
        {records.length === 0 && <Text style={styles.hint}>තවම වියදමක් නැත</Text>}
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={({ pressed }) => [styles.lastRow, pressed && styles.pressed]} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel="Service records">
        <View style={styles.lastText}>
          <Text style={styles.label}>අවසන් සේවාව</Text>
          <Text style={styles.lastValue} numberOfLines={1}>
            {last ? `${last.title} · ${formatDate(last.at)}` : 'තවම නැත'}
          </Text>
        </View>
        <Text style={styles.more}>සේවා වාර්තා ›</Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { marginHorizontal: 6, borderRadius: 20, backgroundColor: Colors.bgCard, overflow: 'hidden' },
    payRow: { padding: 10 },
    block: { paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    value: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 22 },
    hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    // The spend total is the biggest number on the card; tabular figures so columns of money line up.
    total: { fontSize: 24, fontFamily: FONTS.titleBold, color: Colors.textMain, fontVariant: ['tabular-nums'] },
    more: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.primary },
    status: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    statusOk: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    statusDue: { backgroundColor: 'rgba(245, 158, 11, 0.18)' },
    statusText: { fontSize: 12, fontFamily: FONTS.bodyBold },
    statusTextOk: { color: Colors.successText },
    statusTextDue: { color: Colors.warning },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderColor, marginHorizontal: 16 },
    lastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
    lastText: { flex: 1, gap: 2 },
    lastValue: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    pressed: { opacity: 0.7 },
  })
);
