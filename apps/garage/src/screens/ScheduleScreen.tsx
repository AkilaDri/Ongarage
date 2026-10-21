import { CustomerHistoryTag } from '../components/CustomerHistory';
import { onOpenBookingDetail } from '../utils/scheduleSignal';
import { VehicleSearchSheet } from '../components/VehicleSearchSheet';
import { CategoryArt } from '../components/CategoryArt';
import { SosLineIcon, ScheduleLineIcon, ReceiptLineIcon } from '@ongarage/shared';
import { VehicleLabel } from '@ongarage/shared';
import { chatDockOffset } from '../utils/chatDock';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoChip, fittingLabel, Colors, EmptyState, FONTS, Icon, JobReportSheet, LkPlate, SwipeCard, themedStyles, vehicleIcon, type IconName, softFill, softShadow, getThemeMode, PinnedEdge, usePinnedEdge } from '@ongarage/shared';
import { pageBg } from '../utils/pageBg';
import { elevation1, outline } from '../utils/material';
import { useGarage } from '../context/GarageContext';
import { ChatButton } from '../components/ChatButton';
import { CancelRequestNote } from '../components/CancelRequestNote';
import { PaymentNote } from '../components/PaymentNote';
import { CustomerRatingNote } from '../components/CustomerRatingNote';
import { CustomerBadge } from '../components/CustomerBadge';
import { BookingActions, ServiceModeNote, WorkshopStatus } from '../components/BookingActions';
import { JobDetailView, type DetailTarget } from '../components/JobDetailView';
import { PartsStatusLine } from '../components/PartsStatusLine';
import { PartsRequestSheet } from '../components/PartsRequestSheet';
import { useParts } from '../context/PartsContext';
import { formatDate, formatTime, isSameDay, money } from '../utils/format';
import type { Booking } from '../types';

type Segment = 'upcoming' | 'completed' | 'cancelled';


const dayLabel = (t: number) => {
  const now = Date.now();
  if (isSameDay(t, now)) return 'අද';
  if (isSameDay(t, now + 24 * 60 * 60 * 1000)) return 'හෙට';
  return formatDate(t);
};

