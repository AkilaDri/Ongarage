import { PostBody, PostHead } from '../components/PostCard';
import { onActivityFocus, takeActivityFocus, type ActivityFocus } from '../utils/activityFocus';
import { elevation1, outline, pageBg } from '../utils/material';
import { PAGE_TITLE_H } from '../constants/layout';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, Gradient, themedStyles, ReceiptLineIcon, ScheduleLineIcon, SosLineIcon } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { categoryInfo, SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { EmptyState, SwipeCard } from '@ongarage/shared';
import { PinnedEdge } from '../components/PinnedEdge';
import { CategoryPhoto } from '../components/home/CategoryPhoto';
import { ChatButton } from '../components/ChatButton';
import { PopCount } from '../components/PopCount';
import { ActivityCalendar, type CalendarItem } from '../components/ActivityCalendar';
import { onOpenActivityCalendar } from '../utils/activityCalendar';
import { BREAKDOWN_IMAGES } from '../constants/home';
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
import { RatingSheet } from '../components/workshop/RatingSheet';
import { useWorkshops, type OwnerWorkshop } from '../context/WorkshopContext';
import { money } from '../utils/format';
import type { DirectBooking } from '../types';

const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

/** The rating the owner gave a finished job, as stars under its heading; a small "Rate" chip when none was given yet. */
const RatingLine: React.FC<{ rating?: number; onRate?: () => void }> = ({ rating, onRate }) =>
  rating ? (
    <Text style={ratingStyles.on}>
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))} {rating.toFixed(1)}
    </Text>
  ) : onRate ? (
    <Pressable style={ratingStyles.chip} onPress={onRate} hitSlop={6} accessibilityLabel="Rate this job">
      <Text style={ratingStyles.chipText}>☆ Rate</Text>
    </Pressable>
  ) : null;

// The main summary card's colour: blue through indigo to violet, with a soft light disc in its corner.
const SPEND_GRADIENT = [
  { offset: '0', color: '#2f7bf6' },
  { offset: '0.55', color: '#5b5ff0' },
  { offset: '1', color: '#8a4de8' },
];

