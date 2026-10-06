import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, LevelBadge, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { SERVICE_CATEGORIES } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { Icon, type IconName } from '@ongarage/shared';
import { GoogleMap, zoomToFit } from '@ongarage/shared';
import { ActionButton, EmptyState, GlassIcon, ModalCard, SwipeCard } from '@ongarage/shared';
import { OwnerDetailView } from '../components/OwnerDetailView';
import { GarageReviewsSheet, garageForBid } from '../components/GarageReviewsSheet';
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
  onPostJob: () => void;
  onRepublish: (draft: JobDraft) => void;
  onViewActivity: () => void;
}

export const BidsScreen: React.FC<BidsScreenProps> = ({ tab, onTabChange, onPostJob, onRepublish, onViewActivity }) => {
  const { jobs, acceptBid } = useBids();
  const { findVehicle } = useVehicles();
  const user = useUserLocation();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // One garage's bid, opened by tapping or swiping it inside the job card.
  const [bidView, setBidView] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  const [booked, setBooked] = useState<{ job: RepairJob; bid: Bid } | null>(null);
  // Swipe (or tap the header of) a job card for everything about it.
  const [detailId, setDetailId] = useState<string | null>(null);
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
      <Pressable style={styles.jobHead} onPress={() => setDetailId(job.id)} accessibilityLabel={`${cat?.name ?? 'Job'} details`}>
        <GlassIcon emoji={cat?.icon ?? '🔧'} small />
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{cat?.name ?? 'Service'}</Text>
          <Text style={styles.cardSub}>
            {vehicle ? `${vehicle.name} · ${vehicle.plate}` : ''}
          </Text>
          <Text style={styles.desc} numberOfLines={2}>
            {job.description}
          </Text>
          <Text style={styles.detailsLink}>
            {media ? `${media} · ` : ''}විස්තර ›
          </Text>
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
    return (
      <SwipeCard key={bid.id} style={[styles.bidCard, isLowest && !job.acceptedBidId && styles.bidCardLowest, isAccepted && styles.bidCardAccepted]} onOpen={() => setBidView({ job, bid })}>
        <Pressable style={styles.rowBetween} onPress={() => setBidView({ job, bid })} accessibilityLabel={`${bid.garageName} bid details`}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{bid.garageName}</Text>
            {!!bid.level && <LevelBadge level={bid.level} compact />}
            <Text style={styles.cardSub}>
              ★ {bid.rating.toFixed(1)} ({bid.reviews}) · 📍 කි.මී. {bid.distanceKm} · {ago(now - bid.submittedAt)}
            </Text>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{money(bid.price)}</Text>
          </View>
        </Pressable>
        <View style={styles.chipRow}>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>🛡️ මාස {bid.warrantyMonths} වගකීම</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>⏱️ ඇස්තමේන්තු කාලය: පැය {bid.estHours}</Text>
          </View>
          {isLowest && !job.acceptedBidId && (
            <View style={[styles.infoChip, styles.lowestChip]}>
              <Text style={[styles.infoChipText, { color: Colors.successText }]}>💰 අඩුම ලංසුව</Text>
            </View>
          )}
        </View>
        {isAccepted ? (
          <View style={styles.rowBetween}>
            <View style={[styles.infoChip, styles.lowestChip]}>
              <Text style={[styles.infoChipText, { color: Colors.successText }]}>✓ වෙන් කිරීම තහවුරුයි</Text>
            </View>
            <Pressable onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))}>
              <Text style={styles.link}>🗺️ දිශාවන්</Text>
            </Pressable>
          </View>
        ) : (
          <ActionButton
            label={isLowest ? 'අඩුම ලංසුව පිළිගන්න' : 'ලංසුව පිළිගෙන වෙන් කරන්න'}
            variant={isLowest ? 'success' : 'primary'}
            onPress={() => setConfirming({ job, bid })}
          />
        )}
      </SwipeCard>
    );
  };

  const renderReceived = () => (
    <>
      {mapBids.length > 0 && (
        <>
          <GoogleMap
            style={styles.map}
            center={user.coords}
            zoom={zoomToFit(Math.max(...mapBids.map(({ bid }) => bid.distanceKm)) * 2.4, user.coords.latitude, 210)}
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
          <Text style={styles.hint}>ආසන්නයේ ගරාජ {mapBids.length}ක් ලංසු තබමින් සිටී</Text>
        </>
      )}
      {received.length === 0 ? (
        <EmptyState icon="📥" title="තවම ලංසු ලැබී නැත" text="ගරාජ ඔබගේ රැකියාවලට ලංසු තැබූ විට ඒවා මෙහි පෙන්වනු ඇත." />
      ) : (
        received.map((job) => {
          const shown = job.acceptedBidId ? job.bids.filter((b) => b.id === job.acceptedBidId) : [...job.bids].sort((a, b) => a.price - b.price);
          return (
            <SwipeCard key={job.id} style={styles.card} onOpen={() => setDetailId(job.id)}>
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
            </SwipeCard>
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
          <SwipeCard key={job.id} style={[styles.card, !isPending && styles.cardExpired]} onOpen={() => setDetailId(job.id)}>
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
          </SwipeCard>
        );
      })
    );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => onTabChange(t.id)}>
              <Icon name={t.icon} size={15} color={active ? Colors.primary : Colors.textMuted} />
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

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable style={({ pressed }) => [styles.newJobBtn, pressed && { opacity: 0.75 }]} onPress={onPostJob}>
          <Text style={styles.newJobText}>＋ නව අලුත්වැඩියා රැකියාවක් පළ කරන්න</Text>
        </Pressable>
        {jobs.length > 0 && <Text style={styles.swipeHint}>⇆ ලංසු, ඡායාරූප සහ සම්පූර්ණ විස්තර සඳහා රැකියා කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>}
        {tab === 'received' && renderReceived()}
        {tab === 'pending' && renderWaiting(pending, 'pending')}
        {tab === 'expired' && renderWaiting(expired, 'expired')}
      </ScrollView>

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
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  // Same "add" button as the garage app's Parts tab.
  newJobBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
  newJobText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
  swipeHint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.bgCard,
  },
  tabActive: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.5)' },
  tabText: { flexShrink: 1, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
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
  tabCountActive: { backgroundColor: Colors.primary },
  tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
  tabCountTextActive: { color: '#fff' },
  body: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 100 },
  map: { height: 210, borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor },
  hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
  cardExpired: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  desc: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: 4 },
  jobHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePrimary: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
  badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
  bidCard: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.subtleFill,
  },
  bidCardLowest: { borderColor: 'rgba(16, 185, 129, 0.55)' },
  bidCardAccepted: { borderColor: Colors.success, backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  pricePill: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: Colors.success, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceText: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.success },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill },
  infoChipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  lowestChip: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
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
