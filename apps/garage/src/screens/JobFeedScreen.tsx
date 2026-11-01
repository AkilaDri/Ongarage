import { onFly, registerFlyTarget } from '../utils/fly';
import { JobsLineIcon, OrdersLineIcon } from '@ongarage/shared';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { CustomerHistoryTag } from '../components/CustomerHistory';
import { WaitingDots } from '../components/WaitingDots';
import { CategoryArt } from '../components/CategoryArt';
import { chatDockOffset } from '../utils/chatDock';
import React, { useEffect, useMemo, useState } from 'react';
import { pageBg } from '../utils/pageBg';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomerBadge } from '../components/CustomerBadge';
import { InfoChip } from '@ongarage/shared';
import { fittingLabel, isFarJob, ActionButton, categoryInfo, Colors, dayStart, EmptyState, FONTS, Icon, isHighValueJob, levelForFeature, marketPrice, SwipeCard, themedStyles, vehicleIcon, type IconName, softFill, softShadow, getThemeMode, PinnedEdge, PhotoStrip, usePinnedEdge } from '@ongarage/shared';
import { bidDeadline, useGarage } from '../context/GarageContext';
import { CountdownPill } from '../components/CountdownPill';
import { BidSheet } from '../components/BidSheet';
import { NoPhotoAnimation } from '../components/NoPhotoAnimation';
import { DirectReplySheet, type ReplyMode } from '../components/DirectReplySheet';
import { JobDetailView, SPARE_LABEL, type DetailTarget } from '../components/JobDetailView';
import { ago, countdown, formatDate, formatTime, money } from '../utils/format';
import type { BidStatus, DirectRequest, FeedJob, JobDetails, MyBid } from '../types';

// Bidding jobs, direct bookings and this garage's bids share the Jobs tab, so the
// bottom navigation keeps four tabs.
type Segment = 'open' | 'direct' | 'sos' | 'mine';
/** A job this close to the garage (km) counts as near. */
const NEAR_KM = 3;
type Scope = 'services' | 'all';

const STATUS: Record<BidStatus, { label: string; color: () => string }> = {
  pending: { label: 'සලකා බලමින්', color: () => Colors.warning },
  won: { label: 'දිනුවා · කාලසටහනට එක් විය', color: () => Colors.successText },
  lost: { label: 'අහිමි විය', color: () => Colors.errorText },
  withdrawn: { label: 'ඉවත් කළා', color: () => Colors.textMuted },
};

/** One quiet line of facts instead of a wall of chips. */
const meta = (...parts: (string | false | undefined | 0 | null)[]) => parts.filter(Boolean).join('   ·   ');

/**
 * A card that has been turned down: it tints red, slides off to the left tilting and fading, then the gap it leaves folds shut, so the cards
 * below move up smoothly instead of jumping.
 */
const LeavingCard: React.FC<{ onDone: () => void; children: React.ReactNode }> = ({ onDone, children }) => {
  const out = React.useRef(new Animated.Value(0)).current;
  const fold = React.useRef(new Animated.Value(1)).current;
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    if (h === null) return;
    Animated.sequence([
      Animated.timing(out, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fold, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h]);
  return (
    <Animated.View
      pointerEvents="none"
      style={h === null ? undefined : { height: fold.interpolate({ inputRange: [0, 1], outputRange: [0, h] }), marginBottom: fold.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }), overflow: 'hidden' }}
    >
      <Animated.View
        onLayout={(e) => h === null && setH(Math.round(e.nativeEvent.layout.height))}
        style={{
          opacity: out.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.4, 0] }),
          transform: [{ translateX: out.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) }, { rotate: out.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) }],
        }}
      >
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 12, backgroundColor: 'rgba(217, 48, 37, 0.16)', opacity: out.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }) }]} />
      </Animated.View>
    </Animated.View>
  );
};