export const ScheduleScreen: React.FC<{ onOpenParts: (requestId: string) => void; shift: Animated.Value; onScrollY: (y: number) => void }> = ({ onOpenParts, shift, onScrollY }) => {
  const { progress: edge, scrollProps } = usePinnedEdge();
  // The tab bar and the list move up together as the list scrolls (App moves the title band by the same shift).
  const [barH, setBarH] = useState(62);
  // The chat icon sits under the pinned bar once the header has folded away.
  useEffect(() => {
    chatDockOffset.setValue(barH);
    return () => chatDockOffset.setValue(0);
  }, [barH]);
  const { bookings } = useGarage();
  const { requestFor, toOrderFor } = useParts();
  // Parts only for lines the owner approved (or named in the post), or once a request exists.
  // SOS parts are handled after the roadside job.
  // (No parts requests while a cancellation request holds the job.)
  const showParts = (b: Booking) => b.source !== 'sos' && !b.progress?.cancelRequest && (!!requestFor(b.id) || !b.progress || toOrderFor(b).length > 0);
  const [segment, setSegment] = useState<Segment>('upcoming');
  // The reports of a job (diagnosis, extra work, handover) in one popup, from its card.
  const [reportFor, setReportFor] = useState<Booking | null>(null);
  // Which kind of job: all, won bids, direct bookings or SOS.
  const [source, setSource] = useState<Booking['source'] | 'all'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  // The Search chip opens a window that looks a vehicle up by its registration number and shows every job done on it.
  const [searchOpen, setSearchOpen] = useState(false);
  // The calendar in the title bar opens a booking's details here.
  useEffect(() => onOpenBookingDetail((id) => setDetailId(id)), []);
  const [partsFor, setPartsFor] = useState<Booking | null>(null);
  // Follows the live booking, so starting or finishing work updates the open details.
  const detail: DetailTarget | null = useMemo(() => {
    const b = bookings.find((x) => x.id === detailId);
    return b ? { kind: 'booking', booking: b } : null;
  }, [bookings, detailId]);
  const now = Date.now();

  const upcoming = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled').sort((a, b) => a.scheduledAt - b.scheduledAt);
  const cancelledList = bookings.filter((b) => b.status === 'cancelled').sort((a, b) => (b.cancelled?.at ?? 0) - (a.cancelled?.at ?? 0));
  const completed = bookings.filter((b) => b.status === 'completed').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const segments: { id: Segment; label: string; icon: IconName; count: number }[] = [
    { id: 'upcoming', label: 'ඉදිරියට', icon: 'clock', count: upcoming.length },
    { id: 'completed', label: 'සම්පූර්ණ', icon: 'check-circle', count: completed.length },
    { id: 'cancelled', label: 'අවලංගු', icon: 'x', count: cancelledList.length },
  ];

  const card = (b: Booking) => {
    const when = b.status === 'completed' ? (b.completedAt ?? b.scheduledAt) : b.scheduledAt;
    // The voice notes sit on the vehicle line (model, number plate, job type, voice); the chips keep the photos.
    const media = b.job?.photos?.length ? `📷 ${b.job.photos.length}` : '';
    return (
      <SwipeCard key={b.id} style={[styles.card, b.status === 'inProgress' && styles.cardActive]} onOpen={() => setDetailId(b.id)}>
        {/* A cancelled job keeps its chat (the OnChat button in the card's top right corner); a completed one has none. */}
        {b.status === 'cancelled' && (
          <View style={styles.chatCorner}>
            <ChatButton booking={b} size={44} />
          </View>
        )}
        <Pressable onPress={() => setDetailId(b.id)} accessibilityLabel={`${b.title} details`}>
        {/* Laid out like a Facebook post: a round picture, the customer's name in bold, and the time and the job in grey under it; then the body. */}
        <View style={styles.cardHeader}>
          <CategoryArt emoji={b.icon} size={48} />
          <View style={styles.flex1}>
            <View style={styles.nameRow}>
              <Text style={[styles.postName, styles.nameShrink]} numberOfLines={1}>
                {b.customer.name}
              </Text>
              <CustomerHistoryTag customer={b.customer} />
            </View>
            <Text style={styles.postMeta} numberOfLines={1}>
              {dayLabel(when)} · {formatTime(when)}
            </Text>
          </View>
          <View style={[styles.priceCol, b.status === 'cancelled' && { paddingTop: 44 }]}>
            {/* Three dots in place of the words "විස්තර ›": touching them opens the job's details (so does the card). */}
            <Pressable style={styles.dotsBtn} onPress={() => setDetailId(b.id)} hitSlop={10} accessibilityLabel={`${b.title} details`}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </Pressable>
            <Text style={styles.price}>{money(b.price)}</Text>
          </View>
        </View>

        <View style={styles.postBody}>
          <View style={[styles.row, styles.oneLine]}>
            <LkPlate plate={b.vehicle.plate} stacked={b.vehicle.type === 'Motorbike'} small fontSize={11.5} />
            <VehicleLabel type={b.vehicle.type} style={styles.postText} numberOfLines={1}>
              {b.vehicle.name}
            </VehicleLabel>
            <View style={[styles.source, b.source === 'sos' ? styles.sourceSos : b.source === 'direct' ? styles.sourceDirect : styles.sourceBid]}>
              <Text style={[styles.sourceText, { color: b.source === 'sos' ? Colors.errorText : b.source === 'direct' ? Colors.success : Colors.primary }]}>
                {b.source === 'sos' ? 'SOS' : b.source === 'direct' ? 'ඍජු' : 'ලංසු'}
              </Text>
            </View>
            {!!b.job?.voiceNotes?.length && <Text style={styles.voiceMark}>🎙️ {b.job.voiceNotes.length}</Text>}
          </View>
          {/* The subject of the job (its category and what it is) comes under the vehicle line, as the post's own text does. */}
          <Text style={styles.postSubject}>{b.title}</Text>
        </View>

        <View style={[styles.chips, styles.cardBody]}>
          {!!b.job?.fitting && <Chip text={fittingLabel(b.job.fitting)} />}
          {!!b.travelFee && <Chip text={`🚗 ගමන් ගාස්තුව ඇතුළුව ${money(b.travelFee)}`} />}
          {!!(b.progress?.diagnosis || b.progress?.extras?.length || b.progress?.handover) && (
            <Pressable style={styles.reportChip} onPress={() => setReportFor(b)} accessibilityLabel={`Reports ${b.title}`}>
              <Text style={styles.reportChipText}>📋 වාර්තා බලන්න</Text>
            </Pressable>
          )}
          {b.progress?.warrantyUntil && <Chip text={`🛡️ වගකීම ${formatDate(b.progress.warrantyUntil)} දක්වා`} />}
          {!!media && <Chip text={media} />}
          {b.calloutOnly && <Chip text="🚐 පැමිණීමේ ගාස්තුව පමණි" />}
        </View>
        </Pressable>

        {b.status === 'cancelled' ? (
          <View style={[styles.cardActions, styles.stack]} accessibilityLabel="Cancelled by the owner">
            <Text style={[styles.statusText, { color: Colors.errorText }]}>✕ අයිතිකරු අවලංගු කළා</Text>
            {!!b.cancelled && (
              <>
                <Text style={styles.sub}>හේතුව: {b.cancelled.reason}{b.cancelled.note ? ` · “${b.cancelled.note}”` : ''}</Text>
                {!!b.cancelled.rating && <Text style={styles.stars}>{'★'.repeat(b.cancelled.rating)}{'☆'.repeat(5 - b.cancelled.rating)} <Text style={styles.sub}>(අයිතිකරුගේ ශ්‍රේණිගත කිරීම)</Text></Text>}
                {b.cancelled.compensation !== undefined && <Text style={[styles.sub, { color: Colors.successText }]}>💰 ඔබට ලැබෙන වන්දිය {money(b.cancelled.compensation)}{b.cancelled.workDone ? ` · ${b.cancelled.workDone}` : ''}</Text>}
                {!!b.cancelled.feeNote && <Text style={styles.sub}>ℹ️ {b.cancelled.feeNote}</Text>}
                <Text style={styles.sub}>{dayLabel(b.cancelled.at)} · {formatTime(b.cancelled.at)}</Text>
              </>
            )}
          </View>
        ) : b.status === 'completed' ? (
          <View style={[styles.cardActions, styles.stack]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.statusText, { color: Colors.successText }]}>✓ සම්පූර්ණයි</Text>
              {!!b.rating && <Text style={styles.stars}>{'★'.repeat(b.rating)}{'☆'.repeat(5 - b.rating)}</Text>}
            </View>
            <PaymentNote booking={b} />
            <CustomerRatingNote booking={b} />
          </View>
        ) : (
          <View style={[styles.cardActions, styles.stack]}>
            <CancelRequestNote booking={b} />
            <WorkshopStatus booking={b} />
            <ServiceModeNote booking={b} />
            {showParts(b) && <PartsStatusLine booking={b} onRequest={() => setPartsFor(b)} onOpen={onOpenParts} />}
            <BookingActions booking={b} />
          </View>
        )}
      </SwipeCard>
    );
  };

  const shown = segment === 'upcoming' ? upcoming : segment === 'cancelled' ? cancelledList : completed;
  const bySource = source !== 'all' ? shown.filter((b) => b.source === source) : shown;
  const list = bySource;
  const sources: { id: Booking['source'] | 'all'; label: string; icon: React.ComponentType<{ active: boolean; size?: number }>; count: number }[] = [
    { id: 'sos', label: 'SOS', icon: SosLineIcon, count: shown.filter((b) => b.source === 'sos').length },
    { id: 'direct', label: 'Booking', icon: ScheduleLineIcon, count: shown.filter((b) => b.source === 'direct').length },
    { id: 'bid', label: 'ලංසු', icon: ReceiptLineIcon, count: shown.filter((b) => b.source === 'bid').length },
  ];

  return (
    <View style={styles.flex1}>
      <Animated.View style={styles.tabBar} onLayout={(e) => e.nativeEvent.layout.height > 0 && setBarH(e.nativeEvent.layout.height)}>
        <PinnedEdge progress={edge} />
        <View style={styles.segRow}>
          {segments.map((t) => {
            const active = segment === t.id;
            return (
              <Pressable key={t.id} style={[styles.segChip, active && styles.segChipOn]} onPress={() => setSegment(t.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t.label}>
                <Icon name={t.icon} size={16} color={active ? (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8') : Colors.textMuted} />
                <Text style={[styles.segChipText, active && styles.segChipTextOn]}>{t.label}</Text>
                {t.id === 'upcoming' && t.count > 0 && (
                  <View style={styles.tabCount}>
                    <Text style={styles.tabCountText}>{t.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {/* Under both tabs: chips for the kind of job (all, SOS, direct, bids). They are pills, so they read apart from the two tabs above. */}
        {(
          <View style={styles.sourceRow}>
            {sources.map((c) => {
              const on = source === c.id;
              return (
                <Pressable key={c.id} style={[styles.sourceChip, on && styles.sourceChipOn]} onPress={() => setSource(on ? 'all' : c.id)} accessibilityLabel={`Show ${c.label} jobs`} accessibilityState={{ selected: on }}>
                  <c.icon active={on} size={18} />
                  <Text style={[styles.sourceChipText, on && styles.sourceChipTextOn]}>{c.label}</Text>
                  {segment === 'upcoming' && c.count > 0 && (
                    <View style={[styles.sourceCount, on && styles.sourceCountOn]}>
                      <Text style={[styles.sourceCountText, on && styles.sourceCountTextOn]}>{c.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Pressable style={styles.sourceChip} onPress={() => setSearchOpen(true)} accessibilityLabel="Search a vehicle">
              <Text style={styles.searchChipIcon}>🔎</Text>
              <Text style={styles.sourceChipText}>Search</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
      <Animated.View style={[styles.listLayer, { top: barH, bottom: 0 }]}>
      <ScrollView
        style={styles.flex1}
        {...scrollProps}
        onScroll={(e) => {
          scrollProps.onScroll(e);
          onScrollY(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >

      {list.length === 0 ? (
        source !== 'all' && shown.length > 0 ? (
          <EmptyState icon="🔎" title="මෙම වර්ගයේ රැකියා නැත" text="වෙනත් වර්ගයක් තෝරන්න, නැත්නම් සියල්ල බලන්න." />
        ) : segment === 'cancelled' ? (
          <EmptyState icon="✕" title="අවලංගු කළ රැකියා නැත" text="අයිතිකරුවෙකු රැකියාවක් අවලංගු කළ විට එය හේතුව සමඟ මෙහි පෙන්වයි." />
        ) : segment === 'upcoming' ? (
          <EmptyState icon="📅" title="ඉදිරි වෙන් කිරීම් නැත" text="ඔබ දිනූ ලංසු වෙන් කිරීම් ලෙස මෙහි පෙන්වනු ඇත." />
        ) : (
          <EmptyState icon="✅" title="සම්පූර්ණ කළ රැකියා නැත" text="අවසන් කළ රැකියා සහ ශ්‍රේණිගත කිරීම් මෙහි පෙන්වනු ඇත." />
        )
      ) : (
        list.map(card)
      )}
      <VehicleSearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} bookings={bookings} onOpen={setDetailId} />
      <PartsRequestSheet booking={partsFor} onClose={() => setPartsFor(null)} />
      <JobReportSheet visible={!!reportFor} onClose={() => setReportFor(null)} subject={{ title: reportFor?.title ?? '', vehicle: reportFor ? `${reportFor.vehicle.name} · ${reportFor.vehicle.plate}` : undefined }} progress={reportFor?.progress} />
      <JobDetailView target={detail} onClose={() => setDetailId(null)} renderActions={(t) => (t.kind === 'booking' ? <BookingActions booking={t.booking} /> : null)} />
      </ScrollView>
      </Animated.View>
    </View>
  );
};

const Chip: React.FC<{ text: string }> = ({ text }) => <InfoChip text={text} />;

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    searchChipIcon: { fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chatCorner: { position: 'absolute', top: 6, right: 8, zIndex: 2 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    body: { paddingVertical: 16, paddingHorizontal: 6, gap: 12, paddingBottom: 250 },
    // One soft track with a raised active segment, a red count on its corner (same as the Jobs tab).
    // The bar sits on top of the list layer, which starts under it and reaches one bar-height past the bottom.
    listLayer: { position: 'absolute', left: 0, right: 0 },
    tabBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, paddingHorizontal: 6, paddingTop: 22, paddingBottom: 6, backgroundColor: pageBg() },
    // The two views are two separate chips, bigger than the filter chips under them: each its own outlined chip, the selected one tonal blue.
    segRow: { flexDirection: 'row', gap: 8 },
    segChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, ...elevation1() },
    segChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    segChipText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    segChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, paddingRight: 8 },
    sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 12, paddingRight: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    sourceChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    sourceChipIcon: { fontSize: 14 },
    sourceChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    sourceChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    sourceCount: { position: 'absolute', top: -8, right: -2, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: pageBg(), alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    sourceCountOn: { backgroundColor: '#1a73e8' },
    sourceCountZero: { opacity: 0.55 },
    sourceCountText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    sourceCountTextOn: {},
    tabCount: { position: 'absolute', top: -9, right: 6, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: pageBg(), alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    tabCountText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    // Material cards: 12px corners, a thin outline, light elevation; a header, a body of chips and an action area.
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', borderRadius: 12, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 },
    cardActive: { borderColor: Colors.primary },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    cardBody: { paddingHorizontal: 16, paddingBottom: 14 },
    cardActions: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    plateRow: { marginTop: 6 },
    stack: { gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe' },
    avatarEmoji: { fontSize: 20 },
    oneLine: { flexWrap: 'nowrap', gap: 8 },
    voiceMark: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    nameShrink: { flexShrink: 1 },
    postName: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    postMeta: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    postBody: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    postSubject: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 22 },
    postText: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 22 },
    cardTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    source: { paddingHorizontal: 8, height: 20, justifyContent: 'center', borderRadius: 6 },
    sourceSos: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    sourceBid: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    sourceDirect: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    sourceText: { fontSize: 10.5, fontWeight: '800' },
    price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceCol: { alignItems: 'flex-end', gap: 2 },
    dotsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 6 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textMuted },
    detailsLink: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    hint: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reportChip: { paddingHorizontal: 10, height: 28, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    reportChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    chip: { paddingHorizontal: 10, height: 28, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', maxWidth: '100%' },
    chipText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    statusText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    stars: { fontSize: 14, color: Colors.warning, letterSpacing: 2 },
  })
);
