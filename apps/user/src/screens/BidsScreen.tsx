import { LkPlate, bidWork } from '@ongarage/shared';
import { elevation1, outline } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
import { chatDockOffset } from '../utils/chatDock';
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
import { useWorkshops } from '../context/WorkshopContext';
import { usePayStanding } from '../context/PayStanding';
import { directionsUrl } from '@ongarage/shared';
import type { Bid, JobDraft, RepairJob } from '@ongarage/shared';

export type BidsTab = 'received' | 'pending' | 'expired';

// The tab bar's look: Material primary tabs on one white surface; the chosen tab is Google-blue with a line under it.
const TAB_BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');
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
  onTabChange: (tab: BidsTab) => void;
  onRepublish: (draft: JobDraft) => void;
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
/** 3,700 → "3.7k": a price short enough for a small badge. */
const shortMoney = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

export const BidsScreen: React.FC<BidsScreenProps> = ({ tab, onTabChange, onRepublish, onPayFirst, onViewActivity, onHeaderVisibilityChange }) => {
  const { jobs, acceptBid, removeBid } = useBids();
  const { workshops } = useWorkshops();
  const { findVehicle } = useVehicles();
  const user = useUserLocation();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const standing = usePayStanding();
  const askAccept = (v: { job: RepairJob; bid: Bid }) => (standing.limited ? onPayFirst() : setConfirming(v));
  // One garage's bid, opened by tapping or swiping it inside the job card.
  // Height of the tab (the map and the sheet's expanded height).
  const [area, setArea] = useState(0);
  // The map keeps the height the tab has with the top band showing (the smallest it ever measures) and stays anchored to the
  // bottom: when the band folds away and the tab grows upward, the map does not move or re-centre; only the sheet rises over it.
  const [mapArea, setMapArea] = useState(0);
  const [bidView, setBidView] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const [booked, setBooked] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // The bid whose pin on the map was touched: shown as a small record card over the map.
  const [pinBid, setPinBid] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // Swipe (or tap the header of) a job card for everything about it.
  const [detailId, setDetailId] = useState<string | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  // The chat icon sits under the pinned tab bar once the title band has folded away.
  const tabBarH = useRef(0);
  useEffect(() => {
    chatDockOffset.setValue(tabBarH.current);
    return () => chatDockOffset.setValue(0);
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

  const tabs: { id: BidsTab; label: string; icon: IconName; count: number }[] = [
    { id: 'received', label: 'ලැබුණු', icon: 'check-circle', count: received.length },
    { id: 'pending', label: 'රැඳී ඇති', icon: 'clock', count: pending.length },
    { id: 'expired', label: 'කල් ඉකුත්', icon: 'alert-triangle', count: expired.length },
  ];

  /** The details link sits in the card's bottom right corner. */
  const detailsCorner = (job: RepairJob) => (
    <Pressable style={styles.detailsCorner} onPress={() => setDetailId(job.id)} hitSlop={8} accessibilityLabel="Job details">
      <Text style={styles.detailsLink}>විස්තර ›</Text>
    </Pressable>
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
    const isLowest = bid.id === lowestBidId(job.bids);
    const isAccepted = job.acceptedBidId === bid.id;
    const garage = garageForBid(bid);
    return (
      <SwipeCard key={bid.id} style={[styles.bidCard, isLowest && !job.acceptedBidId && styles.bidCardLowest, isAccepted && styles.bidCardAccepted]} onOpen={() => setBidView({ job, bid })}>
        <Pressable onPress={() => setBidView({ job, bid })} accessibilityLabel={`${bid.garageName} bid details`}>
          <Image source={GARAGE_COVERS[garage.id]} style={styles.bidCover} resizeMode="cover" />
          {!isAccepted && (
            <Pressable style={styles.deleteBtn} onPress={() => removeBidAndPin(job.id, bid.id)} hitSlop={8} accessibilityLabel={`Delete bid from ${bid.garageName}`}><Icon name="trash" size={15} color="#ffffff" /></Pressable>
          )}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{bid.travelFee ? '🚗 ' : ''}{money(bid.price)}</Text>
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
            {!!bid.travelFee && (
              <View style={styles.travelNote} accessibilityLabel="Bid includes travel fee">
                <Text style={styles.travelNoteTitle}>🚗 දුර ගමන් ගාස්තුව ඇතුළු ලංසුවකි</Text>
                <Text style={styles.travelNoteText}>
                  ගරාජය ඔබෙන් කි.මී. {bid.distanceKm} ක් ඈතයි · රැකියාව {money(bidWork(bid))} + ගමන් වන්දිය {money(bid.travelFee)}
                </Text>
              </View>
            )}
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
            <ActionButton label={isLowest ? 'අඩුම ලංසුව පිළිගන්න' : 'ලංසුව පිළිගන්න'} variant={isLowest ? 'success' : 'primary'} compact onPress={() => askAccept({ job, bid })} />
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
                  <Text style={[styles.badgeText, { color: workshops[job.id]?.progress.cancelled ? Colors.errorText : job.acceptedBidId ? Colors.success : Colors.primary }]}>
                    {job.acceptedBidId ? (workshops[job.id]?.progress.cancelled ? 'අවලංගු කළා' : 'වෙන් කළා') : `ලංසු ${job.bids.length}`}
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
              onPress={() => onRepublish(draftFor(job))}
            />
            {detailsCorner(job)}
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
        setArea(h);
        setMapArea((m) => (m === 0 ? h : Math.min(m, h)));
      }}
    >
      {/* The map fills the whole tab; the sheet slides over it. */}
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
                    style={[styles.pricePin, lowest && styles.pricePinLowest, pinBid?.bid.id === bid.id && styles.pricePinOn]}
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

      {pinBid && (
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
            <Text style={styles.pinCardPrice}>{money(pinBid.bid.price)}</Text>
            <Text style={styles.pinCardMeta}>
              ★ {pinBid.bid.rating.toFixed(1)} ({pinBid.bid.reviews}) · කි.මී. {pinBid.bid.distanceKm}
            </Text>
          </View>
          <Text style={styles.pinCardMeta}>
            🛡️ මාස {pinBid.bid.warrantyMonths} වගකීම · ⏱️ පැය {pinBid.bid.estHours}{pinBid.bid.travelFee ? ` · 🚗 ගමන් ගාස්තුව ${money(pinBid.bid.travelFee)} ඇතුළුව` : ''}
          </Text>
          <Pressable
            style={styles.pinCardBtn}
            onPress={() => {
              const v = pinBid;
              setPinBid(null);
              setBidView(v);
            }}
            accessibilityLabel="Open bid details"
          >
            <Text style={styles.pinCardBtnText}>සම්පූර්ණ විස්තර බලන්න ›</Text>
          </Pressable>
        </View>
      )}

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
      {/* Opened to the top the grip is gone, so a button in its place brings the sheet back down - like the service sheet's minimise button. */}
      {api.state === 'expanded' && (
        <View style={styles.sheetHead}>
          <Text style={styles.sheetHeadTitle}>{allBids.length ? `ලැබුණු ලංසු ${allBids.length}` : 'ලංසු'}</Text>
          <Pressable style={styles.minBtn} onPress={api.collapse} hitSlop={8} accessibilityLabel="Minimize">
            <Icon name="chevron-down" size={16} strokeWidth={2.5} color={Colors.primary} />
          </Pressable>
        </View>
      )}
      <View
        style={styles.tabBar}
        onLayout={(e) => {
          tabBarH.current = Math.round(e.nativeEvent.layout.height);
          chatDockOffset.setValue(tabBarH.current);
        }}
      >
        <View style={styles.segRow}>
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
              <Icon name={t.icon} size={16} color={active ? TAB_BLUE() : Colors.textMuted} />
              <Text style={[styles.segChipText, active && styles.segChipTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={styles.tabCountText}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        </View>
      </View>

              <ScrollView
                ref={api.scrollRef}
                style={styles.flex1}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => api.onScroll(e.nativeEvent.contentOffset.y)}
              >
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
        onAcceptBid={(job, bid) => askAccept({ job, bid })}
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
                askAccept(v);
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
  detailsLink: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 },
  sheetHeadTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  minBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.45)' },
  // One white surface with a thin outline and a light elevation; the selected tab has a line under it (Material primary tabs).
  // The three views (received, waiting, expired) are three separate chips, like the garage app's: each its own outlined chip, the selected one tonal blue.
  tabBar: { paddingHorizontal: 6, paddingTop: 12, paddingBottom: 6 },
  segRow: { flexDirection: 'row', gap: 8 },
  segChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 44, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, ...elevation1() },
  segChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  segChipText: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  segChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  // The count is a soft blue pill (like a small info chip) on the corner, so the label row never wraps on narrow tabs.
  tabCount: { marginLeft: 'auto', minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.24)' : '#d2e3fc' },
  tabCountActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.4)' : '#aecbfa' },
  tabCountText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  tabCountTextActive: {},
  body: { paddingHorizontal: 6, paddingTop: 4, gap: 12, paddingBottom: 24 },
  fullMap: { ...StyleSheet.absoluteFill },
  // Fixed height, stuck to the bottom of the tab: it does not move when the tab grows upward as the band folds away.
  mapAnchored: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  peek: { paddingHorizontal: 6, gap: 10 },
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
  card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 24, padding: 14, gap: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  detailsCorner: { alignSelf: 'flex-end' },
  cardExpired: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  travelNote: { marginTop: 6, gap: 2, padding: 8, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.14)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)' },
  travelNoteTitle: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
  travelNoteText: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 15 },
  cardSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  desc: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: 4 },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePrimary: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
  badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
  // Photo tile: the garage's cover with the price on it, then name and one line of details.
  bidCard: { borderRadius: 20, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard, overflow: 'hidden' },
  bidCardLowest: { borderColor: 'rgba(16, 185, 129, 0.55)' },
  bidCardAccepted: { borderColor: Colors.success },
  bidCover: { width: '100%', height: 120 },
  bidBody: { paddingHorizontal: 12, paddingTop: 10, gap: 3 },
  bidAction: { padding: 12, paddingTop: 8 },
  deleteBtn: { position: 'absolute', top: 84, right: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.92)' },
  pricePill: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  priceText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
  lowestTag: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  lowestTagText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#047857' },
  star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  pricePin: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#1e40af', borderWidth: 1.5, borderColor: '#fff' },
  pricePinOn: { backgroundColor: '#f59e0b', transform: [{ scale: 1.12 }] },
  pinCard: { position: 'absolute', zIndex: 20, top: 12, left: 12, right: 12, gap: 6, padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d3d9e2', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  pinCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinCardTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  pinCardSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  pinCardClose: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
  pinCardCloseText: { fontSize: 12, color: Colors.textMuted, fontFamily: FONTS.bodyBold },
  pinCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinCardPrice: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.success },
  pinCardMeta: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  pinCardBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.18)' : '#e3ecfd' },
  pinCardBtnText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6' },
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
