import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionButton,
  categoryInfo,
  Colors,
  directionsUrl,
  FONTS,
  GlassIcon,
  GoogleMap,
  Icon,
  PhotoStrip,
  themedStyles,
  vehicleIcon,
  VoiceNotePlayer,
  zoomToFit,
  type Bid,
  type RepairJob,
  type VoiceNote,
} from '@ongarage/shared';
import { biddingEndsAt, lowestBidId } from '../context/BidsContext';
import { useBookings } from '../context/BookingsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useWorkshops } from '../context/WorkshopContext';
import { WorkshopTracker } from './workshop/WorkshopTracker';
import { useUserLocation } from '../context/LocationContext';
import { sparePartLabel } from '../constants/labels';
import { Toast } from './Toast';
import { ago, countdown, formatDate, formatTime, money } from '../utils/format';
import type { DirectBooking } from '../types';

export type OwnerDetailTarget = { kind: 'job'; job: RepairJob } | { kind: 'booking'; booking: DirectBooking };

const MAP_H = 160;
const BOOKING_STATUS: Record<DirectBooking['status'], { label: string; color: () => string }> = {
  requested: { label: 'ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්', color: () => Colors.warning },
  proposed: { label: 'ගරාජය වෙනත් වේලාවක් යෝජනා කළා', color: () => Colors.warning },
  confirmed: { label: 'තහවුරුයි', color: () => Colors.successText },
  declined: { label: 'ප්‍රතික්ෂේප විය', color: () => Colors.textMuted },
  expired: { label: 'ගරාජය පිළිතුරු දුන්නේ නැත', color: () => Colors.textMuted },
  cancelled: { label: 'ඔබ අවලංගු කළා', color: () => Colors.textMuted },
};

/**
 * Everything about one of the owner's jobs or bookings: what they sent (photos, voice
 * notes, description), who is involved and what happens next. Opens with the same
 * cross-dissolve as the garage app's job details, from a swiped card.
 */
