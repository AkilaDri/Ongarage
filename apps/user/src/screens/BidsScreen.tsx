import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { Colors, LevelBadge, getThemeMode, themedStyles, LEVELS } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { Icon, type IconName } from '@ongarage/shared';
import { GoogleMap, zoomToFit } from '@ongarage/shared';
import { ActionButton, EmptyState, GlassIcon, ModalCard, SwipeCard } from '@ongarage/shared';
import { OwnerDetailView } from '../components/OwnerDetailView';
import { GarageReviewsSheet, garageForBid } from '../components/GarageReviewsSheet';
import { ThreeStateSheet } from '../components/ThreeStateSheet';
import { GARAGE_COVERS } from '../constants/home';
import { CategoryPhoto } from '../components/home/CategoryPhoto';
import { money } from '../utils/format';
import { biddingEndsAt, isExpired, lowestBidId, useBids } from '../context/BidsContext';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl } from '@ongarage/shared';
import type { Bid, JobDraft, RepairJob } from '@ongarage/shared';

export type BidsTab = 'received' | 'pending' | 'expired';

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
  onTabChange: (tab: BidsTab) => void;
  onRepublish: (draft: JobDraft) => void;
  onViewActivity: () => void;
}

/** Minimised sheet: a handle and one row of round photos. */
const PEEK_HEIGHT = 128;
/** The floating tab bar the sheet must clear. */
const NAV_HEIGHT = 72;
/** 3,700 → "3.7k": a price short enough for a small badge. */
const shortMoney = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

