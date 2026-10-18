import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { categoryInfo, Colors, EmptyState, FONTS, getThemeMode, SERVICE_FLUIDS, SERVICE_KINDS, serviceReminder, themedStyles, vehicleIcon, type ServiceDetails, type Vehicle } from '@ongarage/shared';
import { useWorkshops } from '../context/WorkshopContext';
import { useSOSRecords } from '../context/SOSRecordsContext';
import { formatDate, money } from '../utils/format';
import { elevation1, outline } from '../utils/material';
import { Sheet } from './Sheet';

/** One finished service of a vehicle, as the garage closed it. */
export type ServiceRecord = {
  id: string;
  icon: string;
  title: string;
  garage: string;
  at: number;
  amount: number;
  receiptNo?: string;
  warrantyUntil?: number;
  technician?: string;
  rating?: number;
  kind: 'job' | 'sos';
  /** A routine service: what was done, the mileage and the next service (written by the garage at handover). */
  service?: ServiceDetails;
};

/** The latest routine service of a vehicle that says when the next one is due, with how close that is. */
export const nextServiceOf = (records: ServiceRecord[]) => {
  const latest = records.find((r) => r.service && (r.service.nextServiceAt || r.service.nextServiceKm));
  if (!latest?.service) return undefined;
  return { record: latest, service: latest.service, reminder: serviceReminder(latest.service, Date.now(), latest.service.mileageKm) };
};

/** Every finished service of one vehicle (garage jobs closed with the owner's code, and SOS services), newest first. */
export const useServiceRecords = (vehicle: Vehicle): ServiceRecord[] => {
  const { workshops } = useWorkshops();
  const { records } = useSOSRecords();
  return useMemo(() => {
    const jobs: ServiceRecord[] = Object.values(workshops)
      .filter((w) => w.progress.stage === 'closed' && w.vehicleId === vehicle.id)
      .map((w) => ({
        id: w.id,
        icon: w.icon ?? '🔧',
        title: w.title ?? categoryInfo(w.categoryId).name,
        garage: w.garageName,
        at: w.progress.closedAt ?? w.scheduledAt,
        amount: w.progress.handover?.bill.total ?? w.agreedPrice,
        receiptNo: w.receiptNo,
        warrantyUntil: w.progress.warrantyUntil,
        technician: w.technician,
        rating: w.review?.rating,
        kind: 'job' as const,
        service: w.progress.handover?.service,
      }));
    const sos: ServiceRecord[] = records
      .filter((r) => r.vehiclePlate === vehicle.plate)
      .map((r) => ({ id: r.id, icon: r.breakdown.icon, title: `SOS · ${r.breakdown.label}`, garage: r.responder.name, at: r.completedAt, amount: r.total, rating: r.rating, kind: 'sos' as const }));
    return [...jobs, ...sos].sort((a, b) => b.at - a.at);
  }, [workshops, records, vehicle.id, vehicle.plate]);
};

/**
 * A vehicle's service history in Profile: what was done, by which garage, when, what it cost, the receipt and the warranty.
 * Each finished job is its own record.
 */
export const ServiceRecordsSheet: React.FC<{ vehicle: Vehicle | null; onClose: () => void }> = ({ vehicle, onClose }) => {
  if (!vehicle) return null;
  return <Body vehicle={vehicle} onClose={onClose} />;
};

const Body: React.FC<{ vehicle: Vehicle; onClose: () => void }> = ({ vehicle, onClose }) => {
  const list = useServiceRecords(vehicle);
  const spent = list.reduce((s, r) => s + r.amount, 0);
  return (
    <Sheet visible title="සේවා වාර්තා" subtitle={`${vehicleIcon(vehicle.type)} ${vehicle.name} · ${vehicle.plate}`} onClose={onClose}>
      {list.length === 0 ? (
        <EmptyState icon="🧾" title="සේවා වාර්තා නැත" text="ගරාජයක් මගින් මෙම වාහනයේ රැකියාවක් අවසන් කළ විට (ඔබගේ කේතයෙන් වසා දැමූ පසු) එහි වාර්තාව මෙහි එකතු වේ." />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.sumCol}>
              <Text style={styles.sumValue}>{list.length}</Text>
              <Text style={styles.sumLabel}>සේවා</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumCol}>
              <Text style={styles.sumValue}>{money(spent)}</Text>
              <Text style={styles.sumLabel}>මුළු වියදම</Text>
            </View>
          </View>
          {list.map((r) => (
            <View key={r.id} style={styles.record} accessibilityLabel={`Service record ${r.title}`}>
              <View style={styles.recordTop}>
                <View style={styles.iconTile}>
                  <Text style={styles.icon}>{r.icon}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{r.garage}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{money(r.amount)}</Text>
                  <Text style={styles.sub}>{formatDate(r.at)}</Text>
                </View>
              </View>
              {!!r.service && (
                <View style={styles.serviceBox}>
                  <Text style={styles.serviceKind}>🛠️ {SERVICE_KINDS.find((k) => k.id === r.service?.kind)?.label}</Text>
                  {r.service.fluids.length > 0 && <Text style={styles.serviceLine}>වෙනස් කළ තරල: {r.service.fluids.map((f) => SERVICE_FLUIDS.find((x) => x.id === f)?.label).join(' · ')}</Text>}
                  <Text style={styles.serviceLine}>📏 මීටර් කියවීම: {r.service.mileageKm.toLocaleString('en-US')} km</Text>
                  {(r.service.nextServiceKm || r.service.nextServiceAt) && (
                    <Text style={styles.serviceNext}>🔔 ඊළඟ සේවාව: {[r.service.nextServiceAt ? formatDate(r.service.nextServiceAt) : '', r.service.nextServiceKm ? `${r.service.nextServiceKm.toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ')}</Text>
                  )}
                  {!!r.service.notes && <Text style={styles.serviceLine}>📝 {r.service.notes}</Text>}
                </View>
              )}
              <View style={styles.chips}>
                <View style={styles.chip}><Text style={styles.chipText}>{r.kind === 'sos' ? '🚨 SOS' : '🔧 ගරාජ රැකියාව'}</Text></View>
                {!!r.receiptNo && <View style={styles.chip}><Text style={styles.chipText}>🧾 {r.receiptNo}</Text></View>}
                {!!r.warrantyUntil && <View style={styles.chip}><Text style={styles.chipText}>🛡️ වගකීම {formatDate(r.warrantyUntil)} දක්වා</Text></View>}
                {!!r.technician && <View style={styles.chip}><Text style={styles.chipText}>👷 {r.technician}</Text></View>}
                {!!r.rating && <View style={styles.chip}><Text style={styles.chipText}>★ {r.rating}</Text></View>}
              </View>
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    summary: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.12)' : '#e8f0fe', paddingVertical: 12 },
    sumCol: { flex: 1, alignItems: 'center', gap: 2 },
    sumDivider: { width: 1, height: 30, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    sumValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    sumLabel: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    record: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), padding: 14, gap: 10, ...elevation1() },
    recordTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconTile: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    icon: { fontSize: 20 },
    title: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    right: { alignItems: 'flex-end' },
    amount: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    serviceBox: { gap: 4, padding: 10, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f8fafd', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    serviceKind: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    serviceLine: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    serviceNext: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  })
);
