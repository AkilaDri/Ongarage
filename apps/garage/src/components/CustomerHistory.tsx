import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClipboardLineIcon, ReceiptLineIcon, Colors, EmptyState, FONTS, RELATION_HELP, RELATION_LABEL, RELATION_PRIVACY, RelationSummary, RelationTag, getThemeMode, phoneKey, relationLevel, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { CategoryArt } from './CategoryArt';
import { useGarage } from '../context/GarageContext';
import { formatDate, money } from '../utils/format';
import type { Booking, Customer } from '../types';

/**
 * The garage's record with a customer: the jobs it finished for them (newest first), how many are running now, how many were cancelled, how many
 * ran into a dispute, and where they stand (new, returning, regular, lapsed). A customer is told by their id; with none, by their phone number.
 */
export const useCustomerHistory = (customer: Customer) => {
  const { bookings } = useGarage();
  return useMemo(() => {
    const key = phoneKey(customer.phone);
    const same = (c: Customer) => (c.id && customer.id ? c.id === customer.id : key ? phoneKey(c.phone) === key : c.name === customer.name);
    const mine = bookings.filter((b) => same(b.customer));
    const done = mine.filter((b) => b.status === 'completed').sort((a, b) => (b.completedAt ?? b.scheduledAt) - (a.completedAt ?? a.scheduledAt));
    const running = mine.filter((b) => b.status !== 'completed' && b.status !== 'cancelled').length;
    const cancelled = mine.filter((b) => b.status === 'cancelled').length;
    const disputes = mine.filter((b) => !!b.progress?.dispute).length;
    const level = relationLevel(done.map((b) => b.completedAt ?? b.scheduledAt));
    return { done, running, cancelled, disputes, level };
  }, [bookings, customer.id, customer.phone, customer.name]);
};

/**
 * A line shown wherever a customer's booking or bid reaches the garage: whether this garage has worked for them before. With earlier jobs it
 * opens the record of those jobs; with none it says they are new to the garage.
 */
export const CustomerHistoryTag: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { done, running, level } = useCustomerHistory(customer);
  const [open, setOpen] = useState(false);
  const known = done.length > 0 || running > 0;
  return (
    <>
      <RelationTag level={level} count={done.length} onPress={known ? () => setOpen(true) : undefined} accessibilityLabel={known ? `${RELATION_LABEL[level]}: jobs done for ${customer.name}` : `${customer.name} is new to this garage`} />
      <CustomerHistorySheet visible={open} onClose={() => setOpen(false)} customer={customer} />
    </>
  );
};

/**
 * A link for a job's full details: "see the earlier jobs" with the number of them, shown only for a customer this garage has worked for before;
 * it opens the same record. Nothing is shown for a new customer.
 */
export const CustomerHistoryLink: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { done } = useCustomerHistory(customer);
  const [open, setOpen] = useState(false);
  if (done.length === 0) return null;
  return (
    <>
      <Pressable style={styles.link} onPress={() => setOpen(true)} hitSlop={6} accessibilityLabel={`See the earlier jobs done for ${customer.name}`}>
        <Text style={styles.linkText}>📋 කලින් රැකියා වාර්තා බලන්න ({done.length}) ›</Text>
      </Pressable>
      <CustomerHistorySheet visible={open} onClose={() => setOpen(false)} customer={customer} />
    </>
  );
};

