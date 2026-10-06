import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, EmptyState, FONTS, GlassIcon, Icon, SwipeCard, themedStyles, vehicleIcon, type IconName } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { BookingActions, ServiceModeNote, WorkshopStatus } from '../components/BookingActions';
import { JobDetailView, type DetailTarget } from '../components/JobDetailView';
import { PartsStatusLine } from '../components/PartsStatusLine';
import { PartsRequestSheet } from '../components/PartsRequestSheet';
import { useParts } from '../context/PartsContext';
import { formatDate, formatTime, isSameDay, money } from '../utils/format';
import type { Booking } from '../types';

type Segment = 'upcoming' | 'completed';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;


const dayLabel = (t: number) => {
  const now = Date.now();
  if (isSameDay(t, now)) return 'අද';
  if (isSameDay(t, now + 24 * 60 * 60 * 1000)) return 'හෙට';
  return formatDate(t);
};

export const ScheduleScreen: React.FC<{ onOpenParts: (requestId: string) => void }> = ({ onOpenParts }) => {
  const { bookings } = useGarage();
  const { requestFor, toOrderFor } = useParts();
  // Parts only for lines the owner approved (or named in the post), or once a request exists.
  // SOS parts are handled after the roadside job.
  const showParts = (b: Booking) => b.source !== 'sos' && (!!requestFor(b.id) || !b.progress || toOrderFor(b).length > 0);
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [partsFor, setPartsFor] = useState<Booking | null>(null);
  // Follows the live booking, so starting or finishing work updates the open details.
  const detail: DetailTarget | null = useMemo(() => {
    const b = bookings.find((x) => x.id === detailId);
    return b ? { kind: 'booking', booking: b } : null;
  }, [bookings, detailId]);
  const now = Date.now();

  const upcoming = bookings.filter((b) => b.status !== 'completed').sort((a, b) => a.scheduledAt - b.scheduledAt);
  const completed = bookings.filter((b) => b.status === 'completed').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const today = completed.filter((b) => b.completedAt && isSameDay(b.completedAt, now)).reduce((s, b) => s + b.price, 0);
  const week = completed.filter((b) => b.completedAt && now - b.completedAt < WEEK_MS).reduce((s, b) => s + b.price, 0);

  const segments: { id: Segment; label: string; icon: IconName; count: number }[] = [
    { id: 'upcoming', label: 'ඉදිරියට', icon: 'clock', count: upcoming.length },
    { id: 'completed', label: 'සම්පූර්ණ', icon: 'check-circle', count: completed.length },
  ];

  const card = (b: Booking) => {
    const when = b.status === 'completed' ? (b.completedAt ?? b.scheduledAt) : b.scheduledAt;
    const media = [b.job?.photos?.length && `📷 ${b.job.photos.length}`, b.job?.voiceNotes?.length && `🎙️ ${b.job.voiceNotes.length}`].filter(Boolean).join('  ');
    return (
      <SwipeCard key={b.id} style={[styles.card, b.status === 'inProgress' && styles.cardActive]} onOpen={() => setDetailId(b.id)}>
        <Pressable style={styles.row} onPress={() => setDetailId(b.id)} accessibilityLabel={`${b.title} details`}>
          <GlassIcon emoji={b.icon} />
          <View style={styles.flex1}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{b.title}</Text>
              <View style={[styles.source, b.source === 'sos' ? styles.sourceSos : b.source === 'direct' ? styles.sourceDirect : styles.sourceBid]}>
                <Text style={[styles.sourceText, { color: b.source === 'sos' ? Colors.errorText : b.source === 'direct' ? Colors.success : Colors.primary }]}>
                  {b.source === 'sos' ? 'SOS' : b.source === 'direct' ? 'ඍජු' : 'ලංසු'}
                </Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {vehicleIcon(b.vehicle.type)} {b.vehicle.name} · {b.vehicle.plate} · {b.customer.name}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>{money(b.price)}</Text>
            <Text style={styles.detailsLink}>විස්තර ›</Text>
          </View>
        </Pressable>

        <View style={styles.chips}>
          <Chip text={`📅 ${dayLabel(when)} · ${formatTime(when)}`} />
          {b.progress?.warrantyUntil && <Chip text={`🛡️ වගකීම ${formatDate(b.progress.warrantyUntil)} දක්වා`} />}
          {!!media && <Chip text={media} />}
          {b.calloutOnly && <Chip text="🚐 පැමිණීමේ ගාස්තුව පමණි" />}
        </View>

        {b.status === 'completed' ? (
          <View style={styles.rowBetween}>
            <Text style={[styles.statusText, { color: Colors.successText }]}>✓ සම්පූර්ණයි</Text>
            {!!b.rating && <Text style={styles.stars}>{'★'.repeat(b.rating)}{'☆'.repeat(5 - b.rating)}</Text>}
          </View>
        ) : (
          <>
            <WorkshopStatus booking={b} />
            <ServiceModeNote booking={b} />
            {showParts(b) && <PartsStatusLine booking={b} onRequest={() => setPartsFor(b)} onOpen={onOpenParts} />}
            <BookingActions booking={b} />
          </>
        )}
      </SwipeCard>
    );
  };

  const list = segment === 'upcoming' ? upcoming : completed;

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <Stat value={money(today)} label="අද ආදායම" color={Colors.success} />
        <Stat value={money(week)} label="දින 7 ආදායම" color={Colors.primary} />
        <Stat value={String(completed.length)} label="සම්පූර්ණ රැකියා" color={Colors.warning} />
      </View>

      <View style={styles.tabBar}>
        {segments.map((t) => {
          const active = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)}>
              <Icon name={t.icon} size={15} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {list.length > 0 && <Text style={styles.hint}>⇆ කාඩ්පතක් තට්ටු කරන්න හෝ පැත්තට ස්වයිප් කරන්න — රැකියාවේ සම්පූර්ණ විස්තර සහ පාරිභෝගිකයා</Text>}
      {list.length === 0 ? (
        segment === 'upcoming' ? (
          <EmptyState icon="📅" title="ඉදිරි වෙන් කිරීම් නැත" text="ඔබ දිනූ ලංසු වෙන් කිරීම් ලෙස මෙහි පෙන්වනු ඇත." />
        ) : (
          <EmptyState icon="✅" title="සම්පූර්ණ කළ රැකියා නැත" text="අවසන් කළ රැකියා සහ ශ්‍රේණිගත කිරීම් මෙහි පෙන්වනු ඇත." />
        )
      ) : (
        list.map(card)
      )}
      <PartsRequestSheet booking={partsFor} onClose={() => setPartsFor(null)} />
      <JobDetailView target={detail} onClose={() => setDetailId(null)} renderActions={(t) => (t.kind === 'booking' ? <BookingActions booking={t.booking} /> : null)} />
    </ScrollView>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Chip: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    tabBar: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      backgroundColor: Colors.bgCard,
    },
    tabActive: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.5)' },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextActive: { color: Colors.primary },
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
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    cardActive: { borderColor: 'rgba(56, 189, 248, 0.55)', backgroundColor: 'rgba(56, 189, 248, 0.06)' },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    source: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 },
    sourceSos: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    sourceBid: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    sourceDirect: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    sourceText: { fontSize: 9.5, fontWeight: '800' },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    priceCol: { alignItems: 'flex-end', gap: 2 },
    detailsLink: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill, maxWidth: '100%' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    stars: { fontSize: 14, color: Colors.warning, letterSpacing: 2 },
  })
);
