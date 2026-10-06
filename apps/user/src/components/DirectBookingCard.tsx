import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, directionsUrl, FONTS, GlassIcon, themedStyles, vehicleIcon } from '@ongarage/shared';
import { useBookings } from '../context/BookingsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useUserLocation } from '../context/LocationContext';
import { countdown, formatDate, formatTime, money } from '../utils/format';
import type { DirectBooking } from '../types';

const ENDED = { declined: 'ප්‍රතික්ෂේප විය', expired: 'ගරාජය පිළිතුරු දුන්නේ නැත', cancelled: 'ඔබ අවලංගු කළා' } as const;

/** A direct booking as the owner follows it: waiting, a proposed time, confirmed, or ended. */
export const DirectBookingCard: React.FC<{ booking: DirectBooking; onBookAgain: (b: DirectBooking) => void; onOpen?: () => void }> = ({ booking: b, onBookAgain, onOpen }) => {
  const { acceptProposal, declineProposal, cancelBooking } = useBookings();
  const { findVehicle } = useVehicles();
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
  const media = [b.photos.length && `📷 ${b.photos.length}`, b.voiceNotes.length && `🎙️ ${b.voiceNotes.length}`].filter(Boolean).join('  ');

  return (
    <View style={[styles.card, b.status === 'confirmed' && styles.confirmed, b.status === 'proposed' && styles.proposed, ended && styles.ended]}>
      <Pressable style={styles.row} onPress={onOpen} disabled={!onOpen} accessibilityLabel={`${cat.name} booking details`}>
        <GlassIcon emoji={cat.icon} />
        <View style={styles.flex1}>
          <Text style={styles.title}>
            {cat.name}
            {b.service ? ` · ${b.service}` : ''}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {b.garage.name} · {vehicleIcon(v.type)} {v.name}
          </Text>
        </View>
        <View style={styles.tagCol}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>📅 ඍජු</Text>
          </View>
          {!!onOpen && <Text style={styles.link}>විස්තර ›</Text>}
        </View>
      </Pressable>

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

      {b.status === 'confirmed' && b.scheduledAt && (
        <>
          <View style={styles.rowBetween}>
            <Text style={[styles.state, { color: Colors.successText }]}>
              ✓ තහවුරුයි · {formatDate(b.scheduledAt)} · {formatTime(b.scheduledAt)}
            </Text>
            {!!b.estimate && <Text style={styles.price}>~{money(b.estimate)}</Text>}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>{b.doorstep ? '🚛 නියමිත වේලාවට ගරාජය ඔබ වෙත පැමිණේ' : `🏠 වාහනය ගෙන යන්න: ${b.garage.address}`}</Text>
            <Text style={styles.sub}>
              {b.doorstep ? 'පැමිණීමට පෙර ගරාජය ඔබව අමතයි.' : `මගදී උපදෙස් අවශ්‍ය නම් ගරාජය අමතන්න · ${b.garage.phone}`}
              {b.garageNote ? ` · “${b.garageNote}”` : ''}
            </Text>
          </View>
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

      {!!media && !ended && <Text style={styles.sub}>ඔබ එවූ: {media}</Text>}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    confirmed: { borderColor: 'rgba(16, 185, 129, 0.5)' },
    proposed: { borderColor: 'rgba(245, 158, 11, 0.55)' },
    ended: { opacity: 0.7 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    tagCol: { alignItems: 'flex-end', gap: 4 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    tagText: { fontSize: 10, fontWeight: '800', color: Colors.successText },
    state: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    price: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.primary },
    box: { padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 2 },
    boxTitle: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    cancel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    link: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
