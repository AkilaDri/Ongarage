import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_SERVICE_HISTORY } from '../constants/mockData';
import { SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { EmptyState, GlassIcon } from '@ongarage/shared';
import { useBids } from '../context/BidsContext';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl } from '@ongarage/shared';

const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

const formatDate = (d: Date) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
const money = (n: number) => `රු. ${n.toLocaleString()}`;

export const ActivityScreen: React.FC<{ onOpenBids: () => void }> = ({ onOpenBids }) => {
  const { jobs } = useBids();
  const { findVehicle } = useVehicles();
  const vehicleName = (id: string) => findVehicle(id).name;
  const user = useUserLocation();

  const ongoing = jobs
    .filter((j) => j.acceptedBidId)
    .map((j) => ({ job: j, bid: j.bids.find((b) => b.id === j.acceptedBidId)! }))
    .filter((x) => x.bid);

  const totalSpent = MOCK_SERVICE_HISTORY.reduce((sum, h) => sum + h.price, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ක්‍රියාකාරකම්</Text>
        <Text style={styles.sub}>ඔබගේ වෙන් කිරීම් සහ සේවා ඉතිහාසය</Text>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Stat value={String(ongoing.length)} label="දැනට පවතින" color={Colors.warning} />
          <Stat value={String(MOCK_SERVICE_HISTORY.length)} label="සම්පූර්ණ කළ" color={Colors.success} />
          <Stat value={money(totalSpent)} label="මුළු වියදම" color={Colors.primary} />
        </View>

        <Text style={styles.sectionLabel}>දැනට පවතින වෙන් කිරීම්</Text>
        {ongoing.length === 0 ? (
          <View style={styles.card}>
            <EmptyState icon="📅" title="සක්‍රීය වෙන් කිරීම් නැත" text="ලංසුවක් පිළිගත් විට ඔබගේ වෙන් කිරීම මෙහි පෙන්වනු ඇත." />
            <Pressable onPress={onOpenBids} style={styles.selfCenter}>
              <Text style={styles.link}>මගේ ලංසු බලන්න →</Text>
            </Pressable>
          </View>
        ) : (
          ongoing.map(({ job, bid }) => {
            const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
            return (
              <View key={job.id} style={[styles.card, styles.cardOngoing]}>
                <View style={styles.row}>
                  <GlassIcon emoji={cat?.icon ?? '🔧'} />
                  <View style={styles.flex1}>
                    <Text style={styles.title}>{cat?.name ?? 'Service'}</Text>
                    <Text style={styles.sub}>
                      {bid.garageName} · {vehicleName(job.vehicleId)}
                    </Text>
                    <Text style={styles.sub}>වෙන් කළේ {formatDate(new Date(bid.submittedAt))}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.price}>{money(bid.price)}</Text>
                    <View style={[styles.status, styles.statusOngoing]}>
                      <Text style={[styles.statusText, { color: Colors.warning }]}>● වෙන් කළා</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>
                    🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours}
                  </Text>
                  <Pressable onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))}>
                    <Text style={styles.link}>🗺️ දිශාවන්</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionLabel}>සම්පූර්ණ කළ සේවා</Text>
        {MOCK_SERVICE_HISTORY.map((h) => (
          <View key={h.id} style={[styles.card, styles.row]}>
            <GlassIcon emoji={h.icon} />
            <View style={styles.flex1}>
              <Text style={styles.title}>{h.title}</Text>
              <Text style={styles.sub}>
                {h.garage} · {formatDate(new Date(h.date))}
              </Text>
              <Text style={styles.sub}>{vehicleName(h.vehicleId)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.price}>{money(h.price)}</Text>
              <View style={[styles.status, styles.statusDone]}>
                <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  selfCenter: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  headerTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  body: { padding: 16, gap: 12, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.bgCard,
  },
  statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
  statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5, marginTop: 6 },
  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
  cardOngoing: { borderColor: 'rgba(245, 158, 11, 0.4)' },
  divider: { height: 1, backgroundColor: Colors.borderColor },
  title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  right: { alignItems: 'flex-end', gap: 5 },
  price: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.primary },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusOngoing: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  statusDone: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  statusText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold },
}));