/** The jobs this garage has done for one customer: what, when, on which vehicle, what it cost and the warranty. */
export const CustomerHistoryList: React.FC<{ customer: Customer; /** Opens the full details window of a finished job. */ onOpenJob?: (b: Booking) => void }> = ({ customer, onOpenJob }) => {
  const { done, running, cancelled, disputes, level } = useCustomerHistory(customer);
  const total = done.reduce((n, b) => n + b.price, 0);
  const times = done.map((b) => b.completedAt ?? b.scheduledAt);
  const rated = done.map((b) => b.rating).filter((x): x is number => !!x);
  // A record touched in the list opens the whole of it.
  const [picked, setPicked] = useState<Booking | null>(null);
  const active = done.find((b) => !!b.progress?.warrantyUntil && b.progress.warrantyUntil > Date.now());
  return (
    <View style={styles.list}>
      {done.length > 0 && <RelationSummary hideJobs jobs={done.length} since={Math.min(...times)} last={Math.max(...times)} total={total} avgRating={rated.length ? rated.reduce((n, x) => n + x, 0) / rated.length : undefined} />}
      {!!active && <Text style={styles.good}>🛡️ {active.title} සඳහා වගකීම තවම බලපායි ({formatDate(active.progress!.warrantyUntil!)} දක්වා)</Text>}
      {running > 0 && <Text style={styles.running}>🔧 දැනට ඔහු වෙනුවෙන් පවතින රැකියා {running}</Text>}
      {(cancelled > 0 || disputes > 0) && (
        <Text style={styles.warn}>
          ⚠️ අවලංගු කළ {cancelled} · ගැටළු {disputes}
        </Text>
      )}
      {done.length === 0 ? (
        <EmptyState icon="🧾" title="සම්පූර්ණ කළ රැකියා නැත" text="මෙම පාරිභෝගිකයාට ඔබ රැකියාවක් අවසන් කළ විට එය මෙහි වාර්තා වේ." />
      ) : (
        done.map((b) => (
          <Pressable key={b.id} style={styles.row} onPress={() => (onOpenJob ? onOpenJob(b) : setPicked(b))} accessibilityLabel={`${b.title} full record`}>
            <CategoryArt emoji={b.icon} size={36} />
            <View style={styles.flex1}>
              <Text style={styles.title} numberOfLines={1}>
                {b.title}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {formatDate(b.completedAt ?? b.scheduledAt)} · {b.vehicle.name} · {b.vehicle.registrationNo || b.vehicle.plate}
              </Text>
              {!!b.progress?.warrantyUntil && <Text style={styles.sub}>🛡️ වගකීම {formatDate(b.progress.warrantyUntil)} දක්වා</Text>}
            </View>
            <Text style={styles.price}>{money(b.price)}</Text>
          </Pressable>
        ))
      )}
      <CustomerJobRecordSheet booking={picked} onClose={() => setPicked(null)} />
      <Text style={styles.help}>{RELATION_HELP}</Text>
      <Text style={styles.help}>🔒 {RELATION_PRIVACY}</Text>
    </View>
  );
};

const when = (t?: number) => (t ? formatDate(t) : '—');

/**
 * The full record of one finished job: the dates (booked, received, finished), the vehicle, what was found, done and charged, the garage's own
 * notes added while it went on, the warranty and the ratings.
 */
