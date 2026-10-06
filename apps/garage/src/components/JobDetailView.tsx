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
} from '@ongarage/shared';
import { bidDeadline, useGarage } from '../context/GarageContext';
import { ServiceModeNote } from './BookingActions';
import { callCustomer, serviceMode } from '../utils/contact';
import { Toast } from './Toast';
import { WorkshopPanel } from './WorkshopPanel';
import { ago, countdown, formatDate, formatTime, money } from '../utils/format';
import type { Booking, DirectRequest, FeedJob, JobDetails } from '../types';

export type DetailTarget = { kind: 'bid'; job: FeedJob } | { kind: 'direct'; job: DirectRequest } | { kind: 'booking'; booking: Booking };

const BOOKING_STATUS: Record<Booking['status'], string> = { scheduled: 'නියමිතයි', inProgress: 'වැඩ කරමින්', completed: 'සම්පූර්ණයි' };

export const SPARE_LABEL: Record<FeedJob['sparePart'], string> = {
  Genuine: 'ජෙනුයින් කොටස්',
  OEM: 'OEM / Aftermarket',
  Recon: 'රීකන්ඩිෂන්',
  GarageChoice: 'ගරාජයේ තේරීම',
};

const MAP_H = 170;

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
  const [now, setNow] = useState(Date.now());
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (target) {
      setShown(target);
      setMounted(true);
      setPage(0);
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
      : shown.job;
  const cat = booking ? { name: booking.title, icon: booking.icon } : categoryInfo(job.categoryId);
  const walkIn = !!booking && serviceMode(booking) === 'walkin';
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
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close details">
              <Icon name="x" size={16} color={Colors.textMain} />
            </Pressable>
            <Text style={styles.headerTitle}>රැකියා විස්තර</Text>
            {booking ? (
              <View style={[styles.kindPill, styles.kindDirect]}>
                <Icon name="check-circle" size={12} color={Colors.success} />
                <Text style={[styles.kindText, { color: Colors.success }]}>තහවුරු වූ වෙන්කිරීම</Text>
              </View>
            ) : (
              <View style={[styles.kindPill, direct ? styles.kindDirect : styles.kindBid]}>
                <Icon name={direct ? 'calendar' : 'tag'} size={12} color={direct ? Colors.success : Colors.primary} />
                <Text style={[styles.kindText, { color: direct ? Colors.success : Colors.primary }]}>{direct ? 'ඍජු වෙන්කිරීම' : 'ලංසු සඳහා'}</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
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
              <View style={styles.noPhotos}>
                <Text style={styles.noPhotosEmoji}>📷</Text>
                <Text style={styles.sub}>හිමිකරු ඡායාරූප එවා නැත</Text>
              </View>
            )}

            {/* Title */}
            <View style={styles.row}>
              <GlassIcon emoji={cat.icon} />
              <View style={styles.flex1}>
                <Text style={styles.title}>
                  {cat.name}
                  {direct?.service ? ` · ${direct.service}` : ''}
                </Text>
                <Text style={styles.sub}>
                  {vehicleIcon(job.vehicle.type)} {job.vehicle.name} · {job.customer.name} · {booking ? booking.vehicle.plate : ago(now - (direct ? direct.requestedAt : bidJob!.postedAt))}
                </Text>
              </View>
            </View>

            {/* Timing */}
            {booking ? (
              <>
                <View style={styles.timing}>
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>වෙන් කළ වේලාව</Text>
                    <Text style={styles.timingValue}>
                      {formatDate(booking.scheduledAt)} · {formatTime(booking.scheduledAt)}
                    </Text>
                  </View>
                  <View style={styles.timingDivider} />
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>මිල</Text>
                    <Text style={[styles.timingValue, { color: Colors.success }]}>{money(booking.price)}</Text>
                  </View>
                  <View style={styles.timingDivider} />
                  <View style={styles.timingCell}>
                    <Text style={styles.timingLabel}>තත්ත්වය</Text>
                    <Text style={styles.timingValue}>{BOOKING_STATUS[booking.status]}</Text>
                  </View>
                </View>
                <ServiceModeNote booking={booking} />
                {booking.progress && <WorkshopPanel booking={booking} />}
                {!booking.progress && !!booking.partsCost && (
                  <View style={styles.bill}>
                    <View style={styles.billRow}>
                      <Text style={styles.sub}>🔧 වැඩ ගාස්තුව</Text>
                      <Text style={styles.billValue}>{money(booking.price)}</Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.sub}>🔩 කොටස් (වෙනම බිල්පත)</Text>
                      <Text style={styles.billValue}>{money(booking.partsCost)}</Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.billTotalLabel}>හිමිකරු ගෙවන මුළු මුදල</Text>
                      <Text style={styles.billTotal}>{money(booking.price + booking.partsCost)}</Text>
                    </View>
                  </View>
                )}
                {!!booking.note && <Text style={styles.sub}>📝 ඔබගේ සටහන: {booking.note}</Text>}
              </>
            ) : direct ? (
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
            </View>

            {/* Voice notes */}
            <Text style={styles.section}>හඬ සටහන් {voices.length ? `(${voices.length})` : ''}</Text>
            {voices.length ? (
              voices.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} />)
            ) : (
              <Text style={styles.empty}>හඬ සටහන් එවා නැත</Text>
            )}

            {/* Requirements */}
            <Text style={styles.section}>අවශ්‍යතා</Text>
            <View style={styles.card}>
              {(!booking || !!booking.job) && <Fact icon="🔩" label="අමතර කොටස්" value={SPARE_LABEL[job.sparePart]} />}
              <Fact
                icon="🚛"
                label="සේවා ස්ථානය"
                value={booking?.source === 'sos' ? 'මාර්ගයේදී (SOS)' : job.doorstep ? 'නිවසටම පැමිණීම (ඔබ යයි)' : 'පාරිභෝගිකයා ගරාජයට ගෙන එයි'}
              />
              <Fact icon={vehicleIcon(job.vehicle.type)} label="වාහනය" value={`${job.vehicle.name} · ${job.vehicle.type} · ${job.vehicle.plate}`} />
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
                          <Text style={styles.pinEmoji}>{vehicleIcon(job.vehicle.type)}</Text>
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
            {walkIn && <Text style={styles.sub}>🏠 පාරිභෝගිකයා පැමිණෙන්නේ: {profile.address}</Text>}

            {/* Customer */}
            <Text style={styles.section}>පාරිභෝගිකයා</Text>
            <View style={styles.card}>
              <Fact icon="👤" label="නම" value={job.customer.name} />
              {booking ? (
                <>
                  <View style={styles.fact}>
                    <Text style={styles.factIcon}>📞</Text>
                    <Text style={styles.factLabel}>දුරකථනය</Text>
                    <Text style={styles.factValue}>{job.customer.phone}</Text>
                    <Pressable style={styles.callBtn} onPress={() => callCustomer(job.customer.phone)} accessibilityLabel="Call customer">
                      <Text style={styles.callText}>📞 අමතන්න</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.empty}>
                    {walkIn
                      ? 'පාරිභෝගිකයාට ඔබගේ ස්ථානය සහ දුරකථන අංකය ලැබී ඇත — මගදී උපදෙස් සඳහා ඔවුන්ට ඔබව ඇමතිය හැක.'
                      : 'රැකියාව ගැන වැඩි විස්තර සඳහා පාරිභෝගිකයා අමතන්න.'}
                  </Text>
                </>
              ) : (
                <>
                  <Fact icon="📞" label="දුරකථනය" value={maskPhone(job.customer.phone)} />
                  <Text style={styles.empty}>
                    {direct ? 'වෙන්කිරීම තහවුරු කළ පසු' : 'ලංසුව දිනූ පසු'} සම්පූර්ණ අංකය මෙහි සහ “කාලසටහන” ටැබයේ පෙනේ.
                  </Text>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>{renderActions(shown)}</View>
        </SafeAreaView>
      </Animated.View>

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

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    root: { flex: 1, backgroundColor: Colors.bgBody },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
    iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    kindPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    kindBid: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
    kindDirect: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
    kindText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    body: { padding: 16, gap: 12, paddingBottom: 28 },
    gallery: { height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard },
    photo: { height: 220 },
    photoCount: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
    photoCountText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
    dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
    dotOn: { width: 16, backgroundColor: '#fff' },
    noPhotos: { height: 110, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center', gap: 4 },
    noPhotosEmoji: { fontSize: 24, opacity: 0.6 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    timing: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    timingCell: { flex: 1, alignItems: 'center', gap: 3 },
    timingDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.borderColor },
    timingLabel: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    timingValue: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 16, padding: 14, gap: 10 },
    desc: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 21 },
    buddy: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.08)', borderLeftWidth: 3, borderLeftColor: Colors.primary },
    buddyText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    empty: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    factIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    factLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, width: 92 },
    factValue: { flex: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    bill: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    billTotalLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    billTotal: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    callBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)' },
    callText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    map: { borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    garagePin: { width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    customerPin: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    pinEmoji: { fontSize: 14 },
    footer: { padding: 16, paddingTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
    lightbox: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.94)', justifyContent: 'center' },
    lightboxImg: { width: '100%', height: '80%' },
    lightboxClose: { position: 'absolute', top: 48, right: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    lightboxCloseText: { fontSize: 18, color: '#fff', fontWeight: '700' },
    lightboxNav: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
    lightboxBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    lightboxCount: { fontSize: 13, fontWeight: '800', color: '#fff' },
  })
);
