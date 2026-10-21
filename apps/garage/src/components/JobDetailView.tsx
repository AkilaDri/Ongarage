import { CustomerHistoryLink, CustomerHistoryList, CustomerHistoryTag, CustomerRecordTabs } from './CustomerHistory';
import { CategoryArt } from './CategoryArt';
import { ClipboardLineIcon } from '@ongarage/shared';
import { VehicleIcon3D, VehicleLabel } from '@ongarage/shared';
import { CustomerBadge } from './CustomerBadge';
import { VehicleLine } from '@ongarage/shared';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  categoryInfo,
  Colors,
  distanceKm,
  FONTS,
  GlassIcon,
  GoogleMap,
  Icon,
  marketPrice,
  themedStyles,
  vehicleIcon,
  VoiceNotePlayer,
  zoomToFit,
  softFill,
  softEdge,
  softShadow,
  getThemeMode,
} from '@ongarage/shared';
import { pageBg } from '../utils/pageBg';
import { bidDeadline, useGarage } from '../context/GarageContext';
import { Toast } from './Toast';
import { BookingJobCard } from './BookingJobCard';
import { AddJobDetailSheet } from './JobCardUpdates';
import { NoPhotoAnimation } from './NoPhotoAnimation';
import { ago, countdown, formatDate, formatTime, money } from '../utils/format';
import type { BidStatus, Booking, DirectRequest, FeedJob, JobDetails, MyBid } from '../types';

export type DetailTarget = { kind: 'bid'; job: FeedJob } | { kind: 'myBid'; bid: MyBid } | { kind: 'direct'; job: DirectRequest } | { kind: 'booking'; booking: Booking };

const BID_STATUS: Record<BidStatus, { label: string; color: () => string }> = {
  pending: { label: 'සලකා බලමින්', color: () => Colors.warning },
  won: { label: 'දිනුවා · කාලසටහනට එක් විය', color: () => Colors.successText },
  lost: { label: 'අහිමි විය', color: () => Colors.errorText },
  withdrawn: { label: 'ඉවත් කළා', color: () => Colors.textMuted },
};

export const SPARE_LABEL: Record<FeedJob['sparePart'], string> = {
  Genuine: 'ජෙනුයින් කොටස්',
  OEM: 'OEM / Aftermarket',
  Recon: 'රීකන්ඩිෂන්',
  GarageChoice: 'ගරාජයේ තේරීම',
};

const MAP_H = 110;

// Contact details are released once a booking exists, so deals stay on the platform.
const maskPhone = (p: string) => `${p.slice(0, 3)} *** **${p.slice(-2)}`;

/**
 * Everything the owner sent for one job: photos, voice notes, the full description,
 * requirements and location. Opens with a cross-dissolve from the swiped card.
 */
