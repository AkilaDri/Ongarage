import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { categoryInfo, SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { EmptyState, GlassIcon, SwipeCard } from '@ongarage/shared';
import { OwnerDetailView, type OwnerDetailTarget } from '../components/OwnerDetailView';
import { useBids } from '../context/BidsContext';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl } from '@ongarage/shared';
import { useBookings } from '../context/BookingsContext';
import { DirectBookingCard } from '../components/DirectBookingCard';
import { WorkshopTracker } from '../components/workshop/WorkshopTracker';
import { useWorkshops } from '../context/WorkshopContext';
import { money } from '../utils/format';
import type { DirectBooking } from '../types';

const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

const formatDate = (d: Date) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;

export const ActivityScreen: React.FC<{ onOpenBids: () => void; onBookAgain: (b: DirectBooking) => void }> = ({ onOpenBids, onBookAgain }) => {
  const { jobs } = useBids();
  const { bookings } = useBookings();
  const { workshops } = useWorkshops();
  // A workshop job the owner stopped, or saw close, moves down to the completed list.
  const finished = (id: string) => {
    const w = workshops[id];
    return w?.progress.stage === 'declined' || (w?.progress.stage === 'closed' && !!w.acknowledged);
  };
  const liveBookings = bookings.filter((b) => (b.status === 'requested' || b.status === 'proposed' || b.status === 'confirmed') && !finished(b.id));
  const doneBookings = bookings.filter((b) => b.status === 'confirmed' && finished(b.id));
  const endedBookings = bookings.filter((b) => !liveBookings.includes(b) && !doneBookings.includes(b));
  // Swipe a booking for everything about it (follows the live record).
  const [detail, setDetail] = useState<{ kind: 'job' | 'booking'; id: string } | null>(null);
  const detailTarget: OwnerDetailTarget | null = (() => {
    if (!detail) return null;
    if (detail.kind === 'booking') {
      const b = bookings.find((x) => x.id === detail.id);
      return b ? { kind: 'booking', booking: b } : null;
    }
    const j = jobs.find((x) => x.id === detail.id);
    return j ? { kind: 'job', job: j } : null;
  })();
  const bookingCard = (b: (typeof bookings)[number]) => (
    <SwipeCard key={b.id} style={styles.swipeWrap} onOpen={() => setDetail({ kind: 'booking', id: b.id })}>
      <DirectBookingCard booking={b} onBookAgain={onBookAgain} onOpen={() => setDetail({ kind: 'booking', id: b.id })} />
    </SwipeCard>
  );
  const { findVehicle } = useVehicles();
  const vehicleName = (id: string) => findVehicle(id).name;
  const user = useUserLocation();

  const accepted = jobs
    .filter((j) => j.acceptedBidId)
    .map((j) => ({ job: j, bid: j.bids.find((b) => b.id === j.acceptedBidId)! }))
    .filter((x) => x.bid);
  const ongoing = accepted.filter((x) => !finished(x.job.id));
  const doneJobs = accepted.filter((x) => finished(x.job.id));

  const bidCard = (job: (typeof jobs)[number], bid: (typeof jobs)[number]['bids'][number]) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
    return (
      <SwipeCard key={job.id} style={[styles.card, !finished(job.id) && styles.cardOngoing]} onOpen={() => setDetail({ kind: 'job', id: job.id })}>
        <Pressable style={styles.row} onPress={() => setDetail({ kind: 'job', id: job.id })} accessibilityLabel={`${cat?.name ?? 'Job'} booking details`}>
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
            <View style={[styles.status, finished(job.id) ? styles.statusDone : styles.statusOngoing]}>
              <Text style={[styles.statusText, { color: finished(job.id) ? Colors.success : Colors.warning }]}>{finished(job.id) ? '✓ සම්පූර්ණයි' : '● වෙන් කළා'}</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.divider} />
        <WorkshopTracker id={job.id} />
        <View style={styles.rowBetween}>
          <Text style={styles.sub}>
            🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours}
          </Text>
          <Pressable onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))}>
            <Text style={styles.link}>🗺️ දිශාවන්</Text>
          </Pressable>
        </View>
      </SwipeCard>
    );
  };

  // Past jobs with no booking / post in this session: closed workshop records (receipts, warranty).
  const history = Object.values(workshops)
    .filter((w) => w.progress.stage === 'closed' && w.acknowledged && !bookings.some((b) => b.id === w.id) && !jobs.some((j) => j.id === w.id))
    .sort((a, b) => (b.progress.closedAt ?? 0) - (a.progress.closedAt ?? 0));
  const totalSpent = Object.values(workshops).reduce((s, w) => s + (w.progress.stage === 'closed' ? (w.progress.handover?.bill.total ?? 0) : 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Stat value={String(ongoing.length + liveBookings.length)} label="දැනට පවතින" color={Colors.warning} />
          <Stat value={String(history.length + doneBookings.length + doneJobs.length)} label="සම්පූර්ණ කළ" color={Colors.success} />
          <Stat value={money(totalSpent)} label="මුළු වියදම" color={Colors.primary} />
        </View>

        <Text style={styles.sectionLabel}>දැනට පවතින වෙන් කිරීම්</Text>
        {(liveBookings.length > 0 || ongoing.length > 0) && <Text style={styles.swipeHint}>⇆ සම්පූර්ණ විස්තර සඳහා කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>}
        {liveBookings.map(bookingCard)}
        {ongoing.length === 0 && liveBookings.length === 0 ? (
          <View style={styles.card}>
            <EmptyState icon="📅" title="සක්‍රීය වෙන් කිරීම් නැත" text="ලංසුවක් පිළිගත් විට ඔබගේ වෙන් කිරීම මෙහි පෙන්වනු ඇත." />
            <Pressable onPress={onOpenBids} style={styles.selfCenter}>
              <Text style={styles.link}>මගේ ලංසු බලන්න →</Text>
            </Pressable>
          </View>
        ) : (
          ongoing.map(({ job, bid }) => bidCard(job, bid))
        )}

        {endedBookings.map(bookingCard)}

        <Text style={styles.sectionLabel}>සම්පූර්ණ කළ සේවා</Text>
        {doneBookings.map(bookingCard)}
        {doneJobs.map(({ job, bid }) => bidCard(job, bid))}
        {history.map((w) => (
          <View key={w.id} style={styles.card}>
            <View style={styles.row}>
              <GlassIcon emoji={w.icon ?? categoryInfo(w.categoryId).icon} />
              <View style={styles.flex1}>
                <Text style={styles.title}>{w.title ?? categoryInfo(w.categoryId).name}</Text>
                <Text style={styles.sub}>
                  {w.garageName} · {formatDate(new Date(w.progress.closedAt ?? 0))}
                </Text>
                {!!w.vehicleId && <Text style={styles.sub}>{vehicleName(w.vehicleId)}</Text>}
              </View>
              <View style={styles.right}>
                <Text style={styles.price}>{money(w.progress.handover?.bill.total ?? 0)}</Text>
                <View style={[styles.status, styles.statusDone]}>
                  <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <WorkshopTracker id={w.id} />
          </View>
        ))}
      </ScrollView>
      <OwnerDetailView target={detailTarget} onClose={() => setDetail(null)} />
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
  swipeWrap: { borderRadius: 18 },
  swipeHint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
  flex1: { flex: 1 },
  selfCenter: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
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
