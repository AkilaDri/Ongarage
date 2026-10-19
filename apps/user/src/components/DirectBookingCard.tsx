import { elevation1, outline } from '../utils/material';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, directionsUrl, FONTS, getThemeMode, themedStyles, vehicleIcon } from '@ongarage/shared';
import { useBookings } from '../context/BookingsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useWorkshops } from '../context/WorkshopContext';
import { WorkshopTracker } from './workshop/WorkshopTracker';
import { CategoryPhoto } from './home/CategoryPhoto';
import { VehicleBlock } from './VehicleBlock';
import { useUserLocation } from '../context/LocationContext';
import { countdown, formatDate, formatTime, money } from '../utils/format';
import type { DirectBooking } from '../types';

const ENDED = { declined: 'ප්‍රතික්ෂේප විය', expired: 'ගරාජය පිළිතුරු දුන්නේ නැත', cancelled: 'ඔබ අවලංගු කළා' } as const;

/** A direct booking as the owner follows it: waiting, a proposed time, confirmed, or ended. */
export const DirectBookingCard: React.FC<{ booking: DirectBooking; onBookAgain: (b: DirectBooking) => void; onOpen?: () => void }> = ({ booking: b, onBookAgain, onOpen }) => {
  const { acceptProposal, declineProposal, cancelBooking } = useBookings();
  const { findVehicle } = useVehicles();
  const { workshops } = useWorkshops();
  const user = useUserLocation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (b.status !== 'requested') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [b.status]);

  const cat = categoryInfo(b.categoryId);
  const v = findVehicle(b.vehicleId);
  const ended = b.status === 'declined' || b.status === 'expired' || b.status === 'cancelled';
  // A confirmed job the owner cancelled with the garage reads as ended too.
  const cancelledJob = !!workshops[b.id]?.progress.cancelled;
  // Once the garage has the vehicle, the workshop steps replace the "how to get there" details.
  const started = (workshops[b.id]?.progress.stage ?? 'booked') !== 'booked';
  // A finished job shows just its card: the step-by-step tracker is for running work (the details view has it all).
  const w = workshops[b.id];
  const finishedJob = w?.progress.stage === 'declined' || (w?.progress.stage === 'closed' && !!w.acknowledged);
  const media = [b.photos.length && `📷 ${b.photos.length}`, b.voiceNotes.length && `🎙️ ${b.voiceNotes.length}`].filter(Boolean).join('  ');

  return (
    <View style={[styles.card, b.status === 'confirmed' && styles.confirmed, b.status === 'proposed' && styles.proposed, (ended || cancelledJob) && styles.ended, finishedJob && !cancelledJob && styles.done]}>
      {/* The chat button sits in the very top right corner of the card. */}
      {(
        <View style={styles.iconRow}>
          <CategoryPhoto categoryId={b.categoryId} size={40} />
        </View>
      )}
      {finishedJob && !cancelledJob && (
        <>
          <View style={styles.headRow}>
            <Text style={styles.title}>
              {cat.name}
              {b.service ? ` · ${b.service}` : ''}
            </Text>
          </View>
          <View style={styles.divider} />
        </>
      )}
      <Pressable style={styles.row} onPress={onOpen} disabled={!onOpen} accessibilityLabel={`${cat.name} booking details`}>
        <View style={[styles.flex1, !(finishedJob && !cancelledJob) && styles.textClear]}>
          {!(finishedJob && !cancelledJob) && (
            <Text style={styles.title}>
              {cat.name}
              {b.service ? ` · ${b.service}` : ''}
            </Text>
          )}
          <View style={styles.garageLine}>
            <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
              {b.garage.name}
            </Text>
          </View>
          <VehicleBlock vehicle={v} />
        </View>
        <View style={[styles.tagCol, !(finishedJob && !cancelledJob) && styles.tagColIcons]}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>📅 ඍජු සේවා</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.divider} />

      {b.status === 'requested' && (
        <View style={styles.rowBetween}>
          <Text style={[styles.state, { color: Colors.warning }]}>● ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන් · {countdown(b.respondBy - now)}</Text>
          <Pressable onPress={() => cancelBooking(b.id)} hitSlop={6}>
            <Text style={styles.cancel}>අවලංගු කරන්න</Text>
          </Pressable>
        </View>
      )}

      {b.status === 'proposed' && b.proposal && (
        <>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>
              🕘 {b.garage.name} යෝජනා කරයි: {formatDate(b.proposal.at)} · {formatTime(b.proposal.at)}
            </Text>
            <Text style={styles.sub}>
              ඔබ ඉල්ලුවේ {formatDate(b.preferredAt)} · {formatTime(b.preferredAt)}
              {b.proposal.note ? ` — ${b.proposal.note}` : ''} · ඇස්තමේන්තුව {money(b.proposal.estimate)}
            </Text>
          </View>
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="වෙනත් ගරාජයක්" variant="ghost" compact onPress={() => declineProposal(b.id)} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label="පිළිගන්න" icon="✓" variant="success" compact onPress={() => acceptProposal(b.id)} />
            </View>
          </View>
        </>
      )}

      {b.status === 'confirmed' && b.scheduledAt && started && !finishedJob && <WorkshopTracker id={b.id} />}

      {b.status === 'confirmed' && b.scheduledAt && !started && (
        <>
          <WorkshopTracker id={b.id} />
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Text style={[styles.state, { color: Colors.successText }]}>
              ✓ තහවුරුයි · {formatDate(b.scheduledAt)} · {formatTime(b.scheduledAt)}
            </Text>
            {!!b.estimate && <Text style={styles.price}>~{money(b.estimate)}</Text>}
          </View>
          <View style={styles.divider} />
          <View style={styles.box}>
            <Text style={styles.boxTitle}>{b.doorstep ? '🚛 නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ' : `🏠 වාහනය ගෙන යන්න: ${b.garage.address}`}</Text>
            <Text style={styles.sub}>
              {b.doorstep ? 'පැමිණීමට පෙර ගරාජය ඔබව අමතයි.' : `මගදී උපදෙස් අවශ්‍ය නම් ගරාජය අමතන්න · ${b.garage.phone}`}
              {b.garageNote ? ` · “${b.garageNote}”` : ''}
            </Text>
          </View>
          {!b.doorstep && <ActionButton label="දිශාවන්" icon="🗺️" variant="primary" compact onPress={() => Linking.openURL(directionsUrl(b.garage.coords, user.coords))} />}
          <Text style={styles.hint}>අවසන් මිල ගරාජය වාහනය පරීක්ෂා කළ පසු, ඔබගේ අනුමැතියෙන් පමණක් තීරණය වේ.</Text>
        </>
      )}

      {ended && (
        <View style={styles.rowBetween}>
          <Text style={[styles.state, { color: Colors.textMuted }]}>
            ✕ {ENDED[b.status as keyof typeof ENDED]}
            {b.declineReason ? ` — ${b.declineReason}` : ''}
          </Text>
          {b.status !== 'cancelled' && (
            <Pressable onPress={() => onBookAgain(b)} hitSlop={6}>
              <Text style={styles.link}>වෙනත් ගරාජයක් ›</Text>
            </Pressable>
          )}
        </View>
      )}

      {!!media && !ended && <View style={styles.divider} />}
      {!!media && !ended && <Text style={styles.sub}>ඔබ එවූ: {media}</Text>}
      {/* The details link sits in the card's bottom right corner. */}
      {!!onOpen && (
        <Pressable onPress={onOpen} hitSlop={8} style={styles.detailsCorner} accessibilityLabel="Booking details">
          <Text style={styles.link}>විස්තර ›</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // Keeps the heading clear of the icons in the card's top right corner.
    textClear: { paddingRight: 56 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    garageLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconRow: { position: 'absolute', top: 6, right: 8, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
    // Room under the icons that sit in the card's corner.
    tagColIcons: { paddingTop: 44 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    detailsCorner: { alignSelf: 'flex-end' },
    // A finished job's heading row (beside the icon in the corner), with a full-width line under it.
    headRow: { minHeight: 40, justifyContent: 'center', paddingRight: 56 },
    divider: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    actions: { flexDirection: 'row', gap: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 12, padding: 12, gap: 12, ...elevation1() },
    // A state that needs the owner's eye keeps a coloured outline in either theme.
    confirmed: { borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.5)' },
    proposed: { borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.55)' },
    ended: { opacity: 0.7 },
    // A finished job: a tighter card.
    done: { padding: 16, gap: 12 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
    hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    tagCol: { alignItems: 'flex-end', gap: 4 },
    tag: { paddingHorizontal: 6, height: 18, justifyContent: 'center', borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    tagText: { fontSize: 11.5, fontWeight: '700', color: Colors.successText },
    state: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodySemiBold },
    price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    box: { padding: 12, borderRadius: 8, backgroundColor: Colors.subtleFill, gap: 2 },
    boxTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    cancel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