export const JobDetailView: React.FC<{
  target: DetailTarget | null;
  onClose: () => void;
  /** Action buttons for the sticky footer (bid, reply to a direct booking…). */
  renderActions: (t: DetailTarget) => React.ReactNode;
}> = ({ target, onClose, renderActions }) => {
  const { profile } = useGarage();
  const [shown, setShown] = useState<DetailTarget | null>(target);
  const [mounted, setMounted] = useState(!!target);
  const [page, setPage] = useState(0);
  const [galleryW, setGalleryW] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // A finished job touched in the record tab opens its own details window, on top of this one.
  const [nested, setNested] = useState<Booking | null>(null);
  // A returning customer's job has two tabs: the job's details and the record of earlier work for them.
  const [view, setView] = useState<'details' | 'records'>('details');
  const [now, setNow] = useState(Date.now());
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (target) {
      setShown(target);
      setMounted(true);
      setPage(0);
      setView('details');
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(fade, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mounted]);

  if (!mounted || !shown) return null;

  const booking = shown.kind === 'booking' ? shown.booking : null;
  const direct = shown.kind === 'direct' ? shown.job : null;
  const bidJob = shown.kind === 'bid' ? shown.job : null;
  const myBid = shown.kind === 'myBid' ? shown.bid : null;
  // Older bookings (and SOS jobs) may not carry the owner's original post.
  const job: JobDetails =
    shown.kind === 'booking'
      ? (shown.booking.job ?? {
          id: shown.booking.id,
          categoryId: '',
          description: `${shown.booking.title} — ${shown.booking.customer.name} ගේ ${shown.booking.vehicle.name}`,
          customer: shown.booking.customer,
          vehicle: shown.booking.vehicle,
          sparePart: 'GarageChoice',
          doorstep: shown.booking.doorstep,
          location: { address: shown.booking.address, coords: shown.booking.coords },
          distanceKm: Number(distanceKm(profile.coords, shown.booking.coords).toFixed(1)),
        })
      : shown.kind === 'myBid'
        ? shown.bid.job
        : shown.job;
  // How the job came: a direct booking, a bid (posted or won), or an SOS call.
  const kind: 'Booking' | 'Bid' | 'SOS' = booking ? (booking.source === 'sos' ? 'SOS' : booking.source === 'direct' ? 'Booking' : 'Bid') : direct ? 'Booking' : 'Bid';
  const cat = booking ? { name: booking.title, icon: booking.icon } : categoryInfo(job.categoryId);
  const photos = job.photos ?? [];
  const voices = job.voiceNotes ?? [];
  const mid = {
    latitude: (profile.coords.latitude + job.location.coords.latitude) / 2,
    longitude: (profile.coords.longitude + job.location.coords.longitude) / 2,
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.root,
          { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] }) }] },
        ]}
      >
        <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
          {/* No top bar: only the close button, floating at the top left over the page. */}
          <Pressable style={styles.floatClose} onPress={onClose} hitSlop={8} accessibilityLabel="Close details">
            <Icon name="x" size={16} color={Colors.textMain} />
          </Pressable>
          {/* The title at the very top of the window, beside the close button. */}
          <View style={styles.floatTitle} accessibilityRole="header">
            <View style={styles.floatTitleIcon}>
              <ClipboardLineIcon active size={26} />
            </View>
            <View style={styles.flex1}>
              <View style={styles.headTitleRow}>
                <Text style={styles.floatTitleText}>රැකියා තොරතුරු</Text>
                {/* At the right end, the customer's New / Old tag, then how the job came (a booking, a bid, or an SOS). */}
                <View style={styles.headTags}>
                  {(!!booking || !!direct) && <CustomerHistoryTag customer={job.customer} />}
                <View style={[styles.headKind, kind === 'Booking' ? styles.headKindBooking : kind === 'SOS' ? styles.headKindSos : styles.headKindBid]}>
                  <Text style={[styles.headKindText, { color: kind === 'Booking' ? Colors.success : kind === 'SOS' ? Colors.errorText : Colors.primary }]}>{kind}</Text>
                </View>
                </View>
              </View>
              <Text style={styles.floatTitleSub} numberOfLines={1}>
                {cat.name} · {job.vehicle.registrationNo || job.vehicle.plate}
              </Text>
            </View>
          </View>

          <View style={[styles.flex1, { paddingTop: 52 }]}>
          {/* Private while the job is only open for bids: the tabs exist once the garage has been chosen (a booking, or a won bid). */}
          {(!!booking || !!direct) && <CustomerRecordTabs customer={job.customer} view={view} onChange={setView} />}
          {view === 'records' && (!!booking || !!direct) ? (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <CustomerHistoryList customer={job.customer} onOpenJob={(b) => setNested(b)} />
            </ScrollView>
          ) : (
          <ScrollView contentContainerStyle={booking ? styles.bodyWithFab : styles.body} showsVerticalScrollIndicator={false}>
            {booking ? (
              <BookingJobCard booking={booking} />
            ) : (
              <>
            {/* Photos */}
            {photos.length ? (
              <View style={styles.gallery} onLayout={(e) => setGalleryW(e.nativeEvent.layout.width)}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => galleryW && setPage(Math.round(e.nativeEvent.contentOffset.x / galleryW))}
                  scrollEventThrottle={32}
                >
                  {photos.map((uri, i) => (
                    <Pressable key={uri + i} onPress={() => setLightbox(i)} accessibilityLabel={`Photo ${i + 1}`}>
                      <Image source={{ uri }} style={[styles.photo, { width: galleryW || 1 }]} resizeMode="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.photoCount}>
                  <Text style={styles.photoCountText}>
                    📷 {page + 1}/{photos.length}
                  </Text>
                </View>
                {photos.length > 1 && (
                  <View style={styles.dots}>
                    {photos.map((_, i) => (
                      <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <NoPhotoAnimation emoji={cat.icon} height={150} />
            )}

            {/* Title */}
            <View style={styles.row}>
              <CategoryArt emoji={cat.icon} size={52} />
              <View style={styles.flex1}>
                <Text style={styles.title}>
                  {cat.name}
                  {direct?.service ? ` · ${direct.service}` : ''}
                </Text>
                <VehicleLabel type={job.vehicle.type} style={styles.sub} >{job.vehicle.name} · {job.customer.name} · {ago(now - (direct ? direct.requestedAt : myBid ? myBid.submittedAt : bidJob!.postedAt))}
                </VehicleLabel>
              </View>
            </View>

            {/* Timing */}
            {direct ? (
              <View style={styles.timing}>
                <View style={styles.timingCell}>
                  <Text style={styles.timingLabel}>ඉල්ලූ වේලාව</Text>
                  <Text style={styles.timingValue}>
                    {formatDate(direct.preferredAt)} · {formatTime(direct.preferredAt)}
                  </Text>
                </View>
                <View style={styles.timingDivider} />
                <View style={styles.timingCell}>
                  <Text style={styles.timingLabel}>{direct.status === 'proposed' ? 'තත්ත්වය' : 'පිළිතුරු දීමට'}</Text>
                  <Text style={[styles.timingValue, { color: direct.status === 'proposed' ? Colors.warning : Colors.errorText }]}>
                    {direct.status === 'proposed' ? 'පිළිතුර බලාපොරොත්තුවෙන්' : countdown(direct.respondBy - now)}
                  </Text>
                </View>
              </View>
            ) : myBid ? (
              <>
                <View style={styles.timing}>
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>ඔබගේ ලංසුව</Text>
                    <Text style={[styles.timingValue, { color: Colors.success }]}>{money(myBid.price)}</Text>
                  </View>
                  <View style={styles.timingDivider} />
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>වගකීම</Text>
                    <Text style={styles.timingValue}>{myBid.warrantyMonths ? `මාස ${myBid.warrantyMonths}` : 'නැත'}</Text>
                  </View>
                  <View style={styles.timingDivider} />
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>ඇස්තමේන්තු කාලය</Text>
                    <Text style={styles.timingValue}>පැය {myBid.estHours}</Text>
                  </View>
                </View>
                <Text style={styles.section}>ලංසුවේ වාර්තාව</Text>
                <View style={styles.card}>
                  <View style={styles.fact}>
                    <Text style={styles.factIcon}>●</Text>
                    <Text style={styles.factLabel}>තත්ත්වය</Text>
                    <Text style={[styles.factValue, { color: BID_STATUS[myBid.status].color() }]}>{BID_STATUS[myBid.status].label}</Text>
                  </View>
                  <Fact icon="🕒" label="ලංසු තැබූ වේලාව" value={`${formatDate(myBid.submittedAt)} · ${formatTime(myBid.submittedAt)} (${ago(now - myBid.submittedAt)})`} />
                  <Fact icon="🏷️" label="වෙළඳපොළ මිල" value={`${money(marketPrice(job.categoryId))} · ඔබගේ ලංසුව ${myBid.price <= marketPrice(job.categoryId) ? 'ඊට වඩා අඩුයි' : 'ඊට වඩා වැඩියි'}`} />
                  <Fact icon="📝" label="ඔබගේ සටහන" value={myBid.note || 'සටහනක් නැත'} />
                  <Fact icon="👥" label="වෙනත් ලංසු" value={`${myBid.job.otherBids}`} />
                </View>
              </>
            ) : (
              <View style={styles.timing}>
                <View style={styles.timingCell}>
                  <Text style={styles.timingLabel}>ලංසු අවසන් වීමට</Text>
                  <Text style={[styles.timingValue, { color: Colors.primary }]}>{countdown(bidDeadline(bidJob!) - now)}</Text>
                </View>
                <View style={styles.timingDivider} />
                <View style={styles.timingCell}>
                  <Text style={styles.timingLabel}>වෙනත් ලංසු</Text>
                  <Text style={styles.timingValue}>{bidJob!.otherBids}</Text>
                </View>
                <View style={styles.timingDivider} />
                <View style={styles.timingCell}>
                  <Text style={styles.timingLabel}>වෙළඳපොළ මිල</Text>
                  <Text style={styles.timingValue}>{money(marketPrice(job.categoryId))}</Text>
                </View>
              </View>
            )}

            {/* Description */}
            <Text style={styles.section}>ගැටලුව</Text>
            <View style={styles.card}>
              <Text style={styles.desc}>{job.description}</Text>
              {!!job.buddySummary && (
                <View style={styles.buddy}>
                  <Text style={styles.buddyText}>🤖 Buddy: {job.buddySummary}</Text>
                </View>
              )}
              {voices.length > 0 && (
                <View style={styles.voices}>
                  <Text style={styles.voiceLabel}>🎙️ Voice note ({voices.length})</Text>
                  {voices.map((n, i) => (
                    <VoiceNotePlayer key={n.id} note={n} index={i} compact />
                  ))}
                </View>
              )}
            </View>

            {/* Requirements */}
            <Text style={styles.section}>අවශ්‍යතා</Text>
            <View style={styles.card}>
              <Fact icon="🔩" label="අමතර කොටස්" value={SPARE_LABEL[job.sparePart]} />
              <Fact
                icon="🚛"
                label="සේවා ස්ථානය"
                value={job.doorstep ? 'නිවසටම පැමිණීම (ඔබ යයි)' : 'පාරිභෝගිකයා ගරාජයට ගෙන එයි'}
              />
              <View style={styles.fact}>
                <VehicleIcon3D type={job.vehicle.type} size={22} />
                <Text style={styles.factLabel}>වාහනය</Text>
                <VehicleLine vehicle={job.vehicle} textStyle={styles.factValue} />
              </View>
            </View>

            {/* Location */}
            <Text style={styles.section}>ස්ථානය</Text>
            <GoogleMap
              style={[styles.map, { height: MAP_H }]}
              center={mid}
              zoom={zoomToFit(job.distanceKm, mid.latitude, MAP_H)}
              fallbackColor={Colors.primary}
              renderOverlay={(project) => {
                const g = project(profile.coords);
                const c = project(job.location.coords);
                return (
                  <>
                    {g && (
                      <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                        <View style={styles.garagePin}>
                          <Text style={styles.pinEmoji}>🛠️</Text>
                        </View>
                      </View>
                    )}
                    {c && (
                      <View style={[styles.pinAnchor, { left: c.x, top: c.y }]} pointerEvents="none">
                        <View style={styles.customerPin}>
                          <VehicleIcon3D type={job.vehicle.type} size={26} />
                        </View>
                      </View>
                    )}
                  </>
                );
              }}
            />
            <Text style={styles.sub}>
              📍 {job.location.address} · ගරාජයේ සිට කි.මී. {job.distanceKm}
            </Text>

            {/* Customer */}
            <Text style={styles.section}>පාරිභෝගිකයා</Text>
            <View style={styles.card}>
              <Fact icon="👤" label="නම" value={job.customer.name} />
              <CustomerBadge customer={job.customer} />
              {/* Private while the job is only open for bids: shown once the garage has been chosen (a booking, or a won bid). */}
              {(!!booking || !!direct) && <CustomerHistoryLink customer={job.customer} />}
              {!booking && !direct && <Text style={styles.empty}>🔒 පාරිභෝගිකයාගේ කලින් වාර්තාව රැකියාව දිනූ පසු පෙනේ.</Text>}
              <Fact icon="📞" label="දුරකථනය" value={maskPhone(job.customer.phone)} />
              <Text style={styles.empty}>
                {direct ? 'වෙන්කිරීම තහවුරු කළ පසු' : 'ලංසුව දිනූ පසු'} සම්පූර්ණ අංකය මෙහි සහ “Schedule” ටැබයේ පෙනේ.
              </Text>
            </View>
              </>
            )}
          </ScrollView>
          )}
          </View>

          <View style={styles.footer}>{renderActions(shown)}</View>
        </SafeAreaView>
      </Animated.View>

      {!!nested && <JobDetailView target={{ kind: 'booking', booking: nested }} onClose={() => setNested(null)} renderActions={renderActions} />}
      {booking && <AddJobDetailSheet booking={booking} visible={addOpen} onClose={() => setAddOpen(false)} />}

      {/* Full-screen photo viewer */}
      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightbox}>
          {lightbox !== null && <Image source={{ uri: photos[lightbox] }} style={styles.lightboxImg} resizeMode="contain" />}
          <Pressable style={styles.lightboxClose} onPress={() => setLightbox(null)} accessibilityLabel="Close photo">
            <Text style={styles.lightboxCloseText}>✕</Text>
          </Pressable>
          {photos.length > 1 && lightbox !== null && (
            <View style={styles.lightboxNav}>
              <Pressable style={styles.lightboxBtn} onPress={() => setLightbox((lightbox + photos.length - 1) % photos.length)}>
                <Text style={styles.lightboxCloseText}>‹</Text>
              </Pressable>
              <Text style={styles.lightboxCount}>
                {lightbox + 1}/{photos.length}
              </Text>
              <Pressable style={styles.lightboxBtn} onPress={() => setLightbox((lightbox + 1) % photos.length)}>
                <Text style={styles.lightboxCloseText}>›</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
      <Toast topOffset={70} />
    </Modal>
  );
};

const Fact: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.fact}>
    <Text style={styles.factIcon}>{icon}</Text>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

// Google Material look: 12px corners, a thin outline and a light elevation on every surface, a plain top app bar and a sticky action bar.
const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');
const elevation1 = () => ({ shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 }) as const;

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    root: { flex: 1, backgroundColor: pageBg() },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    floatClose: { position: 'absolute', top: 10, left: 10, zIndex: 20, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    floatTitle: { position: 'absolute', top: 6, left: 54, right: 16, zIndex: 20, height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
    floatTitleIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    headTags: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    headKind: { paddingHorizontal: 7, height: 18, justifyContent: 'center', borderRadius: 9 },
    headKindBooking: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    headKindBid: { backgroundColor: 'rgba(56, 189, 248, 0.16)' },
    headKindSos: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    headKindText: { fontSize: 10, lineHeight: 12, fontFamily: FONTS.bodyBold },
    floatTitleText: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 18 },
    floatTitleSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 15 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, minHeight: 56, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: outline(), ...elevation1() },
    iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    kindPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 8, borderWidth: 1 },
    kindBid: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
    kindDirect: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
    kindText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    bodyWithFab: { paddingVertical: 16, paddingHorizontal: 6, gap: 12, paddingBottom: 96 },
    body: { paddingVertical: 16, paddingHorizontal: 6, gap: 12, paddingBottom: 28 },
    gallery: { height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    photo: { height: 220 },
    photoCount: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
    photoCountText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
    dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
    dotOn: { width: 16, backgroundColor: '#fff' },
    noPhotos: { height: 110, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', gap: 4 },
    voices: { gap: 8 },
    voiceLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    title: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    timing: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    timingCell: { flex: 1, alignItems: 'center', gap: 3 },
    timingDivider: { width: 1, alignSelf: 'stretch', backgroundColor: outline() },
    timingLabel: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    timingValue: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 8, letterSpacing: 0.2 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 12, padding: 16, gap: 12, ...elevation1() },
    desc: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 22 },
    buddy: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe', borderLeftWidth: 3, borderLeftColor: Colors.primary },
    buddyText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    factIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    factLabel: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, width: 104 },
    factValue: { flex: 1, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    bill: { padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), gap: 8, ...elevation1() },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    billTotalLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    billTotal: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    callBtn: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#e6f4ea' },
    callText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    map: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: outline() },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    garagePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    customerPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    pinEmoji: { fontSize: 14 },
    footer: { padding: 16, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: outline(), backgroundColor: Colors.bgCard, shadowColor: '#3c4043', shadowOffset: { width: 0, height: -1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.12, shadowRadius: 3, elevation: 4 },
    lightbox: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.94)', justifyContent: 'center' },
    lightboxImg: { width: '100%', height: '80%' },
    lightboxClose: { position: 'absolute', top: 48, right: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    lightboxCloseText: { fontSize: 18, color: '#fff', fontWeight: '700' },
    lightboxNav: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
    lightboxBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    lightboxCount: { fontSize: 13, fontWeight: '800', color: '#fff' },
  })
);