export const OwnerDetailView: React.FC<{
  target: OwnerDetailTarget | null;
  onClose: () => void;
  /** Posted jobs: accept a bid (the screen asks for confirmation). */
  onAcceptBid?: (job: RepairJob, bid: Bid) => void;
  /** Posted jobs with no bids: edit and post again. */
  onRepublish?: (job: RepairJob) => void;
}> = ({ target, onClose, onAcceptBid, onRepublish }) => {
  const { findVehicle } = useVehicles();
  const { workshops } = useWorkshops();
  const user = useUserLocation();
  const { acceptProposal, declineProposal, cancelBooking } = useBookings();
  const [shown, setShown] = useState<OwnerDetailTarget | null>(target);
  const [mounted, setMounted] = useState(!!target);
  const [now, setNow] = useState(Date.now());
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (target) {
      setShown(target);
      setMounted(true);
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

  const job = shown.kind === 'job' ? shown.job : null;
  const booking = shown.kind === 'booking' ? shown.booking : null;
  const categoryId = job?.categoryId ?? booking!.categoryId;
  const cat = categoryInfo(categoryId);
  const vehicle = findVehicle(job?.vehicleId ?? booking!.vehicleId);
  const photos = (job ? job.photos : booking!.photos) ?? [];
  const voices: VoiceNote[] = (job ? job.voiceNotes : booking!.voiceNotes) ?? [];
  const description = job?.description ?? booking!.description;

  const close = (then?: () => void) => () => {
    onClose();
    then?.();
  };

  // ---------- Posted job ----------
  const jobBody = (j: RepairJob) => {
    const sorted = [...j.bids].sort((a, b) => a.price - b.price);
    const lowest = lowestBidId(j.bids);
    const accepted = j.bids.find((b) => b.id === j.acceptedBidId);
    const open = !j.acceptedBidId && now < biddingEndsAt(j);
    return (
      <>
        <View style={styles.timing}>
          <Cell label={j.acceptedBidId ? 'තත්ත්වය' : 'ලංසු අවසන් වීමට'} value={j.acceptedBidId ? 'වෙන් කළා' : open ? countdown(biddingEndsAt(j) - now) : 'අවසන්'} color={j.acceptedBidId ? Colors.successText : Colors.primary} />
          <View style={styles.divider} />
          <Cell label="ලැබුණු ලංසු" value={String(j.bids.length)} />
          <View style={styles.divider} />
          <Cell label="අඩුම ලංසුව" value={sorted[0] ? money(sorted[0].price) : '—'} color={Colors.success} />
        </View>

        <Text style={styles.section}>ලංසු {j.bids.length ? `(${j.bids.length})` : ''}</Text>
        {j.bids.length === 0 ? (
          <Text style={styles.empty}>තවම ලංසු නැත — ළඟම ගරාජවලට ඔබගේ රැකියාව පෙනේ.</Text>
        ) : (
          <>
            <GoogleMap
              style={[styles.map, { height: MAP_H }]}
              center={user.coords}
              zoom={zoomToFit(Math.max(...j.bids.map((b) => b.distanceKm)) * 2.4, user.coords.latitude, MAP_H)}
              renderOverlay={(project) => (
                <>
                  {j.bids.map((b) => {
                    const p = project(b.coords);
                    return p ? (
                      <View key={b.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="none">
                        <View style={[styles.pricePin, b.id === (accepted?.id ?? lowest) && styles.pricePinBest]}>
                          <Text style={styles.pricePinText}>{money(b.price)}</Text>
                        </View>
                      </View>
                    ) : null;
                  })}
                </>
              )}
            />
            {sorted.map((b) => {
              const isAccepted = b.id === j.acceptedBidId;
              const isLowest = b.id === lowest;
              return (
                <View key={b.id} style={[styles.card, isAccepted && styles.cardOk, !j.acceptedBidId && isLowest && styles.cardBest, j.acceptedBidId && !isAccepted && styles.dim]}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flex1}>
                      <Text style={styles.title}>{b.garageName}</Text>
                      <Text style={styles.sub}>
                        ★ {b.rating.toFixed(1)} ({b.reviews}) · කි.මී. {b.distanceKm} · {ago(now - b.submittedAt)}
                      </Text>
                    </View>
                    <Text style={styles.price}>{money(b.price)}</Text>
                  </View>
                  <Text style={styles.sub}>
                    🛡️ මාස {b.warrantyMonths} වගකීම · ⏱️ පැය {b.estHours}
                    {isLowest && !j.acceptedBidId ? ' · 💰 අඩුම ලංසුව' : ''}
                    {isAccepted ? ' · ✓ ඔබ තෝරා ගත්තා' : ''}
                  </Text>
                  {!j.acceptedBidId && onAcceptBid && (
                    <ActionButton label="මෙම ලංසුව පිළිගන්න" icon="✓" variant={isLowest ? 'success' : 'ghost'} compact onPress={close(() => onAcceptBid(j, b))} />
                  )}
                </View>
              );
            })}
          </>
        )}
      </>
    );
  };

  // ---------- Direct booking ----------
  const bookingBody = (b: DirectBooking) => {
    const st = BOOKING_STATUS[b.status];
    const when = b.scheduledAt ?? b.proposal?.at ?? b.preferredAt;
    return (
      <>
        <View style={styles.timing}>
          <Cell label={b.scheduledAt ? 'වෙන් කළ වේලාව' : b.proposal ? 'යෝජිත වේලාව' : 'ඉල්ලූ වේලාව'} value={`${formatDate(when)} · ${formatTime(when)}`} />
          <View style={styles.divider} />
          <Cell label="ඇස්තමේන්තුව" value={b.estimate || b.proposal ? money((b.estimate ?? b.proposal?.estimate)!) : '—'} color={Colors.primary} />
          <View style={styles.divider} />
          <Cell label="තත්ත්වය" value={b.status === 'requested' ? countdown(b.respondBy - now) : st.label} color={st.color()} />
        </View>
        {b.status === 'requested' && <Text style={styles.sub}>{st.label} — පැය 2ක් ඇතුළත පිළිතුරු නොදුන්නොත් වෙනත් ගරාජයක් තෝරා ගත හැක.</Text>}
        {b.proposal && b.status === 'proposed' && (
          <View style={[styles.card, styles.cardWarn]}>
            <Text style={styles.title}>🕘 {b.garage.name} යෝජනා කරයි</Text>
            <Text style={styles.sub}>
              {formatDate(b.proposal.at)} · {formatTime(b.proposal.at)} (ඔබ ඉල්ලුවේ {formatDate(b.preferredAt)} · {formatTime(b.preferredAt)})
              {b.proposal.note ? ` — ${b.proposal.note}` : ''}
            </Text>
          </View>
        )}

        <Text style={styles.section}>ගරාජය</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <GlassIcon emoji="🛠️" small />
            <View style={styles.flex1}>
              <Text style={styles.title}>{b.garage.name}</Text>
              <Text style={styles.sub}>
                ★ {b.garage.rating} ({b.garage.reviews}) · {b.garage.specialization}
              </Text>
            </View>
          </View>
          <Fact icon="📍" label="ලිපිනය" value={b.garage.address} />
          <Fact icon="📞" label="දුරකථනය" value={b.status === 'confirmed' ? b.garage.phone : 'තහවුරු වූ පසු'} />
          <Fact icon={b.doorstep ? '🚛' : '🏠'} label="සේවා ස්ථානය" value={b.doorstep ? 'ගරාජය ඔබ වෙත පැමිණේ' : 'ඔබ වාහනය ගරාජයට ගෙන යයි'} />
        </View>
        <GoogleMap
          style={[styles.map, { height: MAP_H }]}
          center={b.garage.coords}
          zoom={14}
          renderOverlay={(project) => {
            const g = project(b.garage.coords);
            return g ? (
              <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                <View style={styles.garagePin}>
                  <Text style={styles.pinEmoji}>🛠️</Text>
                </View>
              </View>
            ) : null;
          }}
        />
      </>
    );
  };

  const actions = () => {
    if (job) {
      if (job.acceptedBidId) {
        const bid = job.bids.find((x) => x.id === job.acceptedBidId);
        return bid ? <ActionButton label="ගරාජයට දිශාවන්" icon="🗺️" variant="primary" onPress={() => Linking.openURL(directionsUrl(bid.coords, user.coords))} /> : null;
      }
      if (job.bids.length === 0 && onRepublish) return <ActionButton label="සංස්කරණය කර නැවත පළ කරන්න" icon="📝" variant="primary" onPress={close(() => onRepublish(job))} />;
      return null;
    }
    const b = booking!;
    if (b.status === 'proposed')
      return (
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="වෙනත් ගරාජයක්" variant="ghost" compact onPress={() => declineProposal(b.id)} />
          </View>
          <View style={styles.flex1}>
            <ActionButton label="පිළිගන්න" icon="✓" variant="success" compact onPress={() => acceptProposal(b.id)} />
          </View>
        </View>
      );
    if (b.status === 'requested') return <ActionButton label="ඉල්ලීම අවලංගු කරන්න" variant="ghost" onPress={() => cancelBooking(b.id)} />;
    if (b.status === 'confirmed')
      return (
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${b.garage.phone.replace(/\s/g, '')}`)} />
          </View>
          {!b.doorstep && (
            <View style={styles.flex1}>
              <ActionButton label="දිශාවන්" icon="🗺️" variant="primary" compact onPress={() => Linking.openURL(directionsUrl(b.garage.coords, user.coords))} />
            </View>
          )}
        </View>
      );
    return null;
  };
  const footer = actions();

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.root, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] }) }] }]}>
        <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close details">
              <Icon name="x" size={16} color={Colors.textMain} />
            </Pressable>
            <Text style={styles.headerTitle}>{job ? 'රැකියා විස්තර' : 'වෙන්කිරීම් විස්තර'}</Text>
            <View style={[styles.kindPill, booking ? styles.kindDirect : styles.kindBid]}>
              <Icon name={booking ? 'calendar' : 'tag'} size={12} color={booking ? Colors.success : Colors.primary} />
              <Text style={[styles.kindText, { color: booking ? Colors.success : Colors.primary }]}>{booking ? 'ඍජු වෙන්කිරීම' : 'ලංසු සඳහා'}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.row}>
              <GlassIcon emoji={cat.icon} />
              <View style={styles.flex1}>
                <Text style={styles.bigTitle}>
                  {cat.name}
                  {booking?.service ? ` · ${booking.service}` : ''}
                </Text>
                <Text style={styles.sub}>
                  {vehicleIcon(vehicle.type)} {vehicle.name} · {vehicle.plate} · {ago(now - (job?.submittedAt ?? booking!.requestedAt))}
                </Text>
              </View>
            </View>

            {job ? jobBody(job) : bookingBody(booking!)}

            {workshops[shown.kind === 'job' ? shown.job.id : shown.booking.id] && (
              <>
                <Text style={styles.section}>වැඩපළ ප්‍රගතිය</Text>
                <View style={styles.card}>
                  <WorkshopTracker id={shown.kind === 'job' ? shown.job.id : shown.booking.id} detailed />
                </View>
              </>
            )}

            <Text style={styles.section}>ඔබ එවූ විස්තරය</Text>
            <View style={styles.card}>
              <Text style={styles.desc}>{description}</Text>
            </View>

            <Text style={styles.section}>ඡායාරූප {photos.length ? `(${photos.length})` : ''}</Text>
            <PhotoStrip photos={photos} height={110} emptyText="ඡායාරූප එවා නැත" />

            <Text style={styles.section}>හඬ සටහන් {voices.length ? `(${voices.length})` : ''}</Text>
            {voices.length ? voices.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} />) : <Text style={styles.empty}>හඬ සටහන් එවා නැත</Text>}

            {job && (
              <>
                <Text style={styles.section}>අවශ්‍යතා</Text>
                <View style={styles.card}>
                  <Fact icon="🔩" label="අමතර කොටස්" value={sparePartLabel(job.sparePart)} />
                  <Fact icon="🚛" label="සේවා ස්ථානය" value={job.doorstep ? 'නිවසටම පැමිණීම' : 'ගරාජයට ගෙන යයි'} />
                  <Fact icon="📍" label="ස්ථානය" value={job.address} />
                </View>
              </>
            )}
          </ScrollView>

          {!!footer && <View style={styles.footer}>{footer}</View>}
        </SafeAreaView>
      </Animated.View>
      <Toast topOffset={70} />
    </Modal>
  );
};

const Cell: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.cell}>
    <Text style={styles.cellLabel}>{label}</Text>
    <Text style={[styles.cellValue, color ? { color } : null]}>{value}</Text>
  </View>
);

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
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    actions: { flexDirection: 'row', gap: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
    iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    kindPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    kindBid: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
    kindDirect: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
    kindText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    body: { padding: 16, gap: 12, paddingBottom: 28 },
    bigTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 17 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    empty: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    desc: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 21 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 16, padding: 14, gap: 8 },
    cardOk: { borderColor: 'rgba(16, 185, 129, 0.55)' },
    cardBest: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    cardWarn: { borderColor: 'rgba(245, 158, 11, 0.55)' },
    dim: { opacity: 0.55 },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
    timing: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    cell: { flex: 1, alignItems: 'center', gap: 3 },
    cellLabel: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    cellValue: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    divider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.borderColor },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    factIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    factLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, width: 92 },
    factValue: { flex: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    map: { borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    pricePin: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff' },
    pricePinBest: { backgroundColor: Colors.success },
    pricePinText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
    garagePin: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    pinEmoji: { fontSize: 15 },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
