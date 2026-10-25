import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, EmptyState, FONTS, RELATION_HELP, RELATION_LABEL, RELATION_PRIVACY, RelationSummary, RelationTag, categoryInfo, getThemeMode, relationLevel, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { useWorkshops } from '../context/WorkshopContext';
import { useVehicles } from '../context/VehiclesContext';
import { useBookings } from '../context/BookingsContext';
import { formatDate, money } from '../utils/format';

type GarageRef = { id?: string; name: string };

/**
 * The owner's record with a garage: the jobs it finished for them (newest first), how many are running now, how many bookings fell through, and
 * where they stand (new, returning, regular, lapsed). The garage is told by its id; the name is only a fallback for a record that has no id.
 */
export const useGarageHistory = (garage: GarageRef) => {
  const { workshops } = useWorkshops();
  const { bookings } = useBookings();
  return useMemo(() => {
    const same = (id: string | undefined, name: string) => (id && garage.id ? id === garage.id : name === garage.name);
    const mine = Object.values(workshops).filter((w) => same(w.garageId, w.garageName));
    const done = mine.filter((w) => w.progress.stage === 'closed').sort((a, b) => (b.progress.closedAt ?? 0) - (a.progress.closedAt ?? 0));
    const running = mine.filter((w) => w.progress.stage !== 'closed' && w.progress.stage !== 'declined').length;
    const cancelled = bookings.filter((b) => same(b.garage.id, b.garage.name) && (b.status === 'cancelled' || b.status === 'declined')).length;
    const level = relationLevel(done.map((w) => w.progress.closedAt ?? w.scheduledAt));
    return { done, running, cancelled, level };
  }, [workshops, bookings, garage.id, garage.name]);
};

/**
 * A line shown wherever the owner is about to choose a garage (a booking, a bid): whether they have used this garage before. With earlier jobs it
 * opens their record with that garage; with none it says this would be the first time.
 */
export const GarageHistoryTag: React.FC<{ garage: GarageRef; /** Without the line about the last job under the tag (in a card's header). */ compact?: boolean; /** Only the tag, or only the line about the last job (the booking form puts the tag in front of the garage's name and the line under the card). */ part?: 'tag' | 'line' }> = ({ garage, compact, part }) => {
  const { done, running, level } = useGarageHistory(garage);
  const [open, setOpen] = useState(false);
  const used = done.length > 0 || running > 0;
  const last = done[0]?.progress.closedAt;
  const lastJob = done[0] ? (done[0].title ?? categoryInfo(done[0].categoryId).name) : undefined;
  return (
    <>
      {part !== 'line' && <RelationTag level={level} count={done.length} onPress={used ? () => setOpen(true) : undefined} accessibilityLabel={used ? `${RELATION_LABEL[level]}: your record with ${garage.name}` : `First time with ${garage.name}`} />}
      {/* More than the tag: what the last job was, and when. */}
      {part !== 'tag' && !compact && !!lastJob && !!last && <Text style={styles.lastLine} numberOfLines={1}>අවසන් වතාව: {lastJob} · {formatDate(last)}</Text>}
      {part !== 'line' && <GarageHistorySheet visible={open} onClose={() => setOpen(false)} garage={garage} />}
    </>
  );
};

/** Which garages the owner has used before (finished a job with): for the "garages I have used" filter on the bids. */
export const useUsedGarages = () => {
  const { workshops } = useWorkshops();
  return useMemo(() => {
    const closed = Object.values(workshops).filter((w) => w.progress.stage === 'closed');
    const ids = new Set(closed.map((w) => w.garageId).filter(Boolean));
    const names = new Set(closed.map((w) => w.garageName));
    return (g: GarageRef) => (g.id && ids.has(g.id)) || names.has(g.name);
  }, [workshops]);
};

/** The owner's record with one garage: each job it finished for them, with the date, the vehicle, what it cost, the warranty and their rating. */
export const GarageHistorySheet: React.FC<{ visible: boolean; onClose: () => void; garage: GarageRef }> = ({ visible, onClose, garage }) => {
  const { done, running, cancelled, level } = useGarageHistory(garage);
  const garageName = garage.name;
  const { findVehicle } = useVehicles();
  const total = done.reduce((n, w) => n + (w.progress.handover?.bill.total ?? w.agreedPrice), 0);
  const times = done.map((w) => w.progress.closedAt ?? w.scheduledAt);
  const rated = done.map((w) => w.review?.rating).filter((x): x is number => !!x);

  return (
    <Sheet visible={visible} title={garageName} subtitle="ඔබගේ වාර්තාව — මෙම ගරාජයෙන් කළ වැඩ" onClose={onClose}>
      <View style={styles.levelRow}>
        <RelationTag level={level} />
      </View>
      {done.length > 0 && <RelationSummary jobs={done.length} since={Math.min(...times)} last={Math.max(...times)} total={total} avgRating={rated.length ? rated.reduce((n, x) => n + x, 0) / rated.length : undefined} />}
      {running > 0 && <Text style={styles.running}>🔧 දැනට මෙම ගරාජය සමඟ පවතින රැකියා {running}</Text>}
      {cancelled > 0 && <Text style={styles.running}>✕ අවලංගු වූ / ප්‍රතික්ෂේප වූ වෙන්කිරීම් {cancelled}</Text>}
      {done.length === 0 ? (
        <EmptyState icon="🧾" title="සම්පූර්ණ කළ රැකියා නැත" text="මෙම ගරාජය ඔබගේ රැකියාවක් අවසන් කළ විට එය මෙහි වාර්තා වේ." />
      ) : (
        done.map((w) => {
          const v = w.vehicleId ? findVehicle(w.vehicleId) : undefined;
          const rating = w.review?.rating;
          return (
            <View key={w.id} style={styles.row}>
              <Text style={styles.icon}>{w.icon ?? categoryInfo(w.categoryId).icon}</Text>
              <View style={styles.flex1}>
                <Text style={styles.title} numberOfLines={1}>
                  {w.title ?? categoryInfo(w.categoryId).name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {formatDate(w.progress.closedAt ?? w.scheduledAt)}
                  {v ? ` · ${v.name} · ${v.plate}` : ''}
                </Text>
                <Text style={styles.sub}>
                  🛡️ මාස {w.warrantyMonths} වගකීම{rating ? ` · ${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}` : ''}
                </Text>
              </View>
              <Text style={styles.price}>{money(w.progress.handover?.bill.total ?? w.agreedPrice)}</Text>
            </View>
          );
        })
      )}
      <Text style={styles.help}>{RELATION_HELP}</Text>
      <Text style={styles.help}>🔒 {RELATION_PRIVACY}</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    levelRow: { flexDirection: 'row' },
    lastLine: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 4 },
    help: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19 },
    tag: { alignSelf: 'flex-start', paddingHorizontal: 6, height: 18, justifyContent: 'center', borderRadius: 9, borderWidth: 1, maxWidth: '100%' },
    tagUsed: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    tagNew: { backgroundColor: Colors.subtleFill, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tagText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
    tagTextUsed: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    tagTextNew: { color: Colors.textMuted },
    totals: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    totalText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    running: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.warning },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', backgroundColor: Colors.bgCard },
    icon: { fontSize: 22, width: 30, textAlign: 'center' },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  })
);