export const CustomerJobRecordSheet: React.FC<{ booking: Booking | null; onClose: () => void }> = ({ booking: b, onClose }) => {
  const p = b?.progress;
  const bill = p?.handover?.bill;
  return (
    <Sheet visible={!!b} title={b?.title ?? ''} subtitle={b ? `${b.customer.name} · ${b.vehicle.name} · ${b.vehicle.registrationNo || b.vehicle.plate}` : undefined} onClose={onClose}>
      {!!b && (
        <View style={styles.list}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>දිනයන්</Text>
            <Line k="වෙන් කළ දිනය" v={when(b.scheduledAt)} />
            <Line k="වාහනය ලැබුණු දිනය" v={when(p?.receivedAt)} />
            <Line k="අවසන් කළ දිනය" v={when(b.completedAt ?? p?.closedAt)} />
            {!!p?.warrantyUntil && <Line k="වගකීම" v={`${when(p.warrantyUntil)} දක්වා`} />}
          </View>
          {!!(b.job?.description || b.note) && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>ඉල්ලීම</Text>
              {!!b.job?.description && <Text style={styles.body}>{b.job.description}</Text>}
              {!!b.note && <Text style={styles.body}>ගරාජයේ සටහන: {b.note}</Text>}
            </View>
          )}
          {!!p?.diagnosis && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>පරීක්ෂාවෙන් හමු වූයේ</Text>
              <Text style={styles.body}>{p.diagnosis.findings}</Text>
              {p.diagnosis.lines.map((l) => (
                <Line key={l.id} k={l.name} v={money(l.price)} />
              ))}
            </View>
          )}
          {!!p?.extras?.length && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>අමතර වැඩ</Text>
              {p.extras.map((e) => (
                <Text key={e.id} style={styles.body}>
                  • {e.reason}
                </Text>
              ))}
            </View>
          )}
          {!!p?.handover?.checklist?.length && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>කළ වැඩ</Text>
              {p.handover.checklist.map((c) => (
                <Text key={c.label} style={styles.body}>
                  {c.done ? '✓' : '○'} {c.label}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>ගාස්තුව</Text>
            {!!bill && <Line k="වැඩ" v={money(bill.labour)} />}
            {!!bill && <Line k="කොටස්" v={money(bill.parts)} />}
            <Line k="මුළු මුදල" v={money(bill?.total ?? b.price)} strong />
          </View>
          {!!b.updates?.length && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>රැකියා කාඩ්පතේ විස්තර ({b.updates.length})</Text>
              {b.updates.map((u) => (
                <View key={u.id} style={styles.update}>
                  <Text style={styles.sub}>{formatDate(u.at)}</Text>
                  {!!u.text && <Text style={styles.body}>{u.text}</Text>}
                </View>
              ))}
            </View>
          )}
          {(!!b.rating || !!p?.customerRating) && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>ශ්‍රේණිගත කිරීම්</Text>
              {!!b.rating && <Line k="පාරිභෝගිකයා ඔබට දුන්" v={`${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}`} />}
              {!!p?.customerRating && <Line k="ඔබ පාරිභෝගිකයාට දුන්" v={`${'★'.repeat(p.customerRating.stars)}${'☆'.repeat(5 - p.customerRating.stars)}`} />}
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
};

const Line: React.FC<{ k: string; v: string; strong?: boolean }> = ({ k, v, strong }) => (
  <View style={styles.line}>
    <Text style={[styles.lineKey, strong && styles.strong]} numberOfLines={2}>
      {k}
    </Text>
    <Text style={[styles.lineVal, strong && styles.strong]}>{v}</Text>
  </View>
);

/** The record of the jobs this garage has done for one customer, in a sheet. */
export const CustomerHistorySheet: React.FC<{ visible: boolean; onClose: () => void; customer: Customer }> = ({ visible, onClose, customer }) => (
  <Sheet visible={visible} title={customer.name} subtitle="ඔබ මෙම පාරිභෝගිකයාට කළ වැඩ" onClose={onClose}>
    <CustomerHistoryList customer={customer} />
  </Sheet>
);

/**
 * The two tabs of a job's full details: the job itself, and the record of what this garage did for the customer before. The record tab is shown
 * only for a customer the garage has worked for.
 */
export const CustomerRecordTabs: React.FC<{ customer: Customer; view: 'details' | 'records'; onChange: (v: 'details' | 'records') => void }> = ({ customer, view, onChange }) => {
  const { done } = useCustomerHistory(customer);
  if (done.length === 0) return null;
  const tabs: { id: 'details' | 'records'; label: string; Icon: React.ComponentType<{ active: boolean; size?: number }> }[] = [
    { id: 'details', label: 'රැකියා විස්තර', Icon: ClipboardLineIcon },
    { id: 'records', label: `කලින් වාර්තා (${done.length})`, Icon: ReceiptLineIcon },
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map((t) => {
        const on = view === t.id;
        return (
          <Pressable key={t.id} style={[styles.tab, on && styles.tabOn]} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            <t.Icon active={on} size={20} />
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    tag: { alignSelf: 'flex-start', paddingHorizontal: 6, height: 18, justifyContent: 'center', borderRadius: 9, borderWidth: 1, maxWidth: '100%' },
    tagKnown: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    tagNew: { backgroundColor: Colors.subtleFill, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    link: { alignSelf: 'flex-start', paddingVertical: 4 },
    linkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    list: { gap: 18 },
    block: { gap: 8, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', backgroundColor: Colors.bgCard },
    blockTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    update: { gap: 2 },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    lineKey: { flex: 1, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    lineVal: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontFamily: FONTS.titleBold, color: Colors.textMain },
    levelRow: { flexDirection: 'row' },
    good: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.successText },
    warn: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    help: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19 },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    tab: { flex: 1, height: 42, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    tabOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    tabText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tagText: { fontSize: 12, fontFamily: FONTS.bodySemiBold },
    tagTextKnown: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    tagTextNew: { color: Colors.textMuted },
    totals: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    totalText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    running: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.warning },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', backgroundColor: Colors.bgCard },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  })
);
