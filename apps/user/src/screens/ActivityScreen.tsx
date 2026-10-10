import React, { useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { categoryInfo, SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { EmptyState, SwipeCard } from '@ongarage/shared';
import { PinnedEdge } from '../components/PinnedEdge';
import { CategoryPhoto } from '../components/home/CategoryPhoto';
import { OwnerDetailView, type OwnerDetailTarget } from '../components/OwnerDetailView';
import { useBids } from '../context/BidsContext';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl } from '@ongarage/shared';
import { useBookings } from '../context/BookingsContext';
import { useSOSRecords } from '../context/SOSRecordsContext';
import { useMart } from '../context/MartContext';
import { DirectBookingCard } from '../components/DirectBookingCard';
import { OrdersList } from '../components/mart/OrdersList';
import { JobPartsToBuy } from '../components/mart/JobPartsToBuy';
import { WorkshopTracker } from '../components/workshop/WorkshopTracker';
import { useWorkshops } from '../context/WorkshopContext';
import { money } from '../utils/format';
import type { DirectBooking } from '../types';

const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

const formatDate = (d: Date) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;

export const ActivityScreen: React.FC<{ onOpenBids: () => void; onBookAgain: (b: DirectBooking) => void; onOpenMart?: () => void; onHeaderVisibilityChange?: (visible: boolean) => void }> = ({ onOpenBids, onBookAgain, onOpenMart, onHeaderVisibilityChange }) => {
  const { jobs } = useBids();
  const { bookings } = useBookings();
  const { workshops } = useWorkshops();
  const { records: sosRecords } = useSOSRecords();
  const { purchases } = useMart();
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
  // 0 to 1 as the summary tiles pin at the top; fades the edge shadow in.
  const edge = useRef(new Animated.Value(0)).current;
  // Each kind of record has its own chip: pick one to see only those records.
  const [kind, setKind] = useState<'all' | 'current' | 'done' | 'ended' | 'mart'>('all');
  const show = (k: typeof kind) => kind === 'all' || kind === k;
  // Inside "completed": which kind of finished work to look at.
  const [doneKind, setDoneKind] = useState<'all' | 'bids' | 'direct' | 'sos' | 'past'>('all');
  const showDone = (k: typeof doneKind) => kind === 'all' || (kind === 'done' && (doneKind === 'all' || doneKind === k));
  const lastY = useRef(0);
  const barHidden = useRef(false);
  const lastToggle = useRef(0);
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
          <CategoryPhoto categoryId={job.categoryId} />
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
  // Where the money went: finished garage jobs (their bills), SOS services, and parts bought in OnMart (with any delivery fee).
  const closedJobs = Object.values(workshops).filter((w) => w.progress.stage === 'closed');
  const jobsSpent = closedJobs.reduce((sum, w) => sum + (w.progress.handover?.bill.total ?? 0), 0);
  const sosSpent = sosRecords.reduce((sum, r) => sum + r.total, 0);
  const boughtParts = purchases.filter((m) => m.stage === 'bought');
  const partsSpent = boughtParts.reduce((sum, m) => sum + m.offer.total + (m.delivery?.fee ?? 0), 0);
  const totalSpent = jobsSpent + sosSpent + partsSpent;
  const spendRows = [
    { icon: '🛠️', label: 'ගරාජ රැකියා', count: closedJobs.length, amount: jobsSpent, color: Colors.primary },
    { icon: '🚨', label: 'SOS සේවා', count: sosRecords.length, amount: sosSpent, color: '#ef4444' },
    { icon: '🛍️', label: 'OnMart කොටස්', count: boughtParts.length, amount: partsSpent, color: '#f59e0b' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          edge.setValue(Math.min(1, Math.max(0, (y - 8) / 30)));
          // Scrolling down folds the top bar away completely so the page rises to the top; scrolling back up brings it back.
          // Folding the bar makes the viewport taller, which nudges the offset back by itself; ignore that for a moment
          // so it does not read as the owner scrolling up.
          const settling = Date.now() - lastToggle.current < 600;
          if (y > lastY.current + 8 && y > 12 && !barHidden.current) {
            barHidden.current = true;
            lastToggle.current = Date.now();
            onHeaderVisibilityChange?.(false);
          } else if (barHidden.current && !settling && (y < lastY.current - 8 || y <= 0)) {
            barHidden.current = false;
            lastToggle.current = Date.now();
            onHeaderVisibilityChange?.(true);
          }
          lastY.current = y;
        }}
      >
        {/* Pinned: the three summary tiles stay at the top while the lists scroll beneath */}
        <View style={styles.statsPinned}>
        <View style={styles.segment}>
          {(
            [
              { id: 'all', label: 'සියල්ල', count: 0 },
              { id: 'current', label: 'පවතින', count: ongoing.length + liveBookings.length },
              { id: 'done', label: 'සම්පූර්ණ', count: history.length + doneBookings.length + doneJobs.length + sosRecords.length },
              { id: 'ended', label: 'අවසන්', count: endedBookings.length },
              { id: 'mart', label: 'OnMart', count: 0 },
            ] as { id: typeof kind; label: string; count: number }[]
          ).map((c) => {
            const on = kind === c.id;
            return (
              <Pressable key={c.id} style={[styles.segItem, on && styles.segItemOn]} onPress={() => setKind(c.id)} accessibilityLabel={`Records ${c.id}`}>
                <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
                  {c.label}
                </Text>
                {c.count > 0 && (
                  <View style={[styles.badge, c.id === 'done' && styles.badgeGood]}>
                    <Text style={styles.badgeText}>{c.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {kind === 'done' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindChips}>
            {(
              [
                { id: 'all', label: 'සියල්ල', count: history.length + doneBookings.length + doneJobs.length + sosRecords.length },
                { id: 'bids', label: '🤝 ලංසු', count: doneJobs.length },
                { id: 'direct', label: '📅 සෘජු වෙන් කිරීම්', count: doneBookings.length },
                { id: 'sos', label: '🚨 SOS', count: sosRecords.length },
                { id: 'past', label: '🧾 පැරණි රැකියා', count: history.length },
              ] as { id: typeof doneKind; label: string; count: number }[]
            ).map((c) => {
              const on = doneKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setDoneKind(c.id)} accessibilityLabel={`Completed ${c.id}`}>
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                  {c.count > 0 && (
                    <View style={[styles.badge, styles.badgeGood]}>
                      <Text style={styles.badgeText}>{c.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
          <PinnedEdge progress={edge} />
        </View>

        {kind === 'all' && (
          <View style={styles.spendCard} accessibilityLabel="Total spending">
            <Text style={styles.spendCaption}>මුළු වියදම</Text>
            <Text style={styles.spendTotal}>{money(totalSpent)}</Text>
            <View style={styles.spendBar}>
              {totalSpent > 0 ? (
                spendRows.filter((r) => r.amount > 0).map((r) => <View key={r.label} style={{ flex: r.amount, backgroundColor: r.color }} />)
              ) : (
                <View style={{ flex: 1, backgroundColor: Colors.subtleBorder }} />
              )}
            </View>
            <View style={styles.spendCols}>
              {spendRows.map((r) => (
                <View key={r.label} style={styles.spendCol}>
                  <View style={styles.spendLabelRow}>
                    <View style={[styles.spendDot, { backgroundColor: r.color }]} />
                    <Text style={styles.spendLabel} numberOfLines={1}>
                      {r.label}
                    </Text>
                  </View>
                  <Text style={styles.spendAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {money(r.amount)}
                  </Text>
                  <Text style={styles.spendCount}>{r.count > 0 ? `${r.count} ක්` : '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('mart') && (
          <>
            <JobPartsToBuy compact onOpenMart={onOpenMart} />
            <OrdersList compact />
          </>
        )}

        {show('current') && (
          <>

        <Text style={styles.sectionLabel}>දැනට පවතින වෙන් කිරීම්</Text>
        {(liveBookings.length > 0 || ongoing.length > 0) && <Text style={styles.swipeHint}>සම්පූර්ණ විස්තර සඳහා කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>}
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

          </>
        )}

        {show('ended') && endedBookings.map(bookingCard)}

        {kind === 'done' && doneKind === 'sos' && sosRecords.length === 0 && (
          <View style={styles.card}>
            <EmptyState icon="🚨" title="SOS සේවා නැත" text="සම්පූර්ණ කළ SOS සේවා මෙහි වාර්තා වේ." />
          </View>
        )}
        {showDone('sos') && sosRecords.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🚨 SOS සේවා</Text>
            {sosRecords.map((r) => (
              <View key={r.id} style={styles.card} accessibilityLabel={`SOS record ${r.breakdown.label}`}>
                <View style={styles.row}>
                  <View style={styles.sosIcon}>
                    <Text style={styles.sosIconText}>{r.breakdown.icon}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.title}>SOS · {r.breakdown.label}</Text>
                    <Text style={styles.sub}>
                      {r.responder.name} · {r.responder.mechanic}
                    </Text>
                    <Text style={styles.sub}>
                      {r.vehicleName} · {r.vehiclePlate} · {formatDate(new Date(r.completedAt))}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.price}>{money(r.total)}</Text>
                    <View style={[styles.status, styles.statusDone]}>
                      <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.sub}>📍 {r.address}</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>පැමිණීමේ ගාස්තුව</Text>
                  <Text style={styles.sub}>{money(r.fees.callout)}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>අලුත්වැඩියා ගාස්තුව</Text>
                  <Text style={styles.sub}>{money(r.fees.repair)}</Text>
                </View>
                {!!r.fees.part && (
                  <View style={styles.rowBetween}>
                    <Text style={styles.sub}>OnMart කොටස ({r.fees.part.name}) · {r.fees.part.shop}</Text>
                    <Text style={styles.sub}>{money(r.fees.part.amount)}</Text>
                  </View>
                )}
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>ඔබගේ ශ්‍රේණිගත කිරීම</Text>
                  <Text style={[styles.sub, { color: Colors.warning }]}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                {r.tags.length > 0 && <Text style={styles.sub}>{r.tags.join(' · ')}</Text>}
              </View>
            ))}
          </>
        )}

        {show('done') && (
          <>
        <Text style={styles.sectionLabel}>සම්පූර්ණ කළ සේවා</Text>
        {showDone('direct') && doneBookings.map(bookingCard)}
        {showDone('bids') && doneJobs.map(({ job, bid }) => bidCard(job, bid))}
        {showDone('past') && history.map((w) => (
          <View key={w.id} style={styles.card}>
            <View style={styles.row}>
              <CategoryPhoto categoryId={w.categoryId} />
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
          </>
        )}
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
  // Transparent: the rounded sheet in App.tsx supplies the background.
  container: { flex: 1 },
  swipeWrap: { borderRadius: 20 },
  swipeHint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  flex1: { flex: 1 },
  selfCenter: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  body: { paddingHorizontal: 6, paddingTop: 8, gap: 12, paddingBottom: 100 },
  // Opaque and full width (the negative margin cancels the body padding), so the lists scroll underneath it.
  statsPinned: { marginHorizontal: -6, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: getThemeMode() === 'dark' ? 1 : 0,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.bgCard,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
  statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  // Same heading style as the Home screen's sections.
  sectionLabel: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMuted, letterSpacing: 0.3, marginTop: 10 },
  // Soft shadow instead of an outline (an outline only on dark, where a shadow would not show), like Home and Bids.
  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#cfd6e0', borderRadius: 20, padding: 7, gap: 10, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 },
  cardOngoing: {},
  spendCard: { padding: 8, borderRadius: 22, gap: 6, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#cfd6e0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  spendCaption: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  spendTotal: { fontSize: 28, fontFamily: FONTS.titleBold, color: Colors.textMain },
  spendBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 4, marginBottom: 6 },
  spendCols: { flexDirection: 'row', gap: 12 },
  spendCol: { flex: 1, gap: 2 },
  spendLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spendDot: { width: 7, height: 7, borderRadius: 4 },
  spendLabel: { flex: 1, fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  spendAmount: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  spendCount: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  segment: { flexDirection: 'row', gap: 6, marginTop: 8 },
  segItem: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dbe4f3',
    backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff',
  },
  segItemOn: { backgroundColor: '#2457e6', borderColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  segText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6' },
  segTextOn: { color: '#ffffff' },
  badge: { position: 'absolute', top: -6, right: -2, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  badgeGood: { backgroundColor: '#16a34a' },
  badgeText: { fontSize: 9.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  kindChips: { gap: 8, paddingTop: 10, paddingRight: 16 },
  kindChipOn: { backgroundColor: '#2457e6', borderColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  subChip: { paddingHorizontal: 13, height: 34, borderRadius: 12, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#e3ecfd', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.28)' : '#c9d9fa' },
  kindChipText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6' },
  kindChipTextOn: { color: '#ffffff' },
  sosIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  sosIconText: { fontSize: 22 },
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
