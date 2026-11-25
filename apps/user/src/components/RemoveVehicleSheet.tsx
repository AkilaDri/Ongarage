import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LkPlate, themedStyles, type Vehicle } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { FlowButton } from './FlowButton';
import { useVehicles } from '../context/VehiclesContext';
import { useBids, biddingEndsAt } from '../context/BidsContext';
import { useBookings } from '../context/BookingsContext';
import { useWorkshops } from '../context/WorkshopContext';

/** What is still running for a vehicle: a repair in the garage, a quote still open, a booking waiting for the garage. Removing the vehicle waits for these. */
export const useOpenWork = () => {
  const { jobs } = useBids();
  const { bookings } = useBookings();
  const { workshops } = useWorkshops();
  return (vehicleId: string): string[] => {
    const now = Date.now();
    const lines: string[] = [];
    Object.values(workshops).forEach((w) => {
      if (w.vehicleId === vehicleId && w.progress.stage !== 'closed' && w.progress.stage !== 'declined') lines.push(`${w.garageName} හි රැකියාව`);
    });
    jobs.forEach((j) => {
      if (j.vehicleId !== vehicleId || workshops[j.id]) return;
      const open = j.bids.length > 0 || now < biddingEndsAt(j);
      if (open) lines.push('ලංසු ඉල්ලීමක්');
    });
    bookings.forEach((b) => {
      if (b.vehicleId === vehicleId && !workshops[b.id] && (b.status === 'requested' || b.status === 'proposed')) lines.push(`${b.garage.name} වෙත වෙන්කිරීමක්`);
    });
    return lines;
  };
};

/**
 * Taking a vehicle out of the app (sold, scrapped). Nothing is deleted: its past jobs and service records stay, and it can be brought back. It waits while work is
 * running for it, and the last vehicle cannot go (the app needs one).
 */
export const RemoveVehicleSheet: React.FC<{ vehicle: Vehicle | null; onClose: () => void; onRemoved: (vehicle: Vehicle) => void }> = ({ vehicle, onClose, onRemoved }) => {
  const { vehicles, removeVehicle } = useVehicles();
  const openWork = useOpenWork();
  const work = vehicle ? openWork(vehicle.id) : [];
  const last = vehicles.length <= 1;
  const blocked = work.length > 0 || last;
  return (
    <Sheet visible={!!vehicle} title={vehicle ? 'වාහනය ඉවත් කරන්න?' : ''} onClose={onClose}>
      {vehicle && (
        <>
          <View style={styles.plate}>
            <LkPlate plate={vehicle.plate} />
            <Text style={styles.name}>{vehicle.name}</Text>
          </View>
          {last ? (
            <Text style={styles.warn}>අවම වශයෙන් එක් වාහනයක් අවශ්‍යයි. මෙය ඉවත් කිරීමට පෙර වෙනත් වාහනයක් එක් කරන්න.</Text>
          ) : work.length > 0 ? (
            <>
              <Text style={styles.warn}>මෙම වාහනයට තවමත් ක්‍රියාත්මක වන වැඩ ඇත. ඒවා අවසන් වූ පසු ඉවත් කළ හැක:</Text>
              {work.map((l, i) => (
                <Text key={i} style={styles.line}>• {l}</Text>
              ))}
            </>
          ) : (
            <Text style={styles.body}>
              මෙම වාහනය ලැයිස්තුවලින් ඉවත් වේ. එහි අතීත රැකියා, බිල්පත් සහ සේවා වාර්තා ඔබට තවමත් බලාගත හැක. පසුව “ඉවත් කළ වාහන” වලින් නැවත එක් කළ හැක.
            </Text>
          )}
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <FlowButton label="අවලංගුයි" variant="ghost" onPress={onClose} />
            </View>
            <View style={styles.flex1}>
              <FlowButton
                label="ඉවත් කරන්න"
                variant="primary"
                disabled={blocked}
                onPress={() => {
                  if (removeVehicle(vehicle.id)) onRemoved(vehicle);
                }}
              />
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
};

/** The vehicles that were removed, each with a button to bring it back. */
export const RemovedVehiclesSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { archivedVehicles, restoreVehicle } = useVehicles();
  return (
    <Sheet visible={visible} title="ඉවත් කළ වාහන" onClose={onClose}>
      {archivedVehicles.length === 0 && <Text style={styles.body}>ඉවත් කළ වාහන නැත.</Text>}
      {archivedVehicles.map((v) => (
        <View key={v.id} style={styles.removedRow}>
          <View style={styles.flex1}>
            <Text style={styles.name}>{v.name}</Text>
            <Text style={styles.line}>{v.plate}</Text>
          </View>
          <FlowButton label="නැවත එක් කරන්න" variant="primary" onPress={() => restoreVehicle(v.id)} />
        </View>
      ))}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    plate: { gap: 8, alignItems: 'flex-start' },
    name: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    warn: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    line: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    removedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  })
);