const formatDate = (d: Date) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** The sub chips' icons: the same line icons as the bottom navigation bar. */
const SubChipIcon: React.FC<{ id: string; active: boolean }> = ({ id, active }) => {
  const Ico = id === 'bids' ? ReceiptLineIcon : id === 'direct' ? ScheduleLineIcon : SosLineIcon;
  return <Ico active={active} size={18} />;
};

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
  const pendingBookings = liveBookings.filter((b) => b.status === 'requested' || b.status === 'proposed');
  const activeBookings = liveBookings.filter((b) => b.status === 'confirmed');
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
  // The finished job being rated from its card's "Rate" chip.
  const [rating, setRating] = useState<OwnerWorkshop | null>(null);
  const bookingCard = (b: (typeof bookings)[number]) => (
    <SwipeCard key={b.id} style={styles.swipeWrap} onOpen={() => setDetail({ kind: 'booking', id: b.id })}>
      <DirectBookingCard booking={b} onBookAgain={onBookAgain} onOpen={() => setDetail({ kind: 'booking', id: b.id })} />
    </SwipeCard>
  );
  const { findVehicle, vehicles } = useVehicles();
  // 0 to 1 as the summary tiles pin at the top; fades the edge shadow in.
  const edge = useRef(new Animated.Value(0)).current;
  // The chat icon sits under the pinned tiles while this screen is shown.
  const pinnedH = useRef(0);
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
  // After a booking is sent, Activity opens on Ongoing → Booking (whether this screen was already open or is only just opening).
  useEffect(() => {
    const apply = (f: ActivityFocus) => {
      setKind(f.kind);
      if (f.current) setCurrentKind(f.current);
    };
    const waiting = takeActivityFocus();
    if (waiting) apply(waiting);
    return onActivityFocus((f) => {
      takeActivityFocus();
      apply(f);
    });
  }, []);
  // Inside "completed": which kind of finished work to look at.
  const [doneKind, setDoneKind] = useState<'bids' | 'direct' | 'sos'>('bids');
  const showDone = (k: typeof doneKind) => kind === 'done' && doneKind === k;
  // Inside "cancelled": which kind of cancelled work to look at.
  const [endedKind, setEndedKind] = useState<'bids' | 'direct' | 'sos'>('bids');
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
        {/* Laid out like a Facebook post (the same as the garage app's cards): the picture, the garage and its tag, the date, the price with three dots; the vehicle line and the subject under. */}
        <PostHead
          photo={<CategoryPhoto categoryId={job.categoryId} size={48} />}
          name={bid.garageName}
          garage={{ id: bid.garageId, name: bid.garageName }}
          meta={`වෙන් කළේ ${formatDate(new Date(bid.submittedAt))}`}
          price={money(bid.price)}
          onMore={() => setDetail({ kind: 'job', id: job.id })}
          chat={<ChatButton plain size={36} target={{ id: job.id, title: bid.garageName, subtitle: cat?.name, phone: MOCK_GARAGES.find((g) => g.name === bid.garageName)?.phone, vehicle: findVehicle(job.vehicleId) }} />}
        />
        <PostBody vehicle={findVehicle(job.vehicleId)} kind="bid" subject={cat?.name ?? 'Service'} onPress={() => setDetail({ kind: 'job', id: job.id })}>
          <View style={styles.rowBetween}>
            {finished(job.id) && !cancelled(job.id) ? <RatingLine rating={workshops[job.id]?.review?.rating} onRate={workshops[job.id] ? () => setRating(workshops[job.id]) : undefined} /> : <View />}
            <View style={[styles.status, finished(job.id) ? styles.statusDone : styles.statusOngoing]}>
              <Text style={[styles.statusText, { color: cancelled(job.id) ? Colors.errorText : finished(job.id) ? Colors.success : Colors.warning }]}>{cancelled(job.id) ? '✕ අවලංගු කළා' : finished(job.id) ? '✓ සම්පූර්ණයි' : '● වෙන් කළා'}</Text>
            </View>
          </View>
        </PostBody>
        <View style={styles.divider} />
        {finished(job.id) ? (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
              🛡️ මාස {bid.warrantyMonths} වගකීම
            </Text>
            <View style={styles.linkRow}>
              <Pressable onPress={() => setDetail({ kind: 'job', id: job.id })} hitSlop={8}>
                <Text style={styles.link}>විස්තර ›</Text>
              </Pressable>
            </View>
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
  // The calendar (opened from the title bar): every repair and service that was finished, on the day it was done.
  const [calOpen, setCalOpen] = useState(false);
  useEffect(() => onOpenActivityCalendar(() => setCalOpen(true)), []);
  const calendarItems: CalendarItem[] = [
    ...Object.values(workshops)
      .filter((w) => w.progress.stage === 'closed' && !!w.progress.closedAt)
      .map((w): CalendarItem => {
        const isJob = jobs.some((j) => j.id === w.id);
        const isBooking = bookings.some((b) => b.id === w.id);
        return {
          id: w.id,
          at: w.progress.closedAt!,
          icon: w.icon ?? categoryInfo(w.categoryId).icon,
          title: w.title ?? categoryInfo(w.categoryId).name,
          sub: w.garageName,
          amount: w.progress.handover?.bill.total,
          open: () => (isJob ? setDetail({ kind: 'job', id: w.id }) : isBooking ? setDetail({ kind: 'booking', id: w.id }) : setRecord({ kind: 'history', workshop: w })),
        };
      }),
    ...sosRecords.map((r): CalendarItem => ({ id: r.id, at: r.completedAt, icon: r.breakdown.icon, title: `SOS · ${r.breakdown.label}`, sub: r.responder.name, amount: r.total, open: () => setRecord({ kind: 'sos', record: r }) })),
  ];

  const spendRows = [
    { icon: '🛠️', label: 'ගරාජ රැකියා', count: closedJobs.length, amount: jobsSpent, color: '#8fd3ff' },
    { icon: '🚨', label: 'SOS සේවා', count: sosRecords.length, amount: sosSpent, color: '#ffa8b4' },
    { icon: '🛍️', label: 'OnMart කොටස්', count: boughtParts.length, amount: partsSpent, color: '#ffe08a' },
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
          // The title band folds away in step with the scroll (the first PAGE_TITLE_H px) and comes back the same way, straight from the offset: no thresholds or
          // timers, so nothing shakes.
          onHeaderProgress?.(Math.min(1, Math.max(0, y / PAGE_TITLE_H)));
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
              { id: 'ended', label: 'අවලංගු', count: endedBookings.length + cancelledJobs.length },
              { id: 'mart', label: 'OnMart', count: 0 },
            ] as { id: typeof kind; label: string; count: number }[]
          ).map((c) => {
            const on = kind === c.id;
            return (
              <Pressable key={c.id} style={[styles.segItem, on && styles.segItemOn]} onPress={() => setKind(c.id)} accessibilityLabel={`Records ${c.id}`}>
                <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
                  {c.label}
                </Text>
                {c.id === 'current' && c.count > 0 && (
                  <PopCount value={c.count} style={styles.badge} textStyle={styles.badgeText} />
                )}
              </Pressable>
            );
          })}
        </View>
        {kind === 'current' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindChips}>
            {(
              [
                { id: 'bids', label: 'ලංසු', count: ongoing.length },
                { id: 'direct', label: 'Booking', count: liveBookings.length },
                { id: 'sos', label: 'SOS', count: 0 },
              ] as { id: typeof currentKind; label: string; count: number }[]
            ).map((c) => {
              const on = currentKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setCurrentKind(c.id)} accessibilityLabel={`Ongoing ${c.id}`}>
                  <SubChipIcon id={c.id} active={on} />
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                  {c.count > 0 && (
                    <PopCount value={c.count} style={styles.subBadge} textStyle={styles.subBadgeText} />
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
                { id: 'bids', label: 'ලංසු', count: doneJobs.length },
                { id: 'direct', label: 'Booking', count: doneBookings.length },
                { id: 'sos', label: 'SOS', count: sosRecords.length },
              ] as { id: typeof doneKind; label: string; count: number }[]
            ).map((c) => {
              const on = doneKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setDoneKind(c.id)} accessibilityLabel={`Completed ${c.id}`}>
                  <SubChipIcon id={c.id} active={on} />
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {kind === 'ended' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindChips}>
            {(
              [
                { id: 'bids', label: 'ලංසු' },
                { id: 'direct', label: 'Booking' },
                { id: 'sos', label: 'SOS' },
              ] as { id: typeof endedKind; label: string }[]
            ).map((c) => {
              const on = endedKind === c.id;
              return (
                <Pressable key={c.id} style={[styles.subChip, on && styles.kindChipOn]} onPress={() => setEndedKind(c.id)} accessibilityLabel={`Cancelled ${c.id}`}>
                  <SubChipIcon id={c.id} active={on} />
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
          <PinnedEdge progress={edge} />
        </View>


        {kind === 'done' && (
          <View style={styles.spendCard} accessibilityLabel="Total spending detail">
            <Gradient stops={SPEND_GRADIENT} />
            <View style={styles.spendGlow} pointerEvents="none" />
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

        {/* Every booking that is on, together: the ones waiting for the garage first, then the confirmed ones. */}
        {/* Each kind of ongoing work has its own empty message: a card saying what shows here and when. */}
        {showCurrent('direct') && (liveBookings.length > 0 ? [...pendingBookings, ...activeBookings].map(bookingCard) : <EmptyState icon="📅" title="සක්‍රීය වෙන් කිරීම් නැත" text="ඔබ ගරාජයකට වෙන්කිරීමක් යැවූ විට එය මෙහි පෙන්වනු ඇත." />)}
        {showCurrent('bids') && (ongoing.length > 0 ? ongoing.map(({ job, bid }) => bidCard(job, bid)) : <EmptyState icon="🤝" title="සක්‍රීය ලංසු නැත" text="ඔබ ලංසුවක් පිළිගත් විට එම රැකියාව මෙහි පෙන්වනු ඇත." />)}
        {showCurrent('sos') && (
          <EmptyState icon="🚨" title="සක්‍රීය SOS නැත" text="SOS ඉල්ලීමක් පිළිගත් විට එය මෙහි පෙන්වනු ඇත; අවසන් වූ විට ‘සම්පූර්ණ’ යටතට යයි." />
        )}

          </>
        )}

        {show('ended') && endedKind === 'direct' && (endedBookings.length > 0 ? endedBookings.map(bookingCard) : <EmptyState icon="📅" title="අවලංගු වෙන්කිරීම් නැත" text="අවලංගු වූ හෝ ප්‍රතික්ෂේප වූ වෙන්කිරීම් මෙහි පෙන්වනු ඇත." />)}
        {show('ended') && endedKind === 'bids' && (cancelledJobs.length > 0 ? cancelledJobs.map(({ job, bid }) => bidCard(job, bid)) : <EmptyState icon="🤝" title="අවලංගු ලංසු නැත" text="අවලංගු වූ ලංසු රැකියා මෙහි පෙන්වනු ඇත." />)}
        {show('ended') && endedKind === 'sos' && <EmptyState icon="🚨" title="අවලංගු SOS නැත" text="අවලංගු වූ SOS ඉල්ලීම් මෙහි පෙන්වනු ඇත." />}

        {kind === 'done' && doneKind === 'sos' && sosRecords.length === 0 && (
          <EmptyState icon="🚨" title="SOS සේවා නැත" text="සම්පූර්ණ කළ SOS සේවා මෙහි වාර්තා වේ." />
        )}
        {showDone('sos') && sosRecords.length > 0 && (
          <>
            {sosRecords.map((r) => (
              <SwipeCard key={r.id} style={[styles.card, styles.cardDone]} onOpen={() => setRecord({ kind: 'sos', record: r })}>
              <Pressable style={styles.cardInner} onPress={() => setRecord({ kind: 'sos', record: r })} accessibilityLabel={`SOS record ${r.breakdown.label}`}>
                <PostHead
                  photo={
                    <View style={styles.sosIcon}> {r.breakdown.id && BREAKDOWN_IMAGES[r.breakdown.id] ? <Image source={BREAKDOWN_IMAGES[r.breakdown.id]} style={styles.sosImage} resizeMode="contain" /> : <Text style={styles.sosIconText}>{r.breakdown.icon}</Text>} </View>
                  }
                  name={r.responder.name}
                  meta={`${r.responder.mechanic} · ${formatDate(new Date(r.completedAt))}`}
                  price={money(r.total)}
                  onMore={() => setRecord({ kind: 'sos', record: r })}
                />
                <PostBody vehicle={vehicles.find((x) => x.plate === r.vehiclePlate) ?? { type: 'Sedan', name: r.vehicleName, plate: r.vehiclePlate }} kind="sos" subject={`SOS · ${r.breakdown.label}`}>
                  <View style={styles.rowBetween}>
                    <RatingLine rating={r.rating} />
                    <View style={[styles.status, styles.statusDone]}>
                      <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                    </View>
                  </View>
                  <TxnTag kind="SOS" source={r.id} />
                </PostBody>
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
              </SwipeCard>
            ))}
          </>
        )}

        {show('done') && (
          <>
        {showDone('direct') && doneBookings.map(bookingCard)}
        {showDone('bids') && doneJobs.map(({ job, bid }) => bidCard(job, bid))}
        {showDone('bids') && history.map((w) => (
          <SwipeCard key={w.id} style={[styles.card, styles.cardDone]} onOpen={() => setRecord({ kind: 'history', workshop: w })}>
          <Pressable style={styles.cardInner} onPress={() => setRecord({ kind: 'history', workshop: w })} accessibilityLabel={`Past job ${w.title ?? categoryInfo(w.categoryId).name}`}>
            <PostHead
              photo={<CategoryPhoto categoryId={w.categoryId} size={48} />}
              name={w.garageName}
              garage={{ id: w.garageId, name: w.garageName }}
              meta={formatDate(new Date(w.progress.closedAt ?? 0))}
              price={money(w.progress.handover?.bill.total ?? 0)}
              onMore={() => setRecord({ kind: 'history', workshop: w })}
              chat={<ChatButton plain size={36} target={{ id: w.id, title: w.garageName, subtitle: w.title ?? categoryInfo(w.categoryId).name, vehicle: w.vehicleId ? findVehicle(w.vehicleId) : undefined }} />}
            />
            <PostBody vehicle={w.vehicleId ? findVehicle(w.vehicleId) : undefined} kind="bid" subject={w.title ?? categoryInfo(w.categoryId).name}>
              <View style={styles.rowBetween}>
                <RatingLine rating={w.review?.rating} onRate={() => setRating(w)} />
                <View style={[styles.status, styles.statusDone]}>
                  <Text style={[styles.statusText, { color: Colors.success }]}>✓ සම්පූර්ණයි</Text>
                </View>
              </View>
            </PostBody>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
                🛡️ මාස {w.warrantyMonths} වගකීම
              </Text>
              <View style={styles.linkRow}>
                <Text style={styles.link}>විස්තර ›</Text>
              </View>
            </View>
          </Pressable>
          </SwipeCard>
        ))}
          </>
        )}
      </ScrollView>
      <OwnerDetailView target={detailTarget} onClose={() => setDetail(null)} />
      <RecordDetailView target={record} onClose={() => setRecord(null)} />
      <RatingSheet workshop={rating} onClose={() => setRating(null)} />
      <ActivityCalendar visible={calOpen} onClose={() => setCalOpen(false)} items={calendarItems} />
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
  card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 24, padding: 16, gap: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  cardOngoing: {},
  // A finished job: a little tighter, and the price in green.
  cardDone: { padding: 16, gap: 12 },
  priceDone: { color: Colors.textSoft },
  // Simple and modern: a flat card in a soft tint of the app's blue, no shadow, dark-blue figures.
  // The detailed summary: a flat card in a soft tint of the app's blue with a thin border, dark-blue figures.
  spendCard: { padding: 18, borderRadius: 24, gap: 6, overflow: 'hidden', backgroundColor: '#5b5ff0', shadowColor: '#5b5ff0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  spendGlow: { position: 'absolute', top: -60, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  spendCaption: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: 'rgba(255, 255, 255, 0.85)' },
  spendTotal: { fontSize: 30, fontFamily: FONTS.titleBold, color: '#ffffff' },
  spendBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 4, marginBottom: 6 },
  spendCols: { flexDirection: 'row', gap: 12 },
  spendCol: { flex: 1, gap: 2 },
  spendLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spendDot: { width: 7, height: 7, borderRadius: 4 },
  spendLabel: { flex: 1, fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.85)' },
  spendAmount: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#ffffff' },
  spendCount: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: 'rgba(255, 255, 255, 0.75)' },
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
  // The tappable body of a swipeable card: it lays its rows out the way the card itself does.
  cardInner: { gap: 12 },
  textClear: { paddingRight: 112 },
  sosIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  sosIconText: { fontSize: 22 },
  sosImage: { width: 46, height: 46 },
  // A finished job's heading row (beside the icon in the corner), with a full-width line under it.
  headRow: { minHeight: 52, justifyContent: 'center', paddingRight: 68 },
  divider: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
  title: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textSoft, lineHeight: 22 },
  sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, lineHeight: 19 },
  link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  right: { alignItems: 'flex-end', gap: 5 },
  garageLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  iconRow: { position: 'absolute', top: 6, right: 8, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Room under the icons that sit in the card's corner.
  rightIcons: { paddingTop: 56 },
  price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textSoft },
  kindTag: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  kindTagText: { fontSize: 11, fontWeight: '700', color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  status: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12 },
  statusOngoing: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  statusDone: { backgroundColor: 'rgba(16, 185, 129, 0.16)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
  statusText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
}));

const ratingStyles = themedStyles(() =>
  StyleSheet.create({
    on: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 18 },
    chip: { alignSelf: 'flex-start', marginTop: 3, paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: Colors.subtleFill },
    chipText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
