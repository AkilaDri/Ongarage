import { GarageHistoryTag, useUsedGarages } from '../components/GarageHistory';
import { Gradient, LkPlate, PhotoStrip, VoiceNotePlayer, bidWork, marketPrice, MoneyText } from '@ongarage/shared';
import { cardGlow, elevation1, outline, pageBg } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { chatDockOffset, chatHide } from '../utils/chatDock';
import { PopCount } from '../components/PopCount';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { Colors, LevelBadge, pageHeaderBlue, getThemeMode, themedStyles, LEVELS } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';

import { SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { Icon, ClipboardLineIcon, ReceiptLineIcon, ScheduleLineIcon } from '@ongarage/shared';
import { GoogleMap, zoomToFit } from '@ongarage/shared';
import { ActionButton, EmptyState, GlassIcon, ModalCard, SwipeCard } from '@ongarage/shared';
import { OwnerDetailView } from '../components/OwnerDetailView';
import { GarageReviewsSheet, garageForBid } from '../components/GarageReviewsSheet';
import { ThreeStateSheet, type SheetApi } from '../components/ThreeStateSheet';
import { GARAGE_COVERS } from '../constants/home';
import { BIDS_TITLE_H } from '../constants/layout';
import { CategoryPhoto } from '../components/home/CategoryPhoto';
import { money } from '../utils/format';
import { Sheet } from '../components/Sheet';
import { sparePartLabel } from '../constants/labels';
import { biddingEndsAt, isExpired, lowestBidId, useBids } from '../context/BidsContext';
import { useUserLocation } from '../context/LocationContext';
import { useWorkshops } from '../context/WorkshopContext';
import { usePayStanding } from '../context/PayStanding';
import { directionsUrl } from '@ongarage/shared';
import type { Bid, JobDraft, RepairJob } from '@ongarage/shared';

export type BidsTab = 'received' | 'pending' | 'expired';

// The tab bar's look: Material primary tabs on one white surface; the chosen tab is Google-blue with a line under it.
const TAB_BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb');
// The count badge is green on "received" (good news) and red on the others (things waiting on you).
const badgeColor = (id: BidsTab) => (id === 'received' ? '#16a34a' : '#ef4444');

const pad = (n: number) => String(n).padStart(2, '0');

const countdown = (ms: number) => {
  if (ms <= 0) return 'කල් ඉකුත් විය';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${pad(m)}m ${pad(s)}s`;
};

const ago = (ms: number) => {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'දැන්';
  if (min < 60) return `මිනි. ${min}කට පෙර`;
  return `පැය ${Math.floor(min / 60)}කට පෙර`;
};

interface BidsScreenProps {
  tab: BidsTab;
  /** 0 to 1 as the open sheet's list is scrolled: the app's header band folds away in step (as on Activity) and the tab bar stays pinned. */
  onHeaderCollapse?: (node: { interpolate: Animated.Value['interpolate'] } | null) => void;
  /** Filled with the function that lowers the sheet, so the app's header (which carries the close mark while the sheet is up) can call it. */
  minimizeRef?: React.MutableRefObject<(() => void) | null>;
  onTabChange: (tab: BidsTab) => void;
  /** Every received bid as one row instead of a full card each; the switch is the hamburger in the app's title bar. */
  rowsView: boolean;
  onToggleRows: () => void;
  onRepublish: (draft: JobDraft) => void;
  /** The "＋ නව ලංසුවක්" chip at the top of the sheet: start a new job request. */
  onNewBid?: () => void;
  /** Accepting a bid is paused while a long-overdue balance limits new work: the app tells the owner to pay first. */
  onPayFirst: () => void;
  onViewActivity: () => void;
  /** The top bar folds away while the sheet is fully open (and returns when it comes back down). */
  onHeaderVisibilityChange?: (visible: boolean) => void;
}

/** Minimised sheet: a handle and one row of round photos. */
const PEEK_HEIGHT = 128;
/** The floating tab bar the sheet must clear. */
const NAV_HEIGHT = 72;
/** The room the pinned tab bar takes at the top of the Bids tab: the Received sheet stops below it. */
const TABS_BLOCK_H = 66;
/** A bid's price on its card: "LKR 12,500". */
const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;
const ZERO = new Animated.Value(0);
const ONE = new Animated.Value(1);
/** 3,700 → "3.7k": a price short enough for a small badge. */
const shortMoney = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

export const BidsScreen: React.FC<BidsScreenProps> = ({ tab, onTabChange, rowsView, onToggleRows, onRepublish, onNewBid, onPayFirst, onViewActivity, onHeaderVisibilityChange, onHeaderCollapse, minimizeRef }) => {
  // "Garages I have used": narrows the received bids to the garages the owner has finished a job with before.
  const isUsed = useUsedGarages();
  const [usedOnly, setUsedOnly] = useState(false);
  const [bidSort, setBidSort] = useState<BidSort>('price');
  const { jobs, acceptBid, removeBid, removeJob, postJob } = useBids();
  const { workshops } = useWorkshops();
  const { findVehicle } = useVehicles();
  const user = useUserLocation();
  const [now, setNow] = useState(Date.now());
  // A waiting or expired job the owner is about to delete (asked first).
  const [deleting, setDeleting] = useState<RepairJob | null>(null);
  const [confirming, setConfirming] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const standing = usePayStanding();
  const askAccept = (v: { job: RepairJob; bid: Bid }) => (standing.limited ? onPayFirst() : setConfirming(v));
  // One garage's bid, opened by tapping or swiping it inside the job card.
  // Height of the tab (the map and the sheet's expanded height).
  const [area, setArea] = useState(0);
  // The tab's height with the page header showing: the sheet is sized from this, so folding the header (which makes the tab taller) does not re-size it; its top edge rides up with the header through `boost` instead.
  const [stableArea, setStableArea] = useState(0);
  const [boost, setBoost] = useState<Animated.AnimatedNode | null>(null);
  const hiddenVal = useRef(0);
  // True only once the sheet has really reached the top: the header's blue is not pulled down over the map while it rises; the sheet's own bar turns blue on arrival.
  const [atTop, setAtTop] = useState(false);
  const atTopRef = useRef(false);
  const arrivedAt = useRef(0);
  const [sheetH, setSheetH] = useState<Animated.Value | null>(null);
  // How close to the top the sheet is (0 = low, 1 = open): the heading, the tabs and the map controls fade with the sheet's height instead of popping when it settles.
  const topFull = Math.max((stableArea || area) - NAV_HEIGHT - (tab === 'received' ? TABS_BLOCK_H : 0), PEEK_HEIGHT + 120);
  const topFullRef = useRef(0);
  topFullRef.current = topFull;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const topP = sheetH ? sheetH.interpolate({ inputRange: [topFull - 140, topFull], outputRange: [0, 1], extrapolate: 'clamp' }) : ZERO;
  const mapP = sheetH ? sheetH.interpolate({ inputRange: [topFull - 130, topFull - 60], outputRange: [1, 0], extrapolate: 'clamp' }) : ONE;
  const [sheetState, setSheetState] = useState<'peek' | 'collapsed' | 'expanded'>('collapsed');
  // The map keeps the height the tab has with the top band showing (the smallest it ever measures) and stays anchored to the
  // bottom: when the band folds away and the tab grows upward, the map does not move or re-centre; only the sheet rises over it.
  const [mapArea, setMapArea] = useState(0);
  // An old job the owner wants to put out again: its summary opens first (post it as it was, or edit it), not an empty form.
  const [repub, setRepub] = useState<RepairJob | null>(null);
  const [bidView, setBidView] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const [booked, setBooked] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // The bid whose pin on the map was touched: shown as a small record card over the map.
  const [pinBid, setPinBid] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // The garage's card on the map closes as soon as the sheet is pulled up over it.
  const pinOpenH = useRef<number | null>(null);
  const lastSheetH = useRef(0);
  useEffect(() => {
    if (!sheetH) return;
    const id = sheetH.addListener(({ value }) => {
      lastSheetH.current = value;
      const top = value >= topFullRef.current - 3 && tabRef.current === 'received';
      if (top !== atTopRef.current) {
        atTopRef.current = top;
        if (top) arrivedAt.current = Date.now();
        setAtTop(top);
      }
      if (pinOpenH.current !== null && value > pinOpenH.current + 8) {
        pinOpenH.current = null;
        setPinBid(null);
      }
    });
    return () => sheetH.removeListener(id);
  }, [sheetH]);
  useEffect(() => {
    pinOpenH.current = pinBid ? lastSheetH.current : null;
  }, [pinBid]);
  // Swipe (or tap the header of) a job card for everything about it.
  const [detailId, setDetailId] = useState<string | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  // The chat icon sits under the pinned tab bar once the title band has folded away.
  const tabBarH = useRef(0);
  // The pinned part at the top is the chip row ("＋ නව ලංසුවක්") and the tab bar under it: the icon drops below both.
  const headRowH = useRef(0);
  // The "＋ නව ලංසුවක්" chip hides as the sheet scrolls up and comes back on a small drag down. Its row (which also holds the minimise button
  // while the sheet is open to the top) keeps its height then; with the sheet lower the empty row folds away.
  const chipAnim = useRef(new Animated.Value(1)).current;
  const rowAnim = useRef(new Animated.Value(1)).current;
  const [headH, setHeadH] = useState(0);
  const [chipShown, setChipShown] = useState(true);
  const rowShown = useRef(true);
  const lastScrollY = useRef(0);
  const syncDock = () => chatDockOffset.setValue((rowShown.current ? headRowH.current : 0) + tabBarH.current + 16);
  const applyChip = (show: boolean, expanded: boolean) => {
    setChipShown(show);
    rowShown.current = show || expanded;
    Animated.timing(chipAnim, { toValue: show ? 1 : 0, duration: 180, useNativeDriver: false }).start();
    Animated.timing(rowAnim, { toValue: rowShown.current ? 1 : 0, duration: 180, useNativeDriver: false }).start();
    // The chat icon goes with the chip: hidden as the page scrolls up, back on a drag down.
    Animated.timing(chatHide, { toValue: show ? 0 : 1, duration: 180, useNativeDriver: false }).start();
    syncDock();
  };
  useEffect(() => {
    syncDock();
    return () => {
      chatDockOffset.setValue(0);
      chatHide.setValue(0);
    };
  }, []);
  const detailJob = jobs.find((j) => j.id === detailId) ?? null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const received = jobs.filter((j) => j.bids.length > 0);
  const pending = jobs.filter((j) => j.bids.length === 0 && !isExpired(j, now));
  const expired = jobs.filter((j) => isExpired(j, now));
  const mapBids = received.filter((j) => !j.acceptedBidId).flatMap((j) => j.bids.map((b) => ({ job: j, bid: b, lowest: b.id === lowestBidId(j.bids) })));

  // The other tabs (waiting, expired) keep the header as it is before the Received sheet is raised: whole, with its heading and ONCHAT.
  useEffect(() => {
    if (tab !== 'received') {
      headerHidden.current = false;
      hiddenAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  // The header folds away only while the sheet is open to the top, and its height follows the sheet's own height: dragging the sheet down brings the header back in step with it, as one movement.
  useEffect(() => {
    if (!sheetH) return;
    // Measured against the area with the header showing, so folding the header (which makes the area taller) does not move the target.
    const baseFull = Math.max((stableArea || baseArea.current) - NAV_HEIGHT - (tab === 'received' ? TABS_BLOCK_H : 0), PEEK_HEIGHT + 120);
    const collapse = Animated.multiply(sheetH.interpolate({ inputRange: [baseFull - 140, baseFull - 6], outputRange: [0, 1], extrapolate: 'clamp' }), hiddenAnim);
    onHeaderCollapse?.(collapse);
    setBoost(Animated.multiply(collapse, BIDS_TITLE_H));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetH, tab, stableArea]);


  const lastListY = useRef(0);
  const headerHidden = useRef(false);
  const lastToggle = useRef(0);
  // 0 / 1: the list has been scrolled on, so the header is folded (while the sheet is up).
  const hiddenAnim = useRef(new Animated.Value(0)).current;
  const localMin = useRef<() => void>(() => {});
  const baseArea = useRef(0);
  const stableAreaRef = useRef(0);
  useEffect(() => {
    const id = hiddenAnim.addListener(({ value }) => {
      hiddenVal.current = value;
    });
    return () => hiddenAnim.removeListener(id);
  }, [hiddenAnim]);

  const tabs: { id: BidsTab; label: string; icon: React.ComponentType<{ active: boolean; size?: number; color?: string }>; count: number }[] = [
    { id: 'received', label: 'ලැබුණු', icon: ClipboardLineIcon, count: received.length },
    { id: 'pending', label: 'රැඳී ඇති', icon: ScheduleLineIcon, count: pending.length },
    { id: 'expired', label: 'කල් ඉකුත්', icon: ReceiptLineIcon, count: expired.length },
  ];

  /** The details link sits in the card's bottom right corner. */
  /** The details link at the end of a card; with `onDelete` a delete link stands in front of it. */
  const detailsCorner = (job: RepairJob, onDelete?: () => void) => (
    <View style={styles.detailsCorner}>
      {!!onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Delete this job">
          <Text style={styles.deleteLink}>🗑️ මකන්න</Text>
        </Pressable>
      )}
      <Pressable onPress={() => setDetailId(job.id)} hitSlop={8} accessibilityLabel="Job details">
        <Text style={styles.detailsLink}>විස්තර ›</Text>
      </Pressable>
    </View>
  );
  const jobHeader = (job: RepairJob, badge: React.ReactNode) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
    const vehicle = findVehicle(job.vehicleId);
    const media = [job.photos?.length && `📷 ${job.photos.length}`, job.voiceNotes?.length && `🎙️ ${job.voiceNotes.length}`].filter(Boolean).join('  ');
    return (
      <>
      <Pressable
        style={styles.jobHead}
        onPressIn={(e) => (pressStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        // A tap opens the job; a drag that merely ends inside the header (a swipe) does not.
        onPress={(e) => {
          const moved = Math.hypot(e.nativeEvent.pageX - pressStart.current.x, e.nativeEvent.pageY - pressStart.current.y);
          if (moved < 12) setDetailId(job.id);
        }}
        accessibilityLabel={`${cat?.name ?? 'Job'} details`}
      >
        <CategoryPhoto categoryId={job.categoryId} size={50} />
        <View style={styles.flex1}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {cat?.name ?? 'Service'}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {vehicle ? vehicle.name : ''}
            {media ? `${vehicle ? '  ·  ' : ''}${media}` : ''}
          </Text>
          {vehicle && <LkPlate plate={vehicle.registrationNo || vehicle.plate} stacked={vehicle.type === 'Motorbike'} small />}
        </View>
        {badge}
      </Pressable>
      </>
    );
  };

  /** The summary of a job being put out again: what was posted, then "post again" as it was or "edit first". */
  const renderRepublish = () => {
    const job = repub;
    const vehicle = job ? findVehicle(job.vehicleId) : undefined;
    const rows: [string, string][] = job
      ? [
          ['🛠️ සේවාව', SERVICE_CATEGORIES.find((c) => c.id === job.categoryId)?.name ?? 'Service'],
          ['🚗 වාහනය', vehicle ? `${vehicle.name} · ${vehicle.plate}` : '—'],
          ['🔩 කොටස්', sparePartLabel(job.sparePart)],
          ['📍 ස්ථානය', job.doorstep ? `ගරාජය ඔබ ළඟට එයි · ${job.address}` : job.address],
          ['⏱️ ලංසු කාලය', `පැය ${job.biddingHours}`],
        ]
      : [];
    return (
      <Sheet
        visible={!!job}
        title="නැවත පළ කරන්න"
        subtitle="ඔබ පළ කළ ලංසු ඉල්ලීමේ සාරාංශය"
        onClose={() => setRepub(null)}
        footer={
          job ? (
            <View style={styles.repubBtns}>
              <ActionButton
                label="නැවත පළ කරන්න"
                icon="🔁"
                variant="sos"
                onPress={() => {
                  const { id, submittedAt, bids, acceptedBidId, ...rest } = job;
                  setRepub(null);
                  postJob({ ...rest, replacesJobId: id });
                }}
              />
              <ActionButton
                label="සංස්කරණය කර පළ කරන්න"
                icon="📝"
                variant="ghost"
                onPress={() => {
                  const j = job;
                  setRepub(null);
                  onRepublish(draftFor(j));
                }}
              />
            </View>
          ) : undefined
        }
      >
        {job && (
          <>
            <View style={styles.repubCard}>
              {rows.map(([k, v]) => (
                <View key={k} style={styles.repubRow}>
                  <Text style={styles.repubKey}>{k}</Text>
                  <Text style={styles.repubVal}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.repubDesc}>{job.description}</Text>
            <Text style={styles.repubSection}>ඡායාරූප {job.photos?.length ? `(${job.photos.length})` : ''}</Text>
            <PhotoStrip photos={job.photos ?? []} height={110} emptyText="ඡායාරූප එවා නැත" />
            <Text style={styles.repubSection}>හඬ සටහන් {job.voiceNotes?.length ? `(${job.voiceNotes.length})` : ''}</Text>
            {job.voiceNotes?.length ? job.voiceNotes.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} />) : <Text style={styles.repubDesc}>හඬ සටහන් එවා නැත</Text>}
          </>
        )}
      </Sheet>
    );
  };

  const draftFor = (job: RepairJob): JobDraft => ({
    categoryId: job.categoryId,
    description: job.description,
    vehicleId: job.vehicleId,
    replacesJobId: job.id,
  });

  const removeBidAndPin = (jobId: string, bidId: string) => {
    if (pinBid?.bid.id === bidId) setPinBid(null);
    removeBid(jobId, bidId);
  };

  const renderBidCard = (job: RepairJob, bid: Bid) => {
    const market = marketNote(job, bid);
    const isLowest = bid.id === lowestBidId(job.bids);
    const isAccepted = job.acceptedBidId === bid.id;
    const garage = garageForBid(bid);
    return (
      <SwipeCard key={bid.id} style={[styles.bidCard, isLowest && !job.acceptedBidId && styles.bidCardLowest, isAccepted && styles.bidCardAccepted]} onOpen={() => setBidView({ job, bid })}>
        {/* Laid out like a Facebook post: who (photo, name, when) with a "more" menu, the content, a counts line, a rule, then the equal action buttons. */}
        <View style={styles.fbHead}>
          <Image source={GARAGE_COVERS[garage.id]} style={styles.bidAvatar} accessibilityLabel={`${bid.garageName} photo`} />
          <View style={styles.flex1}>
            {/* Like a profile name on a post: bold, with the level as a small badge after it (where a page shows its tick). */}
            <View style={styles.fbNameRow}>
            <Text style={[styles.fbName, styles.fbNameText]} numberOfLines={1}>
              {bid.garageName}
              {bid.level ? <Text style={styles.fbBadge}>{` ${LEVELS.find((l) => l.id === bid.level)?.icon}`}</Text> : null}
            </Text>
            {/* The New / returning tag stands right after the name. */}
            <GarageHistoryTag garage={garage} part="tag" />
            </View>
            <Text style={styles.fbRating} numberOfLines={1}>
              <Text style={styles.fbStars}>{'★'.repeat(Math.round(bid.rating))}{'☆'.repeat(5 - Math.round(bid.rating))}</Text> {bid.rating.toFixed(1)} ({bid.reviews})
            </Text>
          </View>
          {!isAccepted && (
            <Pressable style={styles.fbMore} onPress={() => removeBidAndPin(job.id, bid.id)} hitSlop={8} accessibilityLabel={`Delete bid from ${bid.garageName}`}>
              <Icon name="trash" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Text style={styles.fbSubLine} numberOfLines={1}>
          {ago(now - bid.submittedAt)} · {SERVICE_CATEGORIES.find((c) => c.id === job.categoryId)?.name ?? 'Service'}{isLowest && !job.acceptedBidId ? ' · 💰 අඩුම ලංසුව' : ''}
        </Text>
        <Pressable style={styles.fbContent} onPress={() => setBidView({ job, bid })} accessibilityLabel={`${bid.garageName} bid details`}>
          <MoneyText style={styles.fbPrice}>{bid.travelFee ? '🚗 ' : ''}{lkr(bid.price)}</MoneyText>
          <Text style={styles.fbText}>
            🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours}{bid.travelFee ? ` · 🚗 ගමන් ගාස්තුව ${money(bid.travelFee)} ඇතුළුව` : ''}
          </Text>
          <GarageHistoryTag garage={garage} part="line" />
          {!!market && <Text style={[styles.marketNote, market.cheaper ? styles.marketCheaper : styles.marketDearer]}>{market.text}</Text>}
          {!!bid.travelFee && (
            <View style={styles.travelNote} accessibilityLabel="Bid includes travel fee">
              <Text style={styles.travelNoteTitle}>🚗 දුර ගමන් ගාස්තුව ඇතුළු ලංසුවකි</Text>
              <Text style={styles.travelNoteText}>
                ගරාජය ඔබෙන් km {bid.distanceKm} ක් ඈතයි · රැකියාව {money(bidWork(bid))} + ගමන් වන්දිය {money(bid.travelFee)}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={styles.fbCounts}>
          <Text style={styles.fbCountText}>📍 {bid.distanceKm} km</Text>
        </View>
        <View style={styles.fbActions}>
          <Pressable style={styles.fbAction} onPress={() => setBidView({ job, bid })} accessibilityLabel="Open bid details">
            <Text style={styles.fbActionText}>📄 විස්තර</Text>
          </Pressable>
          <Pressable style={styles.fbAction} onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))} accessibilityLabel="Directions to the garage">
            <Text style={styles.fbActionText}>🗺️ දිශාවන්</Text>
          </Pressable>
          {isAccepted ? (
            <View style={[styles.fbAction, styles.fbActionDone]}>
              <Text style={[styles.fbActionText, { color: '#713f12' }]}>✓ තහවුරුයි</Text>
            </View>
          ) : (
            <Pressable style={[styles.fbAction, styles.fbActionAccept, isLowest && styles.fbActionLowest]} onPress={() => askAccept({ job, bid })} accessibilityLabel={`Accept the bid of ${bid.garageName}`}>
              <Text style={[styles.fbActionText, styles.fbActionPrimary, isLowest && styles.fbActionLowestText]}>✓ පිළිගන්න</Text>
            </Pressable>
          )}
        </View>
      </SwipeCard>
    );
  };

  /** A bid in one row: the garage, how it rates and how far it is, the price, and the button to accept it. */
  const renderBidRow = (job: RepairJob, bid: Bid) => {
    const isLowest = bid.id === lowestBidId(job.bids);
    const isAccepted = job.acceptedBidId === bid.id;
    return (
      <Pressable key={bid.id} style={[styles.bidRow, isLowest && !job.acceptedBidId && styles.bidRowLowest, isAccepted && styles.bidRowAccepted]} onPress={() => setBidView({ job, bid })} accessibilityLabel={`${bid.garageName} bid`}>
        <View style={styles.flex1}>
          <Text style={styles.bidRowName} numberOfLines={1}>
            {bid.level ? `${LEVELS.find((l) => l.id === bid.level)?.icon} ` : ''}
            {bid.garageName}
          </Text>
          <Text style={styles.bidRowSub} numberOfLines={1}>
            ★ {bid.rating.toFixed(1)} ({bid.reviews}) · km {bid.distanceKm} · මාස {bid.warrantyMonths}{isLowest && !job.acceptedBidId ? ' · 💰 අඩුම' : ''}{marketNote(job, bid) ? ` · ${marketNote(job, bid)!.short}` : ''}
          </Text>
        </View>
        <Text style={styles.bidRowPrice}>{money(bid.price)}</Text>
        {isAccepted ? (
          <Text style={styles.bidRowDone}>✓</Text>
        ) : (
          <Pressable style={[styles.bidRowAccept, isLowest && styles.bidRowAcceptLowest]} onPress={() => askAccept({ job, bid })} hitSlop={6} accessibilityLabel={`Accept the bid of ${bid.garageName}`}>
            <Text style={styles.bidRowAcceptText}>පිළිගන්න</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  // The three tabs (received / waiting / expired): over the map while the sheet is low, in the sheet once it is open to the top.
  const renderTabs = () => (
    <View style={styles.pillTrack}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.segChip, active && styles.segChipOn]}
                onPress={() => onTabChange(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                {/* On the blue pill the icon sits on a small white disc so it still shows. */}
                <t.icon active={active} size={20} color={active ? '#ffffff' : undefined} />
                <Text style={[styles.segChipText, active && styles.segChipTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <PopCount value={t.count} style={styles.tabCount} textStyle={styles.tabCountText} ringColor="#facc15" />
                )}
              </Pressable>
            );
          })}
    </View>
  );

  // The cards / rows hamburger and the map icon (which lowers the sheet so the map shows in full): at the end of the sheet's top line while the map is in view, in the app's
  // "Bids" heading row at the top of the bar once the sheet is open to the top.
  // Open to the top, the sheet's header (Free Quote row, tab bar, filter chips) sits on the same blue as the app header above it.
  const onBlueBand = tab === 'received' && atTop;
  const iconButtons = (api: SheetApi) => (
    <>
      <Pressable
        style={[styles.mapViewBtn, rowsView && styles.mapViewBtnOn]}
        onPress={onToggleRows}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: rowsView }}
        accessibilityLabel={rowsView ? 'Show the bids as cards' : 'Show all the bids as rows'}
      >
        <Text style={[styles.sheetHamburger, onBlueBand && { color: '#ffffff' }]}>{rowsView ? '▤' : '☰'}</Text>
      </Pressable>
      {/* The close mark lowers the sheet to its strip, so the whole map shows (from the top or from the middle). */}
      <Pressable style={[styles.closeCircle, onBlueBand && { borderColor: '#ffffff' }]} onPress={api.minimize} hitSlop={6} accessibilityRole="button" accessibilityLabel="Close, lower the sheet">
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={onBlueBand ? '#ffffff' : '#2563eb'} strokeWidth={2.6} strokeLinecap="round">
          <Path d="M6 6l12 12M18 6 6 18" />
        </Svg>
      </Pressable>
    </>
  );
  const renderMapButton = (api: SheetApi) => {
    return (
      <View style={[styles.mapRow, styles.mapRowWide]}>
        {tab === 'received' && (
          <FreeQuoteTag onPress={onNewBid} />
        )}
        {tab === 'received' && iconButtons(api)}
      </View>
    );
  };
  // Under the tabs, pinned while the list scrolls: the used-garages filter (received bids).
  const renderTools = () =>
    tab === 'received' && received.some((j) => j.bids.length > 0) ? (
      <View style={[styles.receivedTools, onBlueBand && { marginTop: 16 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORTS.map((s) => (
            <Pressable key={s.id} style={[styles.sortChip, bidSort === s.id && styles.sortChipOn]} onPress={() => setBidSort(s.id)} accessibilityRole="button" accessibilityState={{ selected: bidSort === s.id }} accessibilityLabel={`Sort bids: ${s.label}`}>
              <Text style={[styles.sortText, bidSort === s.id && styles.sortTextOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {received.some((j) => j.bids.some((b) => isUsed(garageForBid(b)))) && (
        <Pressable style={[styles.usedChip, usedOnly && styles.usedChipOn]} onPress={() => setUsedOnly((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: usedOnly }} accessibilityLabel="Only garages I have used">
          <Text style={[styles.usedChipText, usedOnly && styles.usedChipTextOn]}>↻ මා කලින් භාවිතා කළ ගරාජ පමණක්</Text>
        </Pressable>
        )}
      </View>
    ) : null;

  const renderReceived = () => (
    <>
      {received.length === 0 ? (
        <EmptyState icon="📥" title="තවම ලංසු ලැබී නැත" text="ගරාජ ඔබගේ රැකියාවලට ලංසු තැබූ විට ඒවා මෙහි පෙන්වනු ඇත." />
      ) : (
        received.map((job) => {
          const shown = (job.acceptedBidId ? job.bids.filter((b) => b.id === job.acceptedBidId) : sortBids(job.bids, bidSort)).filter((b) => !usedOnly || isUsed(garageForBid(b)));
          return (
            <View key={job.id} style={styles.card}>
              {jobHeader(
                job,
                <View style={[styles.badge, job.acceptedBidId ? styles.badgeSuccess : styles.badgePrimary]}>
                  <Text style={[styles.badgeText, { color: workshops[job.id]?.progress.cancelled ? Colors.errorText : job.acceptedBidId ? Colors.success : Colors.primary }]}>
                    {job.acceptedBidId ? (workshops[job.id]?.progress.cancelled ? 'අවලංගු කළා' : 'වෙන් කළා') : `ලංසු ${job.bids.length}`}
                  </Text>
                </View>
              )}
              {!job.acceptedBidId && now < biddingEndsAt(job) && (
                <Text style={styles.hint}>⏱️ ලංසු අවසන් වීමට: {countdown(biddingEndsAt(job) - now)}</Text>
              )}
              {rowsView ? <View style={styles.bidRows}>{shown.map((bid) => renderBidRow(job, bid))}</View> : shown.map((bid) => renderBidCard(job, bid))}
              {job.acceptedBidId && job.bids.length > 1 && (
                <Text style={styles.hint}>අනෙකුත් ලංසු {job.bids.length - 1}ක් වසා දමන ලදී.</Text>
              )}
              {detailsCorner(job)}
            </View>
          );
        })
      )}
    </>
  );

  const renderWaiting = (list: RepairJob[], kind: 'pending' | 'expired') =>
    list.length === 0 ? (
      kind === 'pending' ? (
        <EmptyState icon="⏱️" title="බලාපොරොත්තුවෙන් සිටින රැකියා නැත" text="ලංසු එනතෙක් රැඳී සිටින රැකියා මෙහි පෙන්වනු ඇත." />
      ) : (
        <EmptyState icon="✅" title="කල් ඉකුත් වූ රැකියා නැත" text="ලංසු කාලය අවසන් වූ රැකියා නැවත පළ කිරීමට මෙහි පෙන්වනු ඇත." />
      )
    ) : (
      list.map((job) => {
        const left = biddingEndsAt(job) - now;
        const isPending = kind === 'pending';
        return (
          <View key={job.id} style={[styles.card, !isPending && styles.cardExpired]}>
            {jobHeader(
              job,
              <View style={[styles.badge, styles.badgeRow, isPending ? styles.badgePrimary : styles.badgeDanger]}>
                <Icon name={isPending ? 'clock' : 'alert-triangle'} size={12} color={isPending ? Colors.primary : Colors.errorText} />
                <Text style={[styles.badgeText, { color: isPending ? Colors.primary : Colors.errorText }]}>{countdown(left)}</Text>
              </View>
            )}
            {isPending && (
              <View style={styles.waitRow}>
                <View style={styles.waitDot} />
                <Text style={styles.hint}>
                  ලංසු එනතෙක් රැඳී සිටී · පළ කළේ {ago(now - job.submittedAt)}
                </Text>
              </View>
            )}
            <ActionButton
              label={isPending ? 'සාරාංශය බලන්න / සංස්කරණය' : 'නැවත පළ කරන්න'}
              icon={isPending ? '📝' : '🔁'}
              variant={isPending ? 'primary' : 'sos'}
              onPress={() => setRepub(job)}
            />
            {detailsCorner(job, () => setDeleting(job))}
          </View>
        );
      })
    );

  // Every received bid (not yet booked) as a small photo: what the minimised sheet shows.
  const allBids = received.filter((j) => !j.acceptedBidId).flatMap((j) => [...j.bids].sort((x, y) => x.price - y.price).map((bid) => ({ job: j, bid })));
  const farthest = mapBids.length ? Math.max(...mapBids.map(({ bid }) => bid.distanceKm)) : 3;
  const mapZoom = zoomToFit(farthest * 2.6, user.coords.latitude, Math.max(120, mapArea * 0.4));
  // Centre the map so the owner's dot sits in the part the sheet leaves free.
  const mapCenter = (() => {
    if (!mapArea) return user.coords;
    const zoom = mapZoom;
    const metersPerPx = (156543.03 * Math.cos((user.coords.latitude * Math.PI) / 180)) / 2 ** zoom;
    return { latitude: user.coords.latitude - (mapArea * 0.22 * metersPerPx) / 111320, longitude: user.coords.longitude };
  })();

  return (
    <View style={styles.container} onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        // While the header is folded or folding, the tab is taller by its height: that is not a new size, and re-drawing this whole screen on every frame of the fold is what made it stutter.
        if (hiddenVal.current > 0) return;
        setArea(h);
        if (hiddenVal.current === 0 || stableAreaRef.current === 0) {
          stableAreaRef.current = h;
          setStableArea(h);
        }
        if (!headerHidden.current || baseArea.current === 0) baseArea.current = h;
        // No title bar folds away on this tab any more, so the map is always exactly as tall as the tab.
        setMapArea(h);
      }}
    >
      {/* The map fills the whole tab; the sheet slides over it. */}
      {tab === 'received' && (
      <GoogleMap
        style={mapArea > 0 ? [styles.mapAnchored, { height: mapArea }] : styles.fullMap}
        center={mapCenter}
        zoom={mapZoom}
        renderOverlay={(project) => (
          <>
            {mapBids.map(({ job, bid, lowest }) => {
              const p = project(bid.coords);
              return p ? (
                <View key={bid.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="box-none">
                  <Pressable
                    style={[styles.pricePin, lowest && styles.pricePinLowest, !lowest && !marketNote(job, bid).cheaper && styles.pricePinDear, pinBid?.bid.id === bid.id && styles.pricePinOn]}
                    onPress={() => setPinBid({ job, bid })}
                    accessibilityLabel={`Bid pin ${bid.garageName}`}
                    hitSlop={8}
                  >
                    <Text style={styles.pricePinText}>{money(bid.price)}</Text>
                  </Pressable>
                </View>
              ) : null;
            })}
            {(() => {
              const me = project(user.coords);
              return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
            })()}
          </>
        )}
      />
      )}

      {/* The tab bar floats over the bottom 72px and its top corners are round: this strip, in the sheet's colour, fills what shows behind those corners. */}
      <View style={styles.navBackfill} pointerEvents="none" />

      {/* The header's blue carries on behind the tabs and ends in round corners (as on Activity), so the tab bar overlaps it. */}
      <Animated.View pointerEvents="none" style={[styles.floatBand, tab === 'received' && atTop && styles.floatBandUp, { opacity: tab === 'received' ? 1 : mapP }]} />

      <Animated.View style={[styles.floatTabs, { opacity: tab === 'received' ? 1 : mapP }]} pointerEvents={tab !== 'received' && sheetState === 'expanded' ? 'none' : 'box-none'}>
        <View style={styles.floatChips}>{renderTabs()}</View>
      </Animated.View>

      {/* My location: a round button on the map that rides the sheet's top edge (right side), so it always sits just above the sheet; it reads the GPS again and shows the owner's dot. */}
      {sheetH && (
        <Animated.View style={[styles.myLocation, { bottom: Animated.add(sheetH, NAV_HEIGHT + 12), opacity: mapP }]} pointerEvents={sheetState === 'expanded' ? 'none' : 'box-none'}>
        <Pressable
          style={styles.myLocationBtn}
          onPress={() => {
            setPinBid(null);
            user.refresh().catch(() => {});
          }}
          accessibilityLabel="My location"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round">
            <Circle cx={12} cy={12} r={3.5} fill="#2563eb" />
            <Circle cx={12} cy={12} r={7.5} />
            <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </Svg>
        </Pressable>
        </Animated.View>
      )}

      {pinBid && tab === 'received' && (
        <View style={styles.pinCard} accessibilityLabel="Bid record">
          <View style={styles.pinCardHead}>
            <View style={styles.flex1}>
              <Text style={styles.pinCardTitle} numberOfLines={1}>
                {pinBid.bid.level ? `${LEVELS.find((l) => l.id === pinBid.bid.level)?.icon} ` : ''}
                {pinBid.bid.garageName}
              </Text>
              <Text style={styles.pinCardSub} numberOfLines={1}>
                {SERVICE_CATEGORIES.find((c) => c.id === pinBid.job.categoryId)?.name ?? 'Service'} · {ago(now - pinBid.bid.submittedAt)}
              </Text>
            </View>
            <Pressable style={styles.pinCardClose} onPress={() => setPinBid(null)} accessibilityLabel="Close bid record" hitSlop={8}>
              <Text style={styles.pinCardCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.pinCardRow}>
            <MoneyText style={styles.pinCardPrice}>{money(pinBid.bid.price)}</MoneyText>
            <Text style={styles.pinCardMeta}>
              ★ {pinBid.bid.rating.toFixed(1)} ({pinBid.bid.reviews}) · km {pinBid.bid.distanceKm}
            </Text>
          </View>
          <Text style={styles.pinCardMeta}>
            🛡️ මාස {pinBid.bid.warrantyMonths} වගකීම · ⏱️ පැය {pinBid.bid.estHours}{pinBid.bid.travelFee ? ` · 🚗 ගමන් ගාස්තුව ${money(pinBid.bid.travelFee)} ඇතුළුව` : ''}
          </Text>
          <View style={styles.pinCardBtns}>
            <Pressable
              style={styles.pinCardBtn}
              onPress={() => {
                const v = pinBid;
                setPinBid(null);
                setBidView(v);
              }}
              accessibilityLabel="Open bid details"
            >
              <Text style={styles.pinCardBtnText}>සම්පූර්ණ විස්තර ›</Text>
            </Pressable>
            <Pressable style={styles.pinCardBtn} onPress={() => Linking.openURL(directionsUrl(pinBid.bid.coords, user.coords))} accessibilityLabel="Directions to the garage">
              <Text style={styles.pinCardBtnText}>🗺️ දිශාවන්</Text>
            </Pressable>
            <Pressable
              style={styles.pinCardAccept}
              onPress={() => {
                const v = pinBid;
                setPinBid(null);
                askAccept(v);
              }}
              accessibilityLabel="Accept this bid"
            >
              <Text style={styles.pinCardAcceptText}>පිළිගන්න</Text>
            </Pressable>
          </View>
        </View>
      )}

      {area > 0 && (
        <ThreeStateSheet
          locked={tab !== 'received'}
          onHeight={setSheetH}
          areaHeight={stableArea || area}
          boost={boost ?? undefined}
          canLower={() => !headerHidden.current && Date.now() - lastToggle.current > 500}
          peekHeight={PEEK_HEIGHT}
          bottomInset={NAV_HEIGHT}
          // Open to the top the Received sheet stops under the tab bar (which stays pinned where it is), not over it.
          expandedExtra={tab === 'received' ? -TABS_BLOCK_H : 0}
          // The title bar at the top folds away while the sheet is opened to the top, and the chat icon drops below the tabs; both come back as it settles lower.
          onStateChange={(st) => {
            setSheetState(st);
            if (st !== 'expanded') {
              headerHidden.current = false;
              // Reset once the sheet has settled low, so lowering it keeps the header in step with it.
              setTimeout(() => hiddenAnim.setValue(0), 700);
            }
            onHeaderVisibilityChange?.(st !== 'expanded' || tab !== 'received');
            lastScrollY.current = 0;
            applyChip(true, st === 'expanded');
            if (st !== 'expanded') headRowH.current = 0;
            syncDock();
          }}
          peek={(api) => (
            <View style={styles.peek}>
              <View style={styles.peekHead}>
                <Text style={styles.peekTitle}>
                  {allBids.length ? `ලැබුණු ලංසු ${allBids.length}` : 'තවම ලංසු ලැබී නැත'}
                </Text>
                <Pressable style={styles.pullUp} onPress={api.collapse} accessibilityLabel="Pull the sheet up">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <Polyline points="6 15 12 9 18 15" />
                  </Svg>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peekRow}>
                {allBids.map(({ job, bid }) => (
                  <Pressable key={bid.id} style={styles.peekItem} onPress={() => setBidView({ job, bid })} accessibilityLabel={`Peek ${bid.garageName}`}>
                    <View style={[styles.peekRing, bid.id === lowestBidId(job.bids) && styles.peekRingLowest]}>
                      <Image source={GARAGE_COVERS[garageForBid(bid).id]} style={styles.peekPhoto} />
                    </View>
                    <View style={styles.peekBadge}>
                      <Text style={styles.peekBadgeText}>{shortMoney(bid.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        >
          {(api) => {
            if (minimizeRef) minimizeRef.current = api.minimize;
            localMin.current = api.minimize;
            return (
            <>
      <Animated.View
        style={[styles.tabBar, tab === 'received' && atTop && styles.tabBarBlue, { paddingTop: topP.interpolate({ inputRange: [0, 1], outputRange: [2, tab === 'received' ? 2 : 14] }) }]}
        onLayout={(e) => {
          tabBarH.current = Math.round(e.nativeEvent.layout.height);
          syncDock();
        }}
      >
        {/* Waiting / expired: the header's blue carries on behind the tab bar and ends in round corners, so the tab bar overlaps it as Home's card does. */}
        {tab !== 'received' && <View pointerEvents="none" style={styles.tabBand} />}
        <Animated.View style={{ height: 0, opacity: topP, overflow: 'hidden' }} pointerEvents={sheetState === 'expanded' ? 'auto' : 'none'}>
          <View style={styles.titleRow}>
            <FreeQuoteTag onPress={onNewBid} />
            <View style={styles.flex1} />
            {tab === 'received' && iconButtons(api)}
          </View>
        </Animated.View>
        <View style={styles.segRow}>
        <Animated.View style={[styles.tabsLayer, tab === 'received' ? { opacity: 0, overflow: 'hidden', height: topP.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) } : { opacity: topP }]} pointerEvents={tab !== 'received' && sheetState === 'expanded' ? 'auto' : 'none'}>
          {renderTabs()}
        </Animated.View>
        {/* While the map is in view the free-quote tag and the two icons stand on the tab line; open to the top the bar starts with its "Bids" heading, the icons at its end. */}
        <Animated.View style={[styles.mapLayer, { opacity: mapP }]} pointerEvents={sheetState === 'expanded' ? 'none' : 'auto'}>
          {renderMapButton(api)}
        </Animated.View>
        </View>
        {renderTools()}
      </Animated.View>

              <ScrollView
                ref={api.scrollRef}
                style={styles.flex1}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                // Like Home: scrolling the sheet leaves the "＋ නව ලංසුවක්" chip and the tabs pinned at the top, and the chat icon docked right under them.
                onScroll={(e) => {
                  const y = e.nativeEvent.contentOffset.y;
                  api.onScroll(y);
                  if (sheetState === 'expanded' && tab === 'received') {
                    // Scrolling on folds the top header bar (Free Quote, ☰, ✕) away; the least scroll back brings it straight back, and the tab bar and filter chips stay pinned.
                    const dy = y - lastListY.current;
                    let hide = headerHidden.current;
                    // The list gets taller / shorter while the header folds, which can nudge the offset by itself: scrolls right after a change are not the owner's.
                    // A browser re-layout can report one impossible jump (a couple of hundred px and straight back): never the owner's scroll.
                    // The scroll that carries the sheet up to the top is not a scroll of the list: the header (Free Quote, ☰, ✕) stays until the owner scrolls the list again once the sheet has settled.
                    const settling = Date.now() - lastToggle.current < 450 || Math.abs(dy) > 200 || !atTopRef.current || Date.now() - arrivedAt.current < 800;
                    if (!settling) {
                      // Showing again takes a real scroll back (not a wheel's jitter): the header would otherwise flicker in and out.
                      if (y <= 8 || dy < -14) hide = false;
                      else if (dy > 6 && y > 24) hide = true;
                    }
                    if (hide !== headerHidden.current) {
                      lastToggle.current = Date.now();
                      headerHidden.current = hide;
                      Animated.timing(hiddenAnim, { toValue: hide ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
                    }
                  }
                  lastListY.current = y;
                }}
              >
                {tab === 'received' && renderReceived()}
                {tab === 'pending' && renderWaiting(pending, 'pending')}
                {tab === 'expired' && renderWaiting(expired, 'expired')}
              </ScrollView>
            </>
            );
          }}
        </ThreeStateSheet>
      )}

      <OwnerDetailView
        target={detailJob ? { kind: 'job', job: detailJob } : null}
        onClose={() => setDetailId(null)}
        onAcceptBid={(job, bid) => askAccept({ job, bid })}
        onRepublish={(job) => setRepub(job)}
      />
      {renderRepublish()}
      <GarageReviewsSheet
        garage={bidView ? garageForBid(bidView.bid) : null}
        bid={bidView?.bid}
        onClose={() => setBidView(null)}
        onAccept={
          bidView && !bidView.job.acceptedBidId
            ? () => {
                const v = bidView;
                setBidView(null);
                askAccept(v);
              }
            : undefined
        }
      />

      {deleting && (
        <ModalCard icon="🗑️" tone="danger" title="මෙම රැකියාව මකන්නද?" body="ලංසු ඉල්ලීම ඉවත් වේ. මෙය ආපසු ගත නොහැක.">
          <ActionButton label="අවලංගු" variant="ghost" compact onPress={() => setDeleting(null)} />
          <ActionButton
            label="මකන්න"
            variant="sos"
            compact
            onPress={() => {
              removeJob(deleting.id);
              setDeleting(null);
            }}
          />
        </ModalCard>
      )}

      {confirming && (
        <ModalCard
          icon="🤝"
          tone="primary"
          title="ලංසුව පිළිගන්නද?"
          body={`${confirming.bid.garageName} — ${money(confirming.bid.price)}. මාස ${confirming.bid.warrantyMonths} වගකීමක් සහිතව ඔබගේ වෙන් කිරීම තහවුරු කෙරේ.`}
        >
          <ActionButton label="අවලංගු" variant="ghost" compact onPress={() => setConfirming(null)} />
          <ActionButton
            label="පිළිගන්න"
            variant="success"
            compact
            onPress={() => {
              acceptBid(confirming.job.id, confirming.bid.id);
              setBooked(confirming);
              setConfirming(null);
            }}
          />
        </ModalCard>
      )}

      {booked && (
        <ModalCard
          icon="✅"
          tone="success"
          title="වෙන් කිරීම තහවුරුයි!"
          onClose={() => setBooked(null)}
          body={`${booked.bid.garageName} ඔබව ඉක්මනින් සම්බන්ධ කර ගනු ඇත. එකඟ වූ මිල: ${money(booked.bid.price)}.`}
        >
          <ActionButton
            label="දිශාවන්"
            icon="🗺️"
            variant="ghost"
            compact
            onPress={() => Linking.openURL(directionsUrl(booked.bid.coords, user.coords))}
          />
          <ActionButton
            label="ක්‍රියාකාරකම්"
            icon="⏱️"
            variant="success"
            compact
            onPress={() => {
              setBooked(null);
              onViewActivity();
            }}
          />
        </ModalCard>
      )}
    </View>
  );
};

type BidSort = 'price' | 'rating' | 'near' | 'fast';
const SORTS: { id: BidSort; label: string }[] = [
  { id: 'price', label: '💰 අඩුම මිල' },
  { id: 'rating', label: '★ ඉහළම ශ්‍රේණිය' },
  { id: 'near', label: '📍 ළඟම' },
  { id: 'fast', label: '⏱️ වේගවත්ම' },
];
/** The bids of a job in the order the owner chose; the price breaks every tie. */
const sortBids = (bids: Bid[], by: BidSort) =>
  [...bids].sort((a, b) => {
    const k = by === 'rating' ? b.rating - a.rating : by === 'near' ? a.distanceKm - b.distanceKm : by === 'fast' ? a.estHours - b.estHours : 0;
    return k || a.price - b.price;
  });
/** How a bid stands against the usual price of the job's service (a far garage's travel fee is left out). */
const marketNote = (job: RepairJob, bid: Bid) => {
  const base = marketPrice(job.categoryId);
  const pct = Math.round(((bidWork(bid) - base) / base) * 100);
  if (Math.abs(pct) < 3) return { cheaper: true, text: '≈ සාමාන්‍ය වෙළඳපොළ මිල', short: '≈ වෙළඳපොළ මිල' };
  return pct < 0 ? { cheaper: true, text: `📉 වෙළඳපොළ මිලට වඩා ${-pct}% අඩුයි`, short: `${-pct}% අඩු` } : { cheaper: false, text: `📈 වෙළඳපොළ මිලට වඩා ${pct}% වැඩියි`, short: `${pct}% වැඩි` };
};

/** The "Free Quote" tag, in the look of Home's Free Quote card: a pale blue pill with a blue round plus, the label, and the yellow "නොමිලේ" tag. */
export const FreeQuoteTag: React.FC<{ onPress?: () => void }> = ({ onPress }) => (
  <Pressable style={styles.freeQuote} onPress={onPress} accessibilityLabel="Post a job and get free quotes">
    <View style={styles.freeQuotePlus}>
      <Text style={styles.freeQuotePlusText}>+</Text>
    </View>
    <View style={styles.freeQuoteFree}>
      <Text style={styles.freeQuoteFreeText}>Free</Text>
    </View>
    <Text style={styles.freeQuoteText}>Quote</Text>
  </Pressable>
);

const styles = themedStyles(() => StyleSheet.create({
  // Transparent: the rounded sheet in App.tsx supplies the background.
  container: { flex: 1 },
  flex1: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  // Same "add" button as the garage app's Parts tab.
  detailsLink: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 },
  myLocation: { position: 'absolute', right: 14, zIndex: 6 },
  myLocationBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  navBackfill: { position: 'absolute', left: 0, right: 0, bottom: 0, height: NAV_HEIGHT, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
  floatNewBid: { position: 'absolute', top: 12, left: 12, zIndex: 0, paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  floatNewBidText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb' },
  newBidChip: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#bfdbfe' },
  newBidText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb' },
  sheetHamburger: { fontSize: 20, lineHeight: 22, color: '#2563eb' },
  sheetHeadTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  minBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.45)' },
  // One white surface with a thin outline and a light elevation; the selected tab has a line under it (Material primary tabs).
  // The three views (received, waiting, expired) are three separate chips, like the garage app's: each its own outlined chip, the selected one tonal blue.
  // Open to the top, the pinned tab bar and the filter chips sit on the header's blue.
  tabBarBlue: { backgroundColor: pageHeaderBlue().from },
  tabBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 44, backgroundColor: pageHeaderBlue().from, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  tabBar: { paddingHorizontal: 6, paddingTop: 2, paddingBottom: 8 },
  tabsLayer: { flex: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  mapLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' },
  // Opened to the top, the grip is gone, so the chips get some room above them.
  tabBarTop: { paddingTop: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 6 },
  sheetTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
  mapRowWide: { flex: 1 },
  freeQuote: { marginRight: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 3, paddingRight: 5, height: 30, borderRadius: 15, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: 'rgba(219, 234, 254, 0.8)' },
  freeQuoteText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: '#000000' },
  freeQuoteFree: { backgroundColor: '#facc15', height: 20, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  freeQuoteFreeText: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  freeQuotePlus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  freeQuotePlusText: { fontSize: 16, lineHeight: 18, fontWeight: '700', color: '#2563eb', includeFontPadding: false },
  segRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  // Open to the top the blue behind the tab bar runs down to the sheet, whose own blue bar carries on from it.
  floatBandUp: { height: TABS_BLOCK_H + 8, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  floatBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 44, backgroundColor: pageHeaderBlue().from, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, zIndex: 1 },
  floatTabs: { position: 'absolute', top: 14, left: 12, right: 12, zIndex: 2, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  floatTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
  floatChips: { flexDirection: 'row', gap: 6 },
  // The same bar as Activity's: one white round card with the open tab as a blue pill, the count a small yellow chip.
  pillTrack: { flex: 1, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 26, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.26, shadowRadius: 20, elevation: 8 },
  segChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, paddingHorizontal: 6, borderRadius: 22 },
  segChipOn: { backgroundColor: '#2563eb' },
  segChipText: { flexShrink: 1, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  segChipTextOn: { color: '#ffffff', fontFamily: FONTS.bodyBold },
  // The count is a soft blue pill (like a small info chip) on the corner, so the label row never wraps on narrow tabs.
  // The count is a blue round tag on the chip's top right edge (a white ring round it), not inside the chip.
  tabCount: { position: 'absolute', top: 1, right: 5, minWidth: 15, height: 15, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#facc15' },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapViewBtnOn: {},
  mapViewBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeCircle: { marginLeft: 12, marginRight: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2563eb' },
  receivedTools: { gap: 8, marginTop: 28 },
  viewToggle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  viewToggleOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#bfdbfe' },
  bidRows: { gap: 8 },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  bidRowLowest: { borderColor: Colors.success },
  bidRowAccepted: { borderColor: Colors.success, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.1)' : '#e6f4ea' },
  bidRowName: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
  bidRowSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  bidRowPrice: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  bidRowDone: { fontSize: 16, color: Colors.successText },
  bidRowAccept: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: '#2563eb' },
  bidRowAcceptLowest: { backgroundColor: '#188038' },
  bidRowAcceptText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
  sortRow: { gap: 10, paddingRight: 16 },
  // The sort chips sit on the header's blue: blue chips with a yellow edge; the open one is a deeper blue with a thicker edge.
  sortChip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 17, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#2563eb' },
  sortChipOn: { backgroundColor: '#1d4ed8', borderWidth: 2.5 },
  sortText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
  sortTextOn: { color: '#facc15', fontFamily: FONTS.bodyBold },
  marketNote: { fontSize: 12, fontFamily: FONTS.bodySemiBold },
  marketCheaper: { color: Colors.successText },
  marketDearer: { color: Colors.warning },
  usedChip: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  usedChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#bfdbfe' },
  usedChipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  usedChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb' },
  tabCountText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#111827' },
  tabCountTextActive: {},
  body: { paddingHorizontal: 4, paddingTop: 4, gap: 12, paddingBottom: 24 },
  fullMap: { ...StyleSheet.absoluteFill },
  // Fixed height, stuck to the bottom of the tab: it does not move when the tab grows upward as the band folds away.
  mapAnchored: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  peek: { paddingHorizontal: 6, gap: 10 },
  peekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pullUp: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff' },
  peekTitle: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  peekRow: { gap: 14, paddingRight: 8, paddingTop: 2 },
  peekItem: { width: 62, height: 62 },
  peekRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: Colors.borderColor, padding: 2 },
  peekRingLowest: { borderColor: Colors.success },
  peekPhoto: { width: '100%', height: '100%', borderRadius: 26 },
  peekBadge: { position: 'absolute', right: -2, bottom: -2, minWidth: 26, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  peekBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },
  hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  // Soft shadow instead of an outline (an outline only on dark, where a shadow would not show), like the Home garage tiles.
  // The same look as the Activity cards: a roomy white card, big round corners, no hard outline, a soft wide shadow.
  card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 2, gap: 12, ...cardGlow(), elevation: 3 },
  detailsCorner: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 16 },
  deleteLink: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  cardExpired: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  travelNote: { marginTop: 6, gap: 2, padding: 8, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.14)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)' },
  travelNoteTitle: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
  travelNoteText: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 15 },
  cardSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2, marginTop: 3 },
  metaItem: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  desc: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: 4 },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePrimary: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
  badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
  // Photo tile: the garage's cover with the price on it, then name and one line of details.
  bidCard: { borderRadius: 20, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : 'transparent', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.3, shadowRadius: 22, elevation: 12 },
  bidCardLowest: { borderColor: 'rgba(16, 185, 129, 0.55)' },
  bidCardAccepted: { borderColor: Colors.success },
  bidCover: { width: '100%', height: 48 },
  bidBody: { padding: 12, gap: 6 },
  fbHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 8 },
  fbName: { fontSize: 15, lineHeight: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
  fbNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fbNameText: { flexShrink: 1 },
  fbBadge: { fontSize: 13 },
  fbSubLine: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, paddingLeft: 16, paddingRight: 16, paddingBottom: 8, marginTop: -2 },
  fbSub: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 0 },
  fbMore: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fbContent: { paddingLeft: 16, paddingRight: 16, paddingBottom: 10, gap: 6 },
  fbPrice: { marginVertical: 6, fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.success },
  fbText: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 22 },
  fbRating: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyMedium, color: Colors.textMain, marginTop: 1 },
  fbCounts: { flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 16, paddingRight: 16, paddingVertical: 8 },
  fbStars: { color: '#f5a623', letterSpacing: 1 },
  fbCountText: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  fbActions: { flexDirection: 'row', marginHorizontal: 8, marginBottom: 4, paddingVertical: 2, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e4e6eb' },
  fbAction: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  fbActionText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  fbActionPrimary: { color: '#2563eb' },
  fbActionAccept: { backgroundColor: '#dbeafe', borderRadius: 20 },
  fbActionDone: { backgroundColor: '#fde68a', borderRadius: 20 },
  fbActionLowest: { backgroundColor: '#bbf7d0' },
  fbActionLowestText: { color: '#15803d' },
  repubBtns: { gap: 8 },
  repubCard: { borderRadius: 14, backgroundColor: Colors.subtleFill, padding: 12, gap: 10 },
  repubRow: { flexDirection: 'row', gap: 10 },
  repubKey: { width: 104, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  repubVal: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  repubSection: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
  repubDesc: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 21, padding: 4 },
  bidAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.subtleFill },
  bidTap: { gap: 6 },
  lowestInline: { alignSelf: 'flex-start', fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#047857' },
  bidAction: { padding: 12, paddingTop: 8 },
  deleteBtn: { position: 'absolute', top: 9, right: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.92)' },
  pricePill: { position: 'absolute', top: 10, right: 48, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  pricePillFlush: { right: 10 },
  priceText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
  lowestTag: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  lowestTagText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#047857' },
  star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  pricePin: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#1e40af', borderWidth: 1.5, borderColor: '#fff' },
  pricePinOn: { backgroundColor: '#7c3aed', transform: [{ scale: 1.15 }] },
  pricePinDear: { backgroundColor: '#d97706' },
  pinCardBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pinCardAccept: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: '#2563eb' },
  pinCardAcceptText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  pinCard: { position: 'absolute', zIndex: 20, top: 110, left: 12, right: 12, gap: 6, padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d3d9e2', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  pinCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinCardTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  pinCardSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  pinCardClose: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
  pinCardCloseText: { fontSize: 12, color: Colors.textMuted, fontFamily: FONTS.bodyBold },
  pinCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinCardPrice: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.success },
  pinCardMeta: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  pinCardBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.18)' : '#e3ecfd' },
  pinCardBtnText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb' },
  pricePinLowest: { backgroundColor: Colors.success },
  pricePinText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  meDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
}));
