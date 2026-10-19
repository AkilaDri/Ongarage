import { elevation1, outline, pageBg } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
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
import { TxnTag } from '../components/TxnTag';
import { useMart } from '../context/MartContext';
import { DirectBookingCard } from '../components/DirectBookingCard';
import { chatDockOffset } from '../utils/chatDock';
import { VehicleBlock } from '../components/VehicleBlock';
import { MOCK_GARAGES } from '../constants/mockData';
import { OrdersList } from '../components/mart/OrdersList';
import { PayablesCard } from '../components/PayablesCard';
import { JobPartsToBuy } from '../components/mart/JobPartsToBuy';
import { RecordDetailView, type RecordTarget } from '../components/RecordDetailView';
import { WorkshopTracker } from '../components/workshop/WorkshopTracker';
import { useWorkshops } from '../context/WorkshopContext';
import { money } from '../utils/format';
import type { DirectBooking } from '../types';

const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

const formatDate = (d: Date) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;

export const ActivityScreen: React.FC<{ onOpenBids: () => void; onBookAgain: (b: DirectBooking) => void; onOpenMart?: () => void; onHeaderProgress?: (progress: number) => void }> = ({ onOpenBids, onBookAgain, onOpenMart, onHeaderProgress }) => {
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
  // A job the owner cancelled with the garage moves to the "ended" list.
  const cancelled = (id: string) => !!workshops[id]?.progress.cancelled;
  const liveBookings = bookings.filter((b) => (b.status === 'requested' || b.status === 'proposed' || b.status === 'confirmed') && !finished(b.id) && !cancelled(b.id));
  const doneBookings = bookings.filter((b) => b.status === 'confirmed' && finished(b.id) && !cancelled(b.id));
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
  // A finished SOS service or past workshop job opens its full record.
  const [record, setRecord] = useState<RecordTarget | null>(null);
  const bookingCard = (b: (typeof bookings)[number]) => (
    <SwipeCard key={b.id} style={styles.swipeWrap} onOpen={() => setDetail({ kind: 'booking', id: b.id })}>
      <DirectBookingCard booking={b} onBookAgain={onBookAgain} onOpen={() => setDetail({ kind: 'booking', id: b.id })} />
    </SwipeCard>
  );
  const { findVehicle } = useVehicles();
  // 0 to 1 as the summary tiles pin at the top; fades the edge shadow in.
  const edge = useRef(new Animated.Value(0)).current;
  // The chat icon sits under the pinned tiles while this screen is shown.
  const pinnedH = useRef(0);
  const lastY = useRef(0);
  const hidden = useRef(false);
  useEffect(() => {
    chatDockOffset.setValue(pinnedH.current);
    return () => chatDockOffset.setValue(0);
  }, []);
  // Each kind of record has its own chip: pick one to see only those records.
  const [kind, setKind] = useState<'current' | 'done' | 'ended' | 'mart'>('done');
  const show = (k: typeof kind) => kind === k;
  // Inside "ongoing": which kind of running work to look at.
  const [currentKind, setCurrentKind] = useState<'bids' | 'direct' | 'sos'>('bids');
  const showCurrent = (k: typeof currentKind) => currentKind === k;
  // Inside "completed": which kind of finished work to look at.
  const [doneKind, setDoneKind] = useState<'bids' | 'direct' | 'sos'>('bids');
  const showDone = (k: typeof doneKind) => kind === 'done' && doneKind === k;
  const vehicleName = (id: string) => findVehicle(id).name;
  const user = useUserLocation();

  const accepted = jobs
    .filter((j) => j.acceptedBidId)
    .map((j) => ({ job: j, bid: j.bids.find((b) => b.id === j.acceptedBidId)! }))
    .filter((x) => x.bid);
  const ongoing = accepted.filter((x) => !finished(x.job.id) && !cancelled(x.job.id));
  const doneJobs = accepted.filter((x) => finished(x.job.id) && !cancelled(x.job.id));
  const cancelledJobs = accepted.filter((x) => cancelled(x.job.id));

  const bidCard = (job: (typeof jobs)[number], bid: (typeof jobs)[number]['bids'][number]) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
    return (
      <SwipeCard key={job.id} style={[styles.card, !finished(job.id) && styles.cardOngoing, finished(job.id) && !cancelled(job.id) && styles.cardDone]} onOpen={() => setDetail({ kind: 'job', id: job.id })}>
        {/* The chat button sits in the very top right corner of the card. */}
        {(
          <View style={styles.iconRow}>
            <CategoryPhoto categoryId={job.categoryId} size={40} />
          </View>
        )}
        {finished(job.id) && !cancelled(job.id) && (
          <>
            <View style={styles.headRow}>
              <Text style={styles.title}>{cat?.name ?? 'Service'}</Text>
            </View>
            <View style={styles.divider} />
          </>
        )}
        <Pressable style={styles.row} onPress={() => setDetail({ kind: 'job', id: job.id })} accessibilityLabel={`${cat?.name ?? 'Job'} booking details`}>
          <View style={styles.flex1}>
            {!(finished(job.id) && !cancelled(job.id)) && <Text style={styles.title}>{cat?.name ?? 'Service'}</Text>}
            <View style={styles.garageLine}>
              <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
                {bid.garageName}
              </Text>
            </View>
            <VehicleBlock vehicle={findVehicle(job.vehicleId)} />
            <Text style={styles.sub}>වෙන් කළේ {formatDate(new Date(bid.submittedAt))}</Text>
          </View>
          <View style={[styles.right, !(finished(job.id) && !cancelled(job.id)) && styles.rightIcons]}>
            <View style={styles.kindTag}>
              <Text style={styles.kindTagText}>🤝 ලංසු</Text>
            </View>
            <Text style={[styles.price, finished(job.id) && !cancelled(job.id) && styles.priceDone]}>{money(bid.price)}</Text>
            <View style={[styles.status, finished(job.id) ? styles.statusDone : styles.statusOngoing]}>
              <Text style={[styles.statusText, { color: cancelled(job.id) ? Colors.errorText : finished(job.id) ? Colors.success : Colors.warning }]}>{cancelled(job.id) ? '✕ අවලංගු කළා' : finished(job.id) ? '✓ සම්පූර්ණයි' : '● වෙන් කළා'}</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.divider} />
        {finished(job.id) ? (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
              🛡️ මාස {bid.warrantyMonths} වගකීම
            </Text>
            <Pressable onPress={() => setDetail({ kind: 'job', id: job.id })} hitSlop={8}>
              <Text style={styles.link}>විස්තර ›</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WorkshopTracker id={job.id} />
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>
                🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours}{bid.travelFee ? ` · 🚗 ගමන් ගාස්තුව රු. ${bid.travelFee.toLocaleString('en-US')} ඇතුළුව` : ''}
              </Text>
              <Pressable onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))}>
                <Text style={styles.link}>🗺️ දිශාවන්</Text>
              </Pressable>
            </View>
          </>
        )}
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
          // The band folds away as the page scrolls up, and comes back in full on the first drag down.
          const dy = y - lastY.current;
          lastY.current = y;
          if (y <= 4 || dy < -3) {
            if (hidden.current) {
              hidden.current = false;
              onHeaderProgress?.(0);
            }
          } else if (dy > 3 && y > 12 && !hidden.current) {
            hidden.current = true;
            onHeaderProgress?.(1);
          }
        }}
      >
        {/* Pinned: the three summary tiles stay at the top while the lists scroll beneath */}
        <View style={styles.statsPinned} onLayout={(e) => {
          pinnedH.current = Math.round(e.nativeEvent.layout.height);
          chatDockOffset.setValue(pinnedH.current);
        }}>
        <View style={styles.segment}>
          {(
            [
              { id: 'current', label: 'පවතින', count: ongoing.length + liveBookings.length },
              { id: 'done', label: 'සම්පූර්ණ', count: history.length + doneBookings.length + doneJobs.length + sosRecords.length },
              { id: 'ended', label: 'අවසන්', count: endedBookings.length + cancelledJobs.length },
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
        {kind === 'current' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindChips}>
            {(
              [
                { id: 'bids', label: '🤝 ලංසු', count: ongoing.length },
                { id: 'direct', label: '📅 සෘජු වෙන් කිරීම්', count: liveBookings.length },
                { id: 'sos', label: '🚨 SOS', count: 0 },
              ] as { id: typeof currentKind; label: string; count: number }[]
            ).map((c) => {
              const on = currentKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setCurrentKind(c.id)} accessibilityLabel={`Ongoing ${c.id}`}>
                  {on && <Text style={styles.kindChipTextOn}>✓</Text>}
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                  {c.count > 0 && (
                    <View style={styles.subBadge}>
                      <Text style={styles.subBadgeText}>{c.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {kind === 'done' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindChips}>
            {(
              [
                { id: 'bids', label: '🤝 ලංසු', count: doneJobs.length },
                { id: 'direct', label: '📅 සෘජු වෙන් කිරීම්', count: doneBookings.length },
                { id: 'sos', label: '🚨 SOS', count: sosRecords.length },
              ] as { id: typeof doneKind; label: string; count: number }[]
            ).map((c) => {
              const on = doneKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setDoneKind(c.id)} accessibilityLabel={`Completed ${c.id}`}>
                  {on && <Text style={styles.kindChipTextOn}>✓</Text>}
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                  {c.count > 0 && (
                    <View style={styles.subBadge}>
                      <Text style={styles.subBadgeText}>{c.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
          <PinnedEdge progress={edge} />
        </View>

        {kind === 'done' && (
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

        {kind === 'done' && <PayablesCard />}

        {show('mart') && (
          <>
            <JobPartsToBuy compact onOpenMart={onOpenMart} />
            <OrdersList compact />
          </>
        )}

        {show('current') && (
          <>

        {showCurrent('direct') && liveBookings.map(bookingCard)}
        {kind === 'current' && currentKind === 'sos' ? (
          <View style={styles.card}>
            <EmptyState icon="🚨" title="සක්‍රීය SOS නැත" text="SOS ඉල්ලීමක් පිළිගත් විට එය මෙහි පෙන්වනු ඇත; අවසන් වූ විට ‘සම්පූර්ණ’ යටතට යයි." />
          </View>
        ) : ongoing.length === 0 && liveBookings.length === 0 ? (
          <View style={styles.card}>
            <EmptyState icon="📅" title="සක්‍රීය වෙන් කිරීම් නැත" text="ලංසුවක් පිළිගත් විට ඔබගේ වෙන් කිරීම මෙහි පෙන්වනු ඇත." />
            <Pressable onPress={onOpenBids} style={styles.selfCenter}>
              <Text style={styles.link}>මගේ ලංසු බලන්න →</Text>
            </Pressable>
          </View>
        ) : (
          showCurrent('bids') && ongoing.map(({ job, bid }) => bidCard(job, bid))
        )}

          </>
        )}

        {show('ended') && endedBookings.map(bookingCard)}
        {show('ended') && cancelledJobs.map(({ job, bid }) => bidCard(job, bid))}

        {kind === 'done' && doneKind === 'sos' && sosRecords.length === 0 && (
          <View style={styles.card}>
            <EmptyState icon="🚨" title="SOS සේවා නැත" text="සම්පූර්ණ කළ SOS සේවා මෙහි වාර්තා වේ." />
          </View>
        )}
        {showDone('sos') && sosRecords.length > 0 && (
          <>
            {sosRecords.map((r) => (
              <Pressable key={r.id} style={[styles.card, styles.cardDone]} onPress={() => setRecord({ kind: 'sos', record: r })} accessibilityLabel={`SOS record ${r.breakdown.label}`}>
                <View style={styles.iconRow}>
                  <View style={styles.sosIcon}>
                    <Text style={styles.sosIconText}>{r.breakdown.icon}</Text>
                  </View>
                </View>
                <View style={styles.headRow}>
                  <Text style={styles.title}>SOS · {r.breakdown.label}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={styles.sub}>
                      {r.responder.name} · {r.responder.mechanic}
                    </Text>
                    <Text style={styles.sub}>
                      {r.vehicleName} · {r.vehiclePlate} · {formatDate(new Date(r.completedAt))}
                    </Text>
                    <TxnTag kind="SOS" source={r.id} />
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.price, styles.priceDone]}>{money(r.total)}</Text>
                    <View style={[styles.status, styles.statusDone]}>
                      <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.sub} numberOfLines={2}>
                  📍 {r.address}
                </Text>
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.sub, styles.flex1]} numberOfLines={2}>
                    පැමිණීම {money(r.fees.callout)} · අලුත්වැඩියා {money(r.fees.repair)}
                    {r.fees.part ? ` · ${r.fees.part.name} ${money(r.fees.part.amount)}` : ''}
                  </Text>
                  <Text style={[styles.sub, { color: Colors.warning }]}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {show('done') && (
          <>
        {showDone('direct') && doneBookings.map(bookingCard)}
        {showDone('bids') && doneJobs.map(({ job, bid }) => bidCard(job, bid))}
        {showDone('bids') && history.map((w) => (
          <Pressable key={w.id} style={[styles.card, styles.cardDone]} onPress={() => setRecord({ kind: 'history', workshop: w })} accessibilityLabel={`Past job ${w.title ?? categoryInfo(w.categoryId).name}`}>
            <View style={styles.iconRow}>
              <CategoryPhoto categoryId={w.categoryId} size={40} />
            </View>
            <View style={styles.headRow}>
              <Text style={styles.title}>{w.title ?? categoryInfo(w.categoryId).name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.sub}>
                  {w.garageName} · {formatDate(new Date(w.progress.closedAt ?? 0))}
                </Text>
                {!!w.vehicleId && <VehicleBlock vehicle={findVehicle(w.vehicleId)} />}
              </View>
              <View style={styles.right}>
                <Text style={[styles.price, styles.priceDone]}>{money(w.progress.handover?.bill.total ?? 0)}</Text>
                <View style={[styles.status, styles.statusDone]}>
                  <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
                🛡️ මාස {w.warrantyMonths} වගකීම
              </Text>
              <Text style={styles.link}>විස්තර ›</Text>
            </View>
          </Pressable>
        ))}
          </>
        )}
      </ScrollView>
      <OwnerDetailView target={detailTarget} onClose={() => setDetail(null)} />
      <RecordDetailView target={record} onClose={() => setRecord(null)} />
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
  swipeWrap: { borderRadius: 12 },
  flex1: { flex: 1 },
  selfCenter: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  body: { paddingHorizontal: 6, paddingTop: 8, gap: 12, paddingBottom: 100 },
  // Opaque and full width (the negative margin cancels the body padding), so the lists scroll underneath it.
  statsPinned: { marginHorizontal: -6, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 8, backgroundColor: pageBg() },
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
  sectionLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 10 },
  // Soft shadow instead of an outline (an outline only on dark, where a shadow would not show), like Home and Bids.
  // PickMe look: a roomy white card with big round corners, no hard outline and a soft wide shadow.
  card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 24, padding: 18, gap: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  cardOngoing: {},
  // A finished job: a little tighter, and the price in green.
  cardDone: { padding: 16, gap: 12 },
  priceDone: { color: Colors.successText },
  spendCard: { padding: 18, borderRadius: 24, gap: 6, backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
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
  segment: { flexDirection: 'row', gap: 6, marginTop: 14 },
  segItem: { flex: 1, height: 40, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, overflow: 'visible', borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  segItemOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  segText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  segTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  badge: { position: 'absolute', top: -9, right: 8, minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', borderWidth: 2, borderColor: pageBg() },
  badgeGood: {},
  badgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  kindChips: { gap: 10, paddingTop: 14, paddingRight: 16 },
  subBadge: { position: 'absolute', top: -9, right: 4, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', borderWidth: 2, borderColor: pageBg() },
  subBadgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  kindChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  subChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
  kindChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  kindChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  // Keeps the heading clear of the icons in the card's top right corner.
  textClear: { paddingRight: 56 },
  sosIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  sosIconText: { fontSize: 22 },
  // A finished job's heading row (beside the icon in the corner), with a full-width line under it.
  headRow: { minHeight: 40, justifyContent: 'center', paddingRight: 56 },
  divider: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
  title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  right: { alignItems: 'flex-end', gap: 5 },
  garageLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconRow: { position: 'absolute', top: 6, right: 8, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Room under the icons that sit in the card's corner.
  rightIcons: { paddingTop: 44 },
  price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  kindTag: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  kindTagText: { fontSize: 11, fontWeight: '700', color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  status: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12 },
  statusOngoing: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  statusDone: { backgroundColor: 'rgba(16, 185, 129, 0.16)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
  statusText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
}));
