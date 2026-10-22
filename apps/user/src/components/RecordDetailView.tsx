import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, categoryInfo, Colors, FONTS, GlassIcon, Icon, themedStyles } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import { WorkshopTracker } from './workshop/WorkshopTracker';
import { TxnTag } from './TxnTag';
import { ChatButton } from './ChatButton';
import { CompletedRecord } from './CompletedRecord';
import { MOCK_GARAGES } from '../constants/mockData';
import { useVehicles } from '../context/VehiclesContext';
import { formatDate, money } from '../utils/format';
import type { OwnerWorkshop } from '../context/WorkshopContext';
import type { SOSRecord } from '../context/SOSRecordsContext';

export type RecordTarget = { kind: 'history'; workshop: OwnerWorkshop } | { kind: 'sos'; record: SOSRecord };

/** Everything about one finished job that has no booking or post of its own in this session: a past workshop job or an SOS service. */
export const RecordDetailView: React.FC<{ target: RecordTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { findVehicle } = useVehicles();
  const [shown, setShown] = React.useState<RecordTarget | null>(target);
  React.useEffect(() => {
    if (target) setShown(target);
  }, [target]);
  if (!target || !shown) return null;

  const w = shown.kind === 'history' ? shown.workshop : null;
  const r = shown.kind === 'sos' ? shown.record : null;
  const vehicle = w?.vehicleId ? findVehicle(w.vehicleId) : null;
  const total = w ? w.progress.handover?.bill.total ?? 0 : r!.total;
  const doneAt = w ? w.progress.closedAt ?? 0 : r!.completedAt;
  const title = w ? w.title ?? categoryInfo(w.categoryId).name : `SOS · ${r!.breakdown.label}`;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close details">
              <Icon name="x" size={16} color={Colors.textMain} />
            </Pressable>
            <Text style={styles.headerTitle}>{w ? 'සම්පූර්ණ කළ රැකියාව' : 'SOS සේවා විස්තර'}</Text>
            {w ? (
              <ChatButton size={36} target={{ id: w.id, title: w.garageName, subtitle: title, phone: MOCK_GARAGES.find((g) => g.name === w.garageName)?.phone, vehicle: vehicle ?? undefined }} />
            ) : (
              <ChatButton size={36} target={{ id: r!.id, title: r!.responder.name, subtitle: `SOS · ${r!.breakdown.label}`, phone: r!.responder.phone, profile: 'sos' }} />
            )}
            <View style={styles.donePill}>
              <Text style={styles.doneText}>✓ සම්පූර්ණයි</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.row}>
              <GlassIcon emoji={w ? w.icon ?? categoryInfo(w.categoryId).icon : r!.breakdown.icon} />
              <View style={styles.flex1}>
                <Text style={styles.bigTitle}>{title}</Text>
                <Text style={styles.sub}>
                  {w ? [vehicle?.name, vehicle?.plate].filter(Boolean).join(' · ') : `${r!.vehicleName} · ${r!.vehiclePlate}`}
                </Text>
                <TxnTag kind={w ? 'JOB' : 'SOS'} source={w ? w.id : r!.id} />
              </View>
            </View>

            <View style={styles.timing}>
              <Cell label="සම්පූර්ණ කළ දිනය" value={doneAt ? formatDate(doneAt) : '—'} />
              <View style={styles.divider} />
              <Cell label="මුළු මුදල" value={money(total)} color={Colors.primary} />
              <View style={styles.divider} />
              <Cell label={w ? 'වගකීම' : 'ශ්‍රේණිගත කිරීම'} value={w ? `මාස ${w.warrantyMonths}` : `${'★'.repeat(r!.rating)}${'☆'.repeat(5 - r!.rating)}`} color={w ? Colors.successText : Colors.warning} />
            </View>

            <Text style={styles.section}>{w ? 'ගරාජය' : 'සේවාව ලබා දුන්නේ'}</Text>
            <View style={styles.card}>
              {w ? (
                <Rows>
                  <Fact icon="🛠️" label="ගරාජය" value={w.garageName} />
                  {!!w.technician && <Fact icon="👷" label="කාර්මිකයා" value={w.technician} />}
                  {!!w.subService && <Fact icon="🔧" label="සේවාව" value={w.subService} />}
                  <Fact icon="🚛" label="සේවා ස්ථානය" value={w.doorstep ? 'නිවසටම පැමිණීම' : 'ගරාජයේදී'} />
                  {!!w.receiptNo && <Fact icon="🧾" label="රිසිට්පත" value={w.receiptNo} />}
                </Rows>
              ) : (
                <Rows>
                  <Fact icon={r!.responder.kind === 'garage' ? '🛠️' : '👷'} label={r!.responder.kind === 'garage' ? 'ගරාජය' : 'කාර්මිකයා'} value={r!.responder.name} />
                  <Fact icon="🔧" label="කාර්මිකයා" value={r!.responder.mechanic} />
                  <Fact icon="📞" label="දුරකථනය" value={r!.responder.phone} />
                  <Fact icon="📍" label="ස්ථානය" value={r!.address} />
                </Rows>
              )}
            </View>

            {r && (
              <>
                <Text style={styles.section}>ගාස්තු</Text>
                <View style={styles.card}>
                  <Rows>
                    <Line label="පැමිණීමේ ගාස්තුව" value={money(r.fees.callout)} />
                    <Line label="අලුත්වැඩියා ගාස්තුව" value={money(r.fees.repair)} />
                    {!!r.fees.part && <Line label={`OnMart කොටස (${r.fees.part.name}) · ${r.fees.part.shop}`} value={money(r.fees.part.amount)} />}
                    <Line label="මුළු මුදල" value={money(r.total)} bold />
                  </Rows>
                </View>
                {r.tags.length > 0 && (
                  <>
                    <Text style={styles.section}>ඔබගේ ශ්‍රේණිගත කිරීම</Text>
                    <View style={styles.card}>
                      <Text style={[styles.title, { color: Colors.warning }]}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                      <Text style={styles.sub}>{r.tags.join(' · ')}</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {w && <CompletedRecord id={w.id} />}

            {w && (
              <>
                <Text style={styles.section}>වැඩපළ වාර්තාව (රිසිට්පත, වගකීම, ඡායාරූප)</Text>
                <View style={styles.card}>
                  <WorkshopTracker id={w.id} detailed />
                </View>
              </>
            )}
          </ScrollView>

          {r && (
            <View style={styles.footer}>
              <ActionButton label="කාර්මිකයාට අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${r.responder.phone.replace(/\s/g, '')}`)} />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};


/** The rows of a card with a thin line between each of them. */
const Rows: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {React.Children.toArray(children)
      .filter(Boolean)
      .map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.rowLine} />}
          {c}
        </React.Fragment>
      ))}
  </>
);

const Cell: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.cell}>
    <Text style={styles.cellLabel}>{label}</Text>
    <Text style={[styles.cellValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const Fact: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.fact}>
    <Text style={styles.factIcon}>{icon}</Text>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

const Line: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.line}>
    <Text style={[styles.sub, styles.flex1, bold && styles.bold]}>{label}</Text>
    <Text style={[styles.sub, bold && styles.bold]}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    root: { flex: 1, backgroundColor: pageBg() },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, minHeight: 56, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: outline(), ...elevation1() },
    iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    donePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
    doneText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    body: { paddingHorizontal: 6, paddingTop: 16, gap: 12, paddingBottom: 28 },
    bigTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 17 },
    bold: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 12, padding: 16, gap: 10, ...elevation1() },
    timing: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    cell: { flex: 1, alignItems: 'center', gap: 3 },
    cellLabel: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    cellValue: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    divider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.borderColor },
    rowLine: { height: 1, backgroundColor: outline() },
    hr: { height: 1, backgroundColor: outline() },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    factIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    factLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, width: 92 },
    factValue: { flex: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    footer: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: outline(), backgroundColor: Colors.bgCard },
  })
);