/** `onOpenSos`: the SOS chip opens the SOS screen full screen (App swaps this page for it). */
export const JobFeedScreen: React.FC<{ shift: Animated.Value; onScrollY: (y: number) => void; onOpenSos: () => void }> = ({ shift, onScrollY, onOpenSos }) => {
  const { progress: edge, scrollProps } = usePinnedEdge();
  // The chip bar's height (measured), which the list sits under.
  const [barH, setBarH] = useState(68);
  // The chat icon sits under the pinned bar once the header has folded away.
  useEffect(() => {
    chatDockOffset.setValue(barH);
    return () => chatDockOffset.setValue(0);
  }, [barH]);
  const { feed, directs, bids, profile, withdrawBid, has, headStartUntil, intakeOn, requests, activeJobs } = useGarage();
  // SOS (the old bottom tab) is the chip after Booking: its count is what waits for an answer.
  const sosWaiting = activeJobs.filter((d) => d.priceApproval?.status === 'pending').length || requests.length;
  // While an SOS waits for an answer the chip flashes: a red glow breathes inside it and a ring spreads out from it, until the request is answered.
  const sosPulse = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (sosWaiting === 0) {
      sosPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(sosPulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [sosWaiting, sosPulse]);
  const [segment, setSegment] = useState<Segment>('open');
  // "ලංසු රැකියා" and "MyBids" swap places when My bids opens or closes: the chip that goes up slides in from below, the one that goes down drops in from above.
  const swap = React.useRef(new Animated.Value(1)).current;
  const lastSegment = React.useRef<Segment>('open');
  useEffect(() => {
    const was = lastSegment.current;
    lastSegment.current = segment;
    if (was === segment || (was !== 'open' && was !== 'mine') || (segment !== 'open' && segment !== 'mine')) return;
    swap.setValue(0);
    Animated.spring(swap, { toValue: 1, stiffness: 220, damping: 18, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [segment, swap]);
  // Whatever the list shows changing (ලංසු රැකියා, Booking, MyBids) brings the new list in with a short fade and rise.
  const listIn = React.useRef(new Animated.Value(1)).current;
  const listSeg = React.useRef<Segment>(segment);
  useEffect(() => {
    if (listSeg.current === segment) return;
    listSeg.current = segment;
    listIn.setValue(0);
    Animated.timing(listIn, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [segment, listIn]);
  const goesUp = { opacity: swap, transform: [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] };
  const comesDown = { opacity: swap, transform: [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }] };
  // The "My bids" chip: where a bid just sent flies to (its place is measured when the token lands).
  const myBidsChip = React.useRef<View>(null);
  // While My bids is open the chip stands in the top bar instead (the filter-row one is gone), so a bid sent from elsewhere can still land on it.
  const myBidsTopChip = React.useRef<View>(null);
  useEffect(() => {
    registerFlyTarget('bid', () => new Promise((resolve) => {
      const chip = myBidsChip.current ?? myBidsTopChip.current;
      if (chip) chip.measureInWindow((x, y, w, h) => resolve({ x: x + w / 2, y: y + h / 2 }));
      else resolve(null);
    }));
    return () => registerFlyTarget('bid', null);
  }, []);
  // The icon after "All": every open job as one row (to see them all at once and bid quickly) instead of a full card each.
  const [rowsView, setRowsView] = useState(false);
  // The funnel icon: only the jobs few garages have bid on yet (at most one bid), the quietest first: the best chance to win.
  const [fewBids, setFewBids] = useState(false);
  // The turning-arrows icon: only the jobs the owner posted again after the bidding ran out, the same job on offer once more.
  const [republishedOnly, setRepublishedOnly] = useState(false);
  // The pin icon: only the jobs close to the garage (within NEAR_KM), the nearest first.
  const [nearest, setNearest] = useState(false);
  const [scope, setScope] = useState<Scope>('services');
  const [sheet, setSheet] = useState<{ job: FeedJob; existing?: MyBid } | null>(null);
  const [reply, setReply] = useState<{ request: DirectRequest; mode: ReplyMode } | null>(null);
  const [detail, setDetail] = useState<{ kind: DetailTarget['kind']; id: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pendingFor = (jobId: string) => bids.find((b) => b.jobId === jobId && b.status === 'pending');
  const open = feed.filter((j) => bidDeadline(j) > now);
  const mine = open.filter((j) => profile.services.includes(j.categoryId));
  // The job that closes first comes first, so nothing runs out unseen.
  const shown = [...(scope === 'services' ? mine : open)]
    .filter((j) => !fewBids || j.otherBids <= 1)
    .filter((j) => !republishedOnly || j.republished)
    .filter((j) => !nearest || j.distanceKm <= NEAR_KM)
    .sort((a, b) => (nearest && a.distanceKm !== b.distanceKm ? a.distanceKm - b.distanceKm : fewBids && a.otherBids !== b.otherBids ? a.otherBids - b.otherBids : bidDeadline(a) - bidDeadline(b)));
  // Waiting on this garage first, soonest deadline first.
  const sortDirects = (list: DirectRequest[]) => [...list].sort((a, b) => (a.status === b.status ? a.respondBy - b.respondBy : a.status === 'new' ? -1 : 1));
  const directList = sortDirects(directs);
  // A request the garage turns down does not just vanish: its card is kept for a moment (at the same place in the list) and leaves with an animation.
  const rejectedIds = React.useRef(new Set<string>());
  useEffect(
    () =>
      onFly((k, id) => {
        if (k === 'reject' && id) rejectedIds.current.add(id);
      }),
    []
  );
  const lastList = React.useRef<DirectRequest[]>(directList);
  const [leaving, setLeaving] = useState<{ d: DirectRequest; at: number }[]>([]);
  useEffect(() => {
    const before = lastList.current;
    lastList.current = sortDirects(directs);
    const gone = before.map((d, at) => ({ d, at })).filter(({ d }) => rejectedIds.current.has(d.id) && !directs.some((x) => x.id === d.id));
    if (gone.length) setLeaving((l) => [...l, ...gone.filter((g) => !l.some((x) => x.d.id === g.d.id))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directs]);
  const newDirects = directs.filter((d) => d.status === 'new').length;

  // The detail view follows the live record, and closes if it goes away (won, booked, expired).
  const detailTarget: DetailTarget | null = useMemo(() => {
    if (!detail) return null;
    if (detail.kind === 'myBid') {
      const bid = bids.find((b) => b.id === detail.id);
      return bid ? { kind: 'myBid', bid } : null;
    }
    if (detail.kind === 'bid') {
      const job = feed.find((j) => j.id === detail.id);
      return job ? { kind: 'bid', job } : null;
    }
    const job = directs.find((d) => d.id === detail.id);
    return job ? { kind: 'direct', job } : null;
  }, [detail, feed, directs, bids]);

  const allSegments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'open', label: 'ලංසු රැකියා', icon: 'inbox', count: mine.length },
    { id: 'direct', label: 'Booking', icon: 'calendar', count: newDirects, alert: newDirects > 0 },
    { id: 'sos', label: 'SOS', icon: 'alert-triangle', count: sosWaiting, alert: sosWaiting > 0 },
    { id: 'mine', label: 'මගේ ලංසු', icon: 'tag', count: bids.filter((b) => b.status === 'pending').length },
  ];
  // "My bids" is the tag icon at the end of the filter row, not a chip in this bar.
  // While My bids is open it stands in the top bar where "ලංසු රැකියා" was (they swap places).
  const mineSegment = { ...allSegments.find((s) => s.id === 'mine')!, label: 'MyBids' };
  const segments = allSegments.filter((s) => s.id !== 'mine').map((s) => (s.id === 'open' && segment === 'mine' ? mineSegment : s));
  const pendingBids = allSegments.find((s) => s.id === 'mine')!.count;

  const mediaText = (job: JobDetails) => {
    const p = job.photos?.length ?? 0;
    const v = job.voiceNotes?.length ?? 0;
    return [p && `📷 ${p}`, v && `🎙️ ${v}`].filter(Boolean).join(' ');
  };

  // ---------- Actions (shared by cards and the detail view) ----------
  const bidActions = (job: FeedJob, fromDetail = false) => {
    const pending = pendingFor(job.id);
    const go = (fn: () => void) => () => {
      if (fromDetail) setDetail(null);
      fn();
    };
    if (pending) {
      return (
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>ඔබගේ ලංසුව: {money(pending.price)}{pending.travelFee ? ` · 🚗 ගමන ${money(pending.travelFee)} ඇතුළුව` : ''}</Text>
            <View style={styles.statusRow}>
              <WaitingDots color={Colors.warning} />
              <Text style={[styles.sub, { color: Colors.warning }]}>සලකා බලමින්</Text>
            </View>
          </View>
          <Pressable style={styles.linkBtn} onPress={go(() => setSheet({ job, existing: pending }))}>
            <Text style={styles.link}>සංස්කරණය</Text>
          </Pressable>
        </View>
      );
    }
    // Newer high-score garages see fresh posts first (fair share).
    const head = headStartUntil(job);
    if (head) {
      return (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>🌱 නව ගරාජවලට පළමුව · ඔබට ලංසු තැබිය හැක්කේ {countdown(head - Date.now())}කින්</Text>
        </View>
      );
    }
    // A won bid is booked tomorrow: limited garages need room for it.
    const room = intakeOn(dayStart(Date.now()) + 24 * 60 * 60 * 1000);
    if (room.remaining < marketPrice(job.categoryId)) {
      return (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>⚖️ හෙට දෛනික සීමාව පිරී ඇත (ඉඩ {money(room.remaining)}) — ඉඩ ඇති වූ විට ලංසු තබන්න</Text>
        </View>
      );
    }
    // Jobs worth more than HIGH_VALUE_MIN go to garages whose level unlocked them.
    if (isHighValueJob(job.categoryId) && !has('highValueJobs')) {
      const lv = levelForFeature('highValueJobs');
      return (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>🔒 ඉහළ වටිනාකමැති රැකියාවක් — {lv.icon} {lv.name} මට්ටමේදී ලංසු තැබිය හැක</Text>
        </View>
      );
    }
    if (profile.services.includes(job.categoryId)) {
      return (
        <ActionButton
          label={`ලංසුවක් තබන්න · වෙළඳපොළ ${money(marketPrice(job.categoryId))}`}
          icon="📨"
          variant="primary"
          onPress={go(() => setSheet({ job }))}
        />
      );
    }
    return <Text style={styles.hint}>මෙම සේවාව ඔබගේ ලැයිස්තුවේ නැත — “Profile” ටැබයෙන් එක් කරන්න.</Text>;
  };

  const directActions = (d: DirectRequest, fromDetail = false) => {
    const go = (mode: ReplyMode) => () => {
      if (fromDetail) setDetail(null);
      setReply({ request: d, mode });
    };
    if (d.status === 'proposed' && d.proposal) {
      return (
        <View style={styles.proposed}>
          <Text style={styles.proposedText}>
            📨 ඔබ යෝජනා කළා: {formatDate(d.proposal.at)} · {formatTime(d.proposal.at)} · {money(d.proposal.estimate)}
          </Text>
          <Text style={[styles.sub, { color: Colors.warning }]}>● හිමිකරුගේ පිළිතුර බලාපොරොත්තුවෙන්</Text>
        </View>
      );
    }
    return (
      <View style={styles.actionsRow}>
        <View style={styles.flex1}>
          <ActionButton label="ප්‍රතික්ෂේප" icon="✕" variant="ghost" compact onPress={go('decline')} />
        </View>
        <View style={styles.flex2}>
          <ActionButton label="පිළිතුරු දෙන්න" icon="✓" variant="success" compact onPress={go('accept')} />
        </View>
      </View>
    );
  };

  // The footer of a bid's record: edit or withdraw while the owner is still deciding.
  const myBidActions = (bid: MyBid) =>
    bid.status === 'pending' ? (
      <View style={styles.actionsRow}>
        <View style={styles.flex1}>
          <ActionButton
            label="ඉවත් කරන්න"
            icon="✕"
            variant="ghost"
            compact
            onPress={() => {
              setDetail(null);
              withdrawBid(bid.id);
            }}
          />
        </View>
        <View style={styles.flex2}>
          <ActionButton
            label="ලංසුව සංස්කරණය"
            icon="✏️"
            variant="primary"
            compact
            onPress={() => {
              setDetail(null);
              setSheet({ job: bid.job, existing: bid });
            }}
          />
        </View>
      </View>
    ) : null;

  // A job I've already bid on opens my bid's record (price, status, history); any other job opens its details.
  const openJob = (job: FeedJob) => {
    const mineBid = pendingFor(job.id);
    setDetail(mineBid ? { kind: 'myBid', id: mineBid.id } : { kind: 'bid', id: job.id });
  };

  // ---------- Cards ----------
  /** Time left: the big countdown pill (see CountdownPill). */
  const timeLeft = (ms: number, urgent: boolean) => <CountdownPill ms={ms} urgent={urgent} />;

  /** Modern info chips: tinted pills with their emoji, no outline, under the description. */
  const chips = (items: (string | false | undefined | 0 | null)[]) => (
    <View style={styles.chipRow}>
      {items.filter(Boolean).map((c) => (
        <InfoChip key={String(c)} text={String(c)} />
      ))}
    </View>
  );

  /** The photos the customer attached, under the header like a card's media area (tap one to enlarge); an animation when there are none. */
  const photos = (job: JobDetails) => (
    <View style={styles.media}>
      {job.photos?.length ? <PhotoStrip photos={job.photos} height={190} /> : <NoPhotoAnimation emoji={categoryInfo(job.categoryId).icon} />}
    </View>
  );

  /** The card header: a round avatar, the title and subtitle, and a trailing value. */
  const cardHeader = (emoji: string, title: string, subtitle: string, trailing?: React.ReactNode) => (
    <View style={styles.cardHeader}>
      <CategoryArt emoji={emoji} size={44} />
      <View style={styles.flex1}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </View>
  );

  /** A Facebook-style post header: round avatar, the poster in bold, time and details in grey under it, the time left at the end. */
  const postHeader = (emoji: string, name: string, meta: string, trailing?: React.ReactNode, lead?: React.ReactNode, before?: React.ReactNode, subject?: string) => (
    <View style={styles.postHeader}>
      <CategoryArt emoji={emoji} size={48} />
      <View style={styles.flex1}>
        <View style={styles.nameRow}>
          {before}
          <Text style={[styles.postName, styles.nameShrink]} numberOfLines={1}>
            {name}
          </Text>
          {lead}
        </View>
        <Text style={styles.postMeta} numberOfLines={1}>
          {meta}
        </Text>
        {!!subject && (
          <Text style={styles.postSubjectHead} numberOfLines={1}>
            {subject}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );

  /** Whether a bid can be placed from the row itself (nothing holds it back: a head start, the day's limit, a locked high-value job). */
  const canQuickBid = (job: FeedJob) =>
    !pendingFor(job.id) &&
    !headStartUntil(job) &&
    intakeOn(dayStart(Date.now()) + 24 * 60 * 60 * 1000).remaining >= marketPrice(job.categoryId) &&
    !(isHighValueJob(job.categoryId) && !has('highValueJobs')) &&
    profile.services.includes(job.categoryId);

  /** A job in one row: what it is and for whom, how far, the time left and how many bids it has, and the button to bid. */
  const jobRow = (job: FeedJob) => {
    const cat = categoryInfo(job.categoryId);
    const left = bidDeadline(job) - now;
    const pending = pendingFor(job.id);
    return (
      <Pressable key={job.id} style={styles.jobRow} onPress={() => openJob(job)} accessibilityLabel={`${cat.name} job`}>
        <CategoryArt emoji={cat.icon} size={36} />
        <View style={styles.flex1}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.jobRowName, styles.nameShrink]} numberOfLines={1}>
              {cat.name}
            </Text>
            <CountdownPill ms={left} urgent={left < 30 * 60 * 1000} small />
          </View>
          {!!job.description && (
            <Text style={styles.jobRowSub} numberOfLines={1}>
              {job.description}
            </Text>
          )}
          <Text style={styles.jobRowSub} numberOfLines={1}>
            {job.vehicle.name} · {job.distanceKm} km · 🤝 {job.otherBids ?? 0}
          </Text>
        </View>
        {pending ? (
          <Text style={styles.jobRowDone}>{money(pending.price)}</Text>
        ) : canQuickBid(job) ? (
          <Pressable style={styles.jobRowBid} onPress={() => setSheet({ job })} hitSlop={6} accessibilityLabel={`Bid for ${cat.name}`}>
            <Text style={styles.jobRowBidText}>ලංසුව</Text>
          </Pressable>
        ) : (
          <Text style={styles.jobRowLock}>🔒</Text>
        )}
      </Pressable>
    );
  };

  const jobCard = (job: FeedJob) => {
    const cat = categoryInfo(job.categoryId);
    const left = bidDeadline(job) - now;
    return (
      <View key={job.id} style={styles.card}>
        <Pressable onPress={() => openJob(job)} accessibilityLabel={`${cat.name} job details`}>
        {postHeader(cat.icon, job.customer.name, `${ago(now - job.postedAt)} · ${job.vehicle.name}`, timeLeft(left, left < 30 * 60 * 1000), <><CustomerBadge customer={job.customer} compact />{job.republished && <View style={styles.republishedTag} accessibilityLabel="Posted again">
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={getThemeMode() === 'dark' ? '#fbbf24' : '#b06000'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 12a8 8 0 0113-6l3 3M20 4v5h-5M20 12a8 8 0 01-13 6l-3-3M4 20v-5h5" />
            </Svg>
          </View>}</>)}
        <View style={styles.postBody}>
          <Text style={styles.postSubjectHead}>{cat.name}</Text>
          <Text style={styles.postText} numberOfLines={4}>
            {job.description}
          </Text>
          {!!job.buddySummary && (
            <Text style={styles.buddy} numberOfLines={2}>
              ✦ {job.buddySummary}
            </Text>
          )}
          {chips([`📍 ${job.location.address} · ${job.distanceKm} km`, !!job.fitting && fittingLabel(job.fitting), isFarJob(job.distanceKm) && '🚗 දුර — ගමන් ගාස්තුව එකතු වේ', `🔩 ${SPARE_LABEL[job.sparePart]}`, job.doorstep && '🚛 නිවසටම'])}
        </View>
        {photos(job)}
        <View style={styles.postStats}>
          <Text style={styles.postStat}>🤝 {job.otherBids ? `ලංසු ${job.otherBids}` : 'පළමු ලංසුව ඔබගේ විය හැක'}</Text>
          <Text style={styles.postStat}>{mediaText(job)}</Text>
        </View>
        </Pressable>
        <View style={styles.postActions}>{bidActions(job)}</View>
      </View>
    );
  };

  const directCard = (d: DirectRequest) => {
    const cat = categoryInfo(d.categoryId);
    const left = d.respondBy - now;
    return (
      <SwipeCard key={d.id} style={styles.card} onOpen={() => setDetail({ kind: 'direct', id: d.id })}>
        <Pressable onPress={() => setDetail({ kind: 'direct', id: d.id })} accessibilityLabel={`${cat.name} request details`}>
        {postHeader(
          cat.icon,
          d.customer.name,
          `${ago(now - d.requestedAt)} · ${d.vehicle.name}`,
          d.status === 'new' ? timeLeft(left, left < 30 * 60 * 1000) : undefined,
          // After the customer's name: the stars the garages gave them, then whether they are new to this garage or have been served before.
          <>
            <CustomerBadge customer={d.customer} compact />
            <CustomerHistoryTag customer={d.customer} />
          </>
        )}
        <View style={styles.postBody}>
          <View style={styles.slot}>
            <Icon name="calendar" size={14} color={Colors.success} />
            <Text style={styles.slotText}>
              {formatDate(d.preferredAt)} · {formatTime(d.preferredAt)}
            </Text>
          </View>
          <Text style={styles.postSubjectHead}>{`${cat.name}${d.service ? ` · ${d.service}` : ''}`}</Text>
          <Text style={styles.postText} numberOfLines={4}>
            {d.description}
          </Text>
          {chips([`📍 ${d.distanceKm} km`, !!d.fitting && fittingLabel(d.fitting), `🔩 ${SPARE_LABEL[d.sparePart]}`, d.doorstep && '🚛 නිවසටම', mediaText(d)])}
        </View>
        {photos(d)}
        </Pressable>
        <View style={styles.postActions}>{directActions(d)}</View>
      </SwipeCard>
    );
  };

  const bidCard = (bid: MyBid) => {
    const cat = categoryInfo(bid.job.categoryId);
    const s = STATUS[bid.status];
    return (
      <Pressable key={bid.id} style={[styles.card, bid.status === 'withdrawn' && styles.dim]} onPress={() => setDetail({ kind: 'myBid', id: bid.id })} accessibilityLabel={`${cat.name} bid details`}>
        {cardHeader(cat.icon, cat.name, `${bid.job.vehicle.name} · ${bid.job.customer.name} · ${ago(now - bid.submittedAt)}`, <Text style={styles.price}>{money(bid.price)}</Text>)}
        <View style={styles.cardBody}>{chips([bid.warrantyMonths ? `🛡️ මාස ${bid.warrantyMonths} වගකීම` : 'වගකීමක් නැත', `⏱️ පැය ${bid.estHours}`, !!bid.travelFee && `🚗 ගමන් ගාස්තුව ඇතුළුව ${money(bid.travelFee)}`, !!bid.job.fitting && fittingLabel(bid.job.fitting)])}</View>
        {/* A bid the garage has won: the customer's record with this garage is shown now (it stays private while the job is only open for bids). */}
        {bid.status === 'won' && (
          <View style={styles.historyRow}>
            <CustomerHistoryTag customer={bid.job.customer} />
          </View>
        )}
        <View style={[styles.cardActions, styles.rowBetween]}>
          <View style={styles.statusRow}>
            {/* While the customer is still deciding, three dots beat one after another: the bid is waiting for an answer. */}
            {bid.status === 'pending' ? <WaitingDots color={s.color()} /> : <View style={[styles.dot, { backgroundColor: s.color() }]} />}
            <Text style={[styles.statusText, { color: s.color() }]}>{s.label}</Text>
          </View>
          {bid.status === 'pending' && (
            <View style={styles.row}>
              <Pressable style={styles.linkBtn} onPress={() => withdrawBid(bid.id)}>
                <Text style={[styles.link, { color: Colors.errorText }]}>ඉවත් කරන්න</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => setSheet({ job: bid.job, existing: bid })}>
                <Text style={styles.link}>සංස්කරණය</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };


  // "My services", "All" and "MyBids" start the filter row on the Jobs page.
  const scopeButtons = (
    <>
      {/* My bids, first in the row: the bids this garage has sent (a bid just sent flies here). */}
      <Animated.View style={comesDown}>
      <Pressable ref={myBidsChip} style={[styles.filter, segment === 'mine' && styles.filterActive]} onPress={() => setSegment('mine')} accessibilityRole="button" accessibilityLabel="මගේ ලංසු" accessibilityState={{ selected: segment === 'mine' }}>
        <Icon name="tag" size={20} color={segment === 'mine' ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} />
        <Text style={[styles.filterText, segment === 'mine' && styles.filterTextActive]}>MyBids</Text>
        {pendingBids > 0 && (
          <View style={[styles.segCount, styles.segCountOn]}>
            <Text style={[styles.segCountText, styles.segCountTextOn]}>{pendingBids}</Text>
          </View>
        )}
      </Pressable>
      </Animated.View>
      {/* "My services" and "All" are one chip holding both icons: touching it anywhere switches to the other option, and the chosen option's icon lights up. */}
      <Pressable style={styles.scopeChip} onPress={() => setScope(scope === 'services' ? 'all' : 'services')} accessibilityRole="button" accessibilityLabel={scope === 'services' ? 'My services (touch for all jobs)' : 'All jobs (touch for my services)'}>
        {(
          [
            ['services', JobsLineIcon],
            ['all', OrdersLineIcon],
          ] as [Scope, React.ComponentType<{ active: boolean; size?: number }>][]
        ).map(([id, FilterIcon]) => (
          <View key={id} style={[styles.scopeOption, scope === id && styles.filterActive]} accessibilityState={{ selected: scope === id }}>
            <FilterIcon active={scope === id} size={20} />
            {id === 'all' && <Text style={[styles.filterText, scope === id && styles.filterTextActive]}>All</Text>}
          </View>
        ))}
      </Pressable>
    </>
  );

  return (
    <View style={styles.flex1}>
      <Animated.View style={styles.tabBar} onLayout={(e) => e.nativeEvent.layout.height > 0 && setBarH(e.nativeEvent.layout.height)}>
        <PinnedEdge progress={edge} />
        <View style={styles.segRow}>
          {segments.map((t) => {
            const active = segment === t.id;
            const flashing = t.id === 'sos' && t.alert;
            const chip = (
              <Pressable key={t.id} ref={t.id === 'mine' ? myBidsTopChip : undefined} style={[styles.segChip, active && styles.segChipOn, flashing && styles.segChipSos]} onPress={() => (t.id === 'sos' ? onOpenSos() : setSegment(t.id))} accessibilityLabel={t.label}>
                {flashing && (
                  <>
                    <Animated.View pointerEvents="none" style={[styles.sosRing, { opacity: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scaleX: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }, { scaleY: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.sosGlow, { opacity: sosPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.05, 0.28, 0.05] }) }]} />
                  </>
                )}
                <Icon name={t.icon} size={15} color={flashing ? '#d93025' : active ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} />
                <Text style={[styles.segChipText, active && styles.segChipTextOn]} numberOfLines={1}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={[styles.segCount, t.alert && styles.segCountAlert, active && !t.alert && styles.segCountOn]}>
                    <Text style={[styles.segCountText, (active || t.alert) && styles.segCountTextOn]}>{t.count}</Text>
                  </View>
                )}
              </Pressable>
            );
            // The first slot (ලංසු රැකියා, or MyBids while My bids is open) is the chip that swaps.
            return t.id === 'open' || t.id === 'mine' ? (
              <Animated.View key={t.id} style={[styles.swapSlot, goesUp]}>
                {chip}
              </Animated.View>
            ) : (
              chip
            );
          })}
        </View>
        {/* The filter row is part of the pinned bar (not of the list), so it stays on screen with the chips while the list scrolls. */}
        {segment === 'open' && (
              <View style={[styles.filters, styles.barFilters]}>
                {scopeButtons}
                {/* From here the icons sit at the right-hand end of the row: fewest bids first, then the rows icon, then the rest. */}
                <Pressable style={[styles.filter, fewBids && styles.filterActive]} onPress={() => setFewBids((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: fewBids }} accessibilityLabel={fewBids ? 'Show all the jobs' : 'Only the jobs with the fewest bids'}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={fewBids ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M7 4v15M7 19l-3-3.5M7 19l3-3.5" />
                    <Path d="M13 6h7M13 12h5M13 18h3" />
                  </Svg>
                </Pressable>
                <Pressable style={[styles.filter, rowsView && styles.filterActive]} onPress={() => setRowsView((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: rowsView }} accessibilityLabel={rowsView ? 'Show the jobs as cards' : 'Show all the jobs as rows'}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={rowsView ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {rowsView ? (
                      <>
                        <Rect x={4} y={4} width={16} height={7} rx={2} />
                        <Rect x={4} y={13} width={16} height={7} rx={2} />
                      </>
                    ) : (
                      <Path d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </Svg>
                </Pressable>
                <Pressable style={[styles.filter, republishedOnly && styles.filterActive]} onPress={() => setRepublishedOnly((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: republishedOnly }} accessibilityLabel={republishedOnly ? 'Show all the jobs' : 'Only the jobs posted again'}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={republishedOnly ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M4 12a8 8 0 0113-6l3 3M20 4v5h-5M20 12a8 8 0 01-13 6l-3-3M4 20v-5h5" />
                  </Svg>
                </Pressable>
                <Pressable style={[styles.filter, nearest && styles.filterActive]} onPress={() => setNearest((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: nearest }} accessibilityLabel={nearest ? 'Show all the jobs' : `Only the jobs within ${NEAR_KM} km`}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={nearest ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
                    <Circle cx={12} cy={10} r={2.5} />
                  </Svg>
                </Pressable>
              </View>
        )}
        {/* In My bids the job filters are gone, and the two chips have swapped places: "MyBids" took the "ලංසු රැකියා" place in the top bar, and "ලංසු රැකියා" sits here (touch it to swap back). */}
        {segment === 'mine' && (
              <View style={[styles.filters, styles.barFilters]}>
                <Animated.View style={comesDown}>
                  <Pressable style={styles.filter} onPress={() => setSegment('open')} accessibilityRole="button" accessibilityLabel="ලංසු රැකියා">
                    <Icon name="inbox" size={20} color={Colors.textMuted} />
                    <Text style={styles.filterText}>ලංසු රැකියා</Text>
                  </Pressable>
                </Animated.View>
              </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.listLayer, { top: barH, bottom: 0, opacity: listIn, transform: [{ translateY: listIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <ScrollView
        style={styles.flex1}
        {...scrollProps}
        onScroll={(e) => {
          scrollProps.onScroll(e);
          onScrollY(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {segment === 'open' && (
          <>
            {shown.length === 0 ? (
              fewBids || republishedOnly || nearest ? (
                <EmptyState icon="🔎" title={nearest ? 'ළඟම රැකියා නැත' : republishedOnly ? 'නැවත පළ කළ රැකියා නැත' : 'අඩු ලංසු සහිත රැකියා නැත'} text={nearest ? `ගරාජයේ සිට කි.මී. ${NEAR_KM} ඇතුළත රැකියා නැත. පෙරහන ඉවත් කර සියල්ල බලන්න.` : republishedOnly ? 'ලංසු කාලය අවසන් වී හිමියන් නැවත පළ කළ රැකියා මෙහි පෙන්වයි.' : 'සියලු රැකියාවලට දැනටමත් ලංසු කිහිපයක් ඇත. පෙරහන ඉවත් කර සියල්ල බලන්න.'} />
              ) : (
              <EmptyState icon="📭" title="නව රැකියා නැත" text="වාහන හිමියන් ඔබගේ සේවා සඳහා රැකියා පළ කළ විට ඒවා මෙහි පෙන්වනු ඇත." />
              )
            ) : (
              rowsView ? <View style={styles.jobRows}>{shown.map(jobRow)}</View> : shown.map(jobCard)
            )}
          </>
        )}

        {segment === 'direct' && (
          <>
            {directList.length === 0 && leaving.length === 0 ? (
              <EmptyState icon="📅" title="ඍජු ඉල්ලීම් නැත" text="හිමියන් ඔබගේ ගරාජය ඍජුවම වෙන් කළ විට ඒවා මෙහි පෙන්වනු ඇත." />
            ) : (
              (() => {
                const out: React.ReactNode[] = directList.map(directCard);
                [...leaving]
                  .sort((a, b) => a.at - b.at)
                  .forEach(({ d, at }) => {
                    out.splice(
                      Math.min(at, out.length),
                      0,
                      <LeavingCard key={`leaving-${d.id}`} onDone={() => setLeaving((l) => l.filter((x) => x.d.id !== d.id))}>
                        {directCard(d)}
                      </LeavingCard>
                    );
                  });
                return out;
              })()
            )}
          </>
        )}

        {segment === 'mine' && (
          <>
            {bids.length === 0 ? (
              <EmptyState icon="🏷️" title="තවම ලංසු නැත" text="“ලංසු රැකියා” වෙතින් ලංසුවක් තැබූ විට එය මෙහි පෙන්වනු ඇත." />
            ) : (
              bids.map(bidCard)
            )}
          </>
        )}
      </ScrollView>
      </Animated.View>

      <JobDetailView
        target={detailTarget}
        onClose={() => setDetail(null)}
        renderActions={(t) => (t.kind === 'myBid' ? myBidActions(t.bid) : t.kind === 'bid' ? bidActions(t.job, true) : t.kind === 'direct' ? directActions(t.job, true) : null)}
      />
      <BidSheet job={sheet?.job ?? null} existing={sheet?.existing} onClose={() => setSheet(null)} />
      <DirectReplySheet request={reply?.request ?? null} mode={reply?.mode ?? 'accept'} onClose={() => setReply(null)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    locked: { padding: 12, borderRadius: 16, backgroundColor: softFill() },
    lockedText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, lineHeight: 17 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    actionsRow: { flexDirection: 'row', gap: 8 },

    // One soft track with a raised active segment, instead of separate pills and badges.
    // The bar sits on top of the list layer, which starts under it and reaches one bar-height past the bottom.
    listLayer: { position: 'absolute', left: 0, right: 0 },
    tabBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, paddingHorizontal: 6, paddingTop: 14, paddingBottom: 2, backgroundColor: pageBg() },
    // The three views are three separate chips: each its own outlined chip, the selected one tonal blue, the count a badge in it.
    segRow: { flexDirection: 'row', gap: 8 },
    segChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 44, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 },
    segChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    swapSlot: { flex: 1 },
    segChipSos: { borderColor: '#ee675c' },
    sosRing: { ...StyleSheet.absoluteFill, borderRadius: 12, borderWidth: 2, borderColor: '#ee675c' },
    sosGlow: { ...StyleSheet.absoluteFill, borderRadius: 12, backgroundColor: '#ef4444' },
    segChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, flexShrink: 1 },
    segChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    segCount: { position: 'absolute', top: -9, right: 6, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: pageBg(), alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    segCountOn: { backgroundColor: '#1a73e8' },
    segCountAlert: { backgroundColor: '#ef4444' },
    segCountText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    segCountTextOn: {},

    body: { paddingVertical: 16, paddingHorizontal: 6, paddingTop: 4, gap: 14, paddingBottom: 250 },
    filters: { flexDirection: 'row', gap: 8 },
    // The chips and icons are spread over the row with the same space between each.
    barFilters: { justifyContent: 'space-between', paddingTop: 10, paddingBottom: 4, paddingRight: 2 },
    filter: { minWidth: 40, flexDirection: 'row', gap: 5, paddingHorizontal: 10, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    scopeChip: { flexDirection: 'row', alignItems: 'center', height: 28, padding: 2, gap: 2, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    scopeOption: { minWidth: 34, flexDirection: 'row', gap: 5, paddingHorizontal: 8, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: 'transparent' },
    filterActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    filterText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    filterTextActive: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },

    // Material-style cards: 12px corners, a thin outline and a light elevation, with a header, a body and an action area.
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', borderRadius: 12, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 },
    nameShrink: { flexShrink: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    republishedTag: { width: 22, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.14)' : '#fef7e0' },
    postSubjectHead: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: 2 },
    historyRow: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 16, paddingTop: 14, paddingBottom: 10 },
    postAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe' },
    postAvatarEmoji: { fontSize: 22 },
    postName: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    postMeta: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    postBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
    postText: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 22 },
    postStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    postStat: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    postActions: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
    cardBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
    cardActions: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    jobRows: { gap: 8 },
    jobRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    jobRowName: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    jobRowSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    jobRowBid: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: '#1a73e8' },
    jobRowBidText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    jobRowDone: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.warning },
    jobRowLock: { fontSize: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe' },
    avatarEmoji: { fontSize: 20 },
    media: { paddingHorizontal: 0, paddingBottom: 0 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, height: 28, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    chipText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    dim: { opacity: 0.55 },
    cardTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    desc: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 21 },
    buddy: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.primary, lineHeight: 17 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    slot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    slotText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    proposed: { padding: 12, borderRadius: 14, backgroundColor: softFill(), gap: 2 },
    proposedText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, flexShrink: 1 },
    linkBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
  })
);