export const BidsScreen: React.FC<BidsScreenProps> = ({ tab, onTabChange, onRepublish, onViewActivity }) => {
  const { jobs, acceptBid } = useBids();
  const { findVehicle } = useVehicles();
  const user = useUserLocation();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // One garage's bid, opened by tapping or swiping it inside the job card.
  // Height of the tab (the map and the sheet's expanded height).
  const [area, setArea] = useState(0);
  const [bidView, setBidView] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const [booked, setBooked] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // Swipe (or tap the header of) a job card for everything about it.
  const [detailId, setDetailId] = useState<string | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const detailJob = jobs.find((j) => j.id === detailId) ?? null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const received = jobs.filter((j) => j.bids.length > 0);
  const pending = jobs.filter((j) => j.bids.length === 0 && !isExpired(j, now));
  const expired = jobs.filter((j) => isExpired(j, now));
  const mapBids = received.filter((j) => !j.acceptedBidId).flatMap((j) => j.bids.map((b) => ({ bid: b, lowest: b.id === lowestBidId(j.bids) })));

  const tabs: { id: BidsTab; label: string; icon: IconName; count: number }[] = [
    { id: 'received', label: 'ලැබුණු', icon: 'check-circle', count: received.length },
    { id: 'pending', label: 'රැඳී ඇති', icon: 'clock', count: pending.length },
    { id: 'expired', label: 'කල් ඉකුත්', icon: 'alert-triangle', count: expired.length },
  ];

  const jobHeader = (job: RepairJob, badge: React.ReactNode) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
    const vehicle = findVehicle(job.vehicleId);
    const media = [job.photos?.length && `📷 ${job.photos.length}`, job.voiceNotes?.length && `🎙️ ${job.voiceNotes.length}`].filter(Boolean).join('  ');
    return (
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
            {vehicle ? `${vehicle.name} · ${vehicle.plate}` : ''}
            {media ? `  ·  ${media}` : ''}
          </Text>
          <Text style={styles.detailsLink}>විස්තර ›</Text>
        </View>
        {badge}
      </Pressable>
    );
  };

  const draftFor = (job: RepairJob): JobDraft => ({
    categoryId: job.categoryId,
    description: job.description,
    vehicleId: job.vehicleId,
    replacesJobId: job.id,
  });

  const renderBidCard = (job: RepairJob, bid: Bid) => {
    const isLowest = bid.id === lowestBidId(job.bids);
    const isAccepted = job.acceptedBidId === bid.id;
    const garage = garageForBid(bid);
    return (
      <SwipeCard key={bid.id} style={[styles.bidCard, isLowest && !job.acceptedBidId && styles.bidCardLowest, isAccepted && styles.bidCardAccepted]} onOpen={() => setBidView({ job, bid })}>
        <Pressable onPress={() => setBidView({ job, bid })} accessibilityLabel={`${bid.garageName} bid details`}>
          <Image source={GARAGE_COVERS[garage.id]} style={styles.bidCover} resizeMode="cover" />
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{money(bid.price)}</Text>
          </View>
          {isLowest && !job.acceptedBidId && (
            <View style={styles.lowestTag}>
              <Text style={styles.lowestTagText}>💰 අඩුම ලංසුව</Text>
            </View>
          )}
          <View style={styles.bidBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {bid.level ? `${LEVELS.find((l) => l.id === bid.level)?.icon} ` : ''}
              {bid.garageName}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              <Text style={styles.star}>★ {bid.rating.toFixed(1)}</Text> ({bid.reviews}) • කි.මී. {bid.distanceKm} • මාස {bid.warrantyMonths} වගකීම • පැය {bid.estHours}
            </Text>
          </View>
        </Pressable>
        <View style={styles.bidAction}>
          {isAccepted ? (
            <View style={styles.rowBetween}>
              <Text style={[styles.cardSub, { color: Colors.successText }]}>✓ වෙන් කිරීම තහවුරුයි</Text>
              <Pressable onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))}>
                <Text style={styles.link}>🗺️ දිශාවන්</Text>
              </Pressable>
            </View>
          ) : (
            <ActionButton label={isLowest ? 'අඩුම ලංසුව පිළිගන්න' : 'ලංසුව පිළිගන්න'} variant={isLowest ? 'success' : 'primary'} compact onPress={() => setConfirming({ job, bid })} />
          )}
        </View>
      </SwipeCard>
    );
  };

  const renderReceived = () => (
    <>
      {received.length === 0 ? (
        <EmptyState icon="📥" title="තවම ලංසු ලැබී නැත" text="ගරාජ ඔබගේ රැකියාවලට ලංසු තැබූ විට ඒවා මෙහි පෙන්වනු ඇත." />
      ) : (
        received.map((job) => {
          const shown = job.acceptedBidId ? job.bids.filter((b) => b.id === job.acceptedBidId) : [...job.bids].sort((a, b) => a.price - b.price);
          return (
            <View key={job.id} style={styles.card}>
              {jobHeader(
                job,
                <View style={[styles.badge, job.acceptedBidId ? styles.badgeSuccess : styles.badgePrimary]}>
                  <Text style={[styles.badgeText, { color: job.acceptedBidId ? Colors.success : Colors.primary }]}>
                    {job.acceptedBidId ? 'වෙන් කළා' : `ලංසු ${job.bids.length}`}
                  </Text>
                </View>
              )}
              {!job.acceptedBidId && now < biddingEndsAt(job) && (
                <Text style={styles.hint}>⏱️ ලංසු අවසන් වීමට: {countdown(biddingEndsAt(job) - now)}</Text>
              )}
              {shown.map((bid) => renderBidCard(job, bid))}
              {job.acceptedBidId && job.bids.length > 1 && (
                <Text style={styles.hint}>අනෙකුත් ලංසු {job.bids.length - 1}ක් වසා දමන ලදී.</Text>
              )}
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
              onPress={() => onRepublish(draftFor(job))}
            />
          </View>
        );
      })
    );

  // Every received bid (not yet booked) as a small photo: what the minimised sheet shows.
  const allBids = received.filter((j) => !j.acceptedBidId).flatMap((j) => [...j.bids].sort((x, y) => x.price - y.price).map((bid) => ({ job: j, bid })));
  const farthest = mapBids.length ? Math.max(...mapBids.map(({ bid }) => bid.distanceKm)) : 3;
  const mapZoom = zoomToFit(farthest * 2.6, user.coords.latitude, Math.max(120, area * 0.4));
  // Centre the map so the owner's dot sits in the part the sheet leaves free.
  const mapCenter = (() => {
    if (!area) return user.coords;
    const zoom = mapZoom;
    const metersPerPx = (156543.03 * Math.cos((user.coords.latitude * Math.PI) / 180)) / 2 ** zoom;
    return { latitude: user.coords.latitude - (area * 0.22 * metersPerPx) / 111320, longitude: user.coords.longitude };
  })();

  return (
    <View style={styles.container} onLayout={(e) => setArea(Math.round(e.nativeEvent.layout.height))}>
      {/* The map fills the whole tab; the sheet slides over it. */}
      <GoogleMap
        style={styles.fullMap}
        center={mapCenter}
        zoom={mapZoom}
        renderOverlay={(project) => (
          <>
            {mapBids.map(({ bid, lowest }) => {
              const p = project(bid.coords);
              return p ? (
                <View key={bid.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="none">
                  <View style={[styles.pricePin, lowest && styles.pricePinLowest]}>
                    <Text style={styles.pricePinText}>{money(bid.price)}</Text>
                  </View>
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

      {area > 0 && (
        <ThreeStateSheet
          areaHeight={area}
          peekHeight={PEEK_HEIGHT}
          bottomInset={NAV_HEIGHT}
          peek={
            <View style={styles.peek}>
              <Text style={styles.peekTitle}>
                {allBids.length ? `ලැබුණු ලංසු ${allBids.length}` : 'තවම ලංසු ලැබී නැත'}
              </Text>
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
          }
        >
          {(api) => (
            <>
      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => onTabChange(t.id)}>
              <Icon name={t.icon} size={15} color={active ? '#ffffff' : Colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

              <ScrollView
                ref={api.scrollRef}
                style={styles.flex1}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => api.onScroll(e.nativeEvent.contentOffset.y)}
              >
                {tab === 'received' && allBids.length > 0 && <Text style={styles.swipeHint}>ලංසුවක සම්පූර්ණ විස්තර සඳහා ගරාජ කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>}
                {tab === 'received' && renderReceived()}
                {tab === 'pending' && renderWaiting(pending, 'pending')}
                {tab === 'expired' && renderWaiting(expired, 'expired')}
              </ScrollView>
            </>
          )}
        </ThreeStateSheet>
      )}

      <OwnerDetailView
        target={detailJob ? { kind: 'job', job: detailJob } : null}
        onClose={() => setDetailId(null)}
        onAcceptBid={(job, bid) => setConfirming({ job, bid })}
        onRepublish={(job) => onRepublish(draftFor(job))}
      />
      <GarageReviewsSheet
        garage={bidView ? garageForBid(bidView.bid) : null}
        bid={bidView?.bid}
        onClose={() => setBidView(null)}
        onAccept={
          bidView && !bidView.job.acceptedBidId
            ? () => {
                const v = bidView;
                setBidView(null);
                setConfirming(v);
              }
            : undefined
        }
      />

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

const styles = themedStyles(() => StyleSheet.create({
  // Transparent: the rounded sheet in App.tsx supplies the background.
  container: { flex: 1 },
  flex1: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  // Same "add" button as the garage app's Parts tab.
  swipeHint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  detailsLink: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary, marginTop: 4 },
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: Colors.subtleFill,
  },
  tabActive: { backgroundColor: '#162b63', shadowColor: '#162b63', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  tabText: { flexShrink: 1, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  tabTextActive: { color: '#ffffff' },
  // Corner badge keeps the label row from wrapping on narrow tabs.
  tabCount: {
    position: 'absolute',
    top: -7,
    right: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.bgBody,
    backgroundColor: Colors.bgCardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: { backgroundColor: '#4ca1d1' },
  tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
  tabCountTextActive: { color: '#fff' },
  body: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  fullMap: { ...StyleSheet.absoluteFill },
  peek: { paddingHorizontal: 16, gap: 10 },
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
  card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 20, padding: 14, gap: 10, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 },
  cardExpired: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  desc: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: 4 },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePrimary: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
  badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
  // Photo tile: the garage's cover with the price on it, then name and one line of details.
  bidCard: { borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, overflow: 'hidden' },
  bidCardLowest: { borderColor: 'rgba(16, 185, 129, 0.55)' },
  bidCardAccepted: { borderColor: Colors.success },
  bidCover: { width: '100%', height: 120 },
  bidBody: { paddingHorizontal: 12, paddingTop: 10, gap: 3 },
  bidAction: { padding: 12, paddingTop: 8 },
  pricePill: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  priceText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
  lowestTag: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  lowestTagText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#047857' },
  star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  pricePin: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#1e40af', borderWidth: 1.5, borderColor: '#fff' },
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
