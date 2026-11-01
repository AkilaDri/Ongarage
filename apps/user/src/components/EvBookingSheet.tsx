import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  BOOK_DAYS,
  canCancel,
  canStartSession,
  CloseCode,
  Colors,
  DURATIONS_MIN,
  estimateSession,
  evCodePayload,
  FONTS,
  getThemeMode,
  minutesToStart,
  NO_SHOW_GRACE_MIN,
  NO_SHOW_LIMIT,
  slotsFor,
  themedStyles,
  type EvBooking,
  type Place,
  type PlugType,
} from '@ongarage/shared';
import { Sheet } from './Sheet';
import { useEvBookings } from '../context/EvBookingContext';

const clock = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayName = (offset: number) => (offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : `දින +${offset}`);
const HOLD_TEXT: Record<string, string> = { noShows: `වේලාවට නොපැමිණීම් ${NO_SHOW_LIMIT}ක් නිසා නව වෙන් කිරීම් තාවකාලිකව නවත්වා ඇත.`, overlap: 'ඒ වෙලාවට ඔබට දැනටමත් වෙන් කිරීමක් තියෙනවා.', closed: 'මේ ස්ථානය වෙන් කිරීමට දැනට විවෘත නැහැ.' };

/** Pick a connector, a day, how long and a free slot, then book it. The cost is an estimate and is paid at the charger. */
export const EvBookingSheet: React.FC<{ place: Place | null; vehicleId?: string; defaultPlug?: PlugType | null; onClose: () => void }> = ({ place: p, vehicleId, defaultPlug, onClose }) => {
  const ev = useEvBookings();
  const [plug, setPlug] = useState<PlugType | null>(null);
  const [day, setDay] = useState(0);
  const [duration, setDuration] = useState(60);
  const [picked, setPicked] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setPlug(defaultPlug && p?.connectors?.some((c) => c.type === defaultPlug) ? defaultPlug : p?.connectors?.[0]?.type ?? null);
    setDay(0);
    setDuration(60);
    setPicked(null);
    setProblem(null);
  }, [p?.id]);

  const now = Date.now();
  const connector = p?.connectors?.find((c) => c.type === plug);
  const slots = useMemo(() => (p && plug ? slotsFor(p, plug, day, duration, ev.bookings, Date.now()) : []), [p, plug, day, duration, ev.bookings]);
  // Late in the evening today has no room left: start on tomorrow instead of an empty list.
  useEffect(() => {
    if (p && day === 0 && slots.length === 0) setDay(1);
  }, [p?.id, plug, duration]);
  const est = connector ? estimateSession(connector, duration) : null;

  const confirm = () => {
    if (!p || !plug || picked === null) return;
    const r = ev.book(p.id, plug, picked, duration, vehicleId);
    if (r.ok) onClose();
    else setProblem(HOLD_TEXT[r.reason]);
  };

  return (
    <Sheet
      visible={!!p}
      noDividers
      title="Charging slot එකක් වෙන් කරන්න"
      subtitle={p?.name}
      onClose={onClose}
      footer={
        <ActionButton label={picked === null ? 'Slot එකක් තෝරන්න' : `${dayName(day)} ${clock(picked)} වෙන් කරන්න`} icon="📅" variant="primary" disabled={picked === null} onPress={confirm} />
      }
    >
      {!!p && (
        <>
          <Text style={styles.label}>Plug වර්ගය</Text>
          <View style={styles.row}>
            {p.connectors?.map((c) => (
              <Pressable key={c.type} style={[styles.chip, plug === c.type && styles.chipOn]} onPress={() => { setPlug(c.type); setPicked(null); }} accessibilityLabel={`Book plug ${c.type}`}>
                <Text style={[styles.chipText, plug === c.type && styles.chipTextOn]}>
                  {c.type} · {c.kw} kW
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>දිනය</Text>
          <View style={styles.row}>
            {Array.from({ length: BOOK_DAYS }, (_, d) => (
              <Pressable key={d} style={[styles.chip, day === d && styles.chipOn]} onPress={() => { setDay(d); setPicked(null); }} accessibilityLabel={`Book day ${d}`}>
                <Text style={[styles.chipText, day === d && styles.chipTextOn]}>{dayName(d)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>කොපමණ වේලාවක්</Text>
          <View style={styles.row}>
            {DURATIONS_MIN.map((m) => (
              <Pressable key={m} style={[styles.chip, duration === m && styles.chipOn]} onPress={() => { setDuration(m); setPicked(null); }} accessibilityLabel={`Book duration ${m}`}>
                <Text style={[styles.chipText, duration === m && styles.chipTextOn]}>මිනි. {m}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>නිදහස් වේලාවන්</Text>
          {slots.length === 0 ? (
            <Text style={styles.empty}>මේ දිනයේ නිදහස් slot නැහැ. වෙන දිනයක් හෝ කෙටි වේලාවක් බලන්න.</Text>
          ) : (
            <View style={styles.grid}>
              {slots.map((s) => (
                <Pressable key={s.startAt} style={[styles.slot, picked === s.startAt && styles.chipOn]} onPress={() => { setPicked(s.startAt); setProblem(null); }} accessibilityLabel={`Slot ${clock(s.startAt)}`}>
                  <Text style={[styles.chipText, picked === s.startAt && styles.chipTextOn]}>{clock(s.startAt)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!est && (
            <View style={styles.estimate}>
              <Text style={styles.estimateTitle}>ඇස්තමේන්තුව</Text>
              <Text style={styles.estimateText}>
                ≈ {est.kwh} kWh · රු. {est.cost} (රු. {connector!.price}/kWh). ගෙවන්නේ charger එකේදී; මෙය ඇස්තමේන්තුවක් පමණයි.
              </Text>
              <Text style={styles.estimateNote}>
                වෙන් කළ වේලාවෙන් මිනිත්තු {NO_SHOW_GRACE_MIN}ක් ඇතුළත ළඟා වී QR එක scan කරන්න. නැත්නම් slot එක අහිමි වේ.
              </Text>
            </View>
          )}
          {!!problem && <Text style={styles.problem}>⚠️ {problem}</Text>}
        </>
      )}
    </Sheet>
  );
};

/** One of the owner's bookings at a charger: the QR to show at the plug, the time left, and — once scanned — the battery, energy and cost of the session. */
export const EvBookingCard: React.FC<{ booking: EvBooking; placeName: string }> = ({ booking: b, placeName }) => {
  const ev = useEvBookings();
  const now = Date.now();
  const s = ev.liveSession(b);
  const left = minutesToStart(b, now);
  const statusText = { booked: left > 0 ? `${clock(b.startAt)} ට පටන් ගන්නවා (මිනි. ${left}කින්)` : `දැන් ළඟා වන්න (මිනි. ${NO_SHOW_GRACE_MIN + left}ක් ඇතුළත)`, charging: '⚡ Charging වෙමින් පවතී', done: '✓ අවසන් කළා', cancelled: 'අවලංගු කළා', noShow: 'වේලාවට නොපැමිණීම — slot එක අහිමි වුණා' }[b.status];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        🔌 {b.plug} · {clock(b.startAt)} - {clock(b.startAt + b.durationMin * 60000)}
      </Text>
      <Text style={styles.cardSub}>{placeName}</Text>
      <Text style={[styles.cardStatus, b.status === 'noShow' && styles.bad, b.status === 'charging' && styles.good]}>{statusText}</Text>

      {b.status === 'booked' && (
        <>
          <CloseCode code={b.code} payload={evCodePayload(b.code)} size={140} caption="Charger එකේදී මේ QR එක scan කරන්න (හෝ අංක ඇතුළත් කරන්න)" />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="අවලංගු කරන්න" variant="ghost" compact disabled={!canCancel(b)} onPress={() => ev.cancel(b.id)} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label={canStartSession(b, now) ? 'Charger එකේ scan කළා' : 'Scan කරන්න (demo)'} icon="🔌" variant="primary" compact onPress={() => ev.startSession(b.id, !canStartSession(b, now))} />
            </View>
          </View>
        </>
      )}

      {b.status === 'charging' && !!s && (
        <>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, s.pct)}%` }]} />
          </View>
          <View style={styles.stats}>
            <Stat label="Battery" value={`${Math.round(s.pct)}%`} />
            <Stat label="kWh" value={String(s.kwh)} />
            <Stat label="ඇස්තමේන්තු ගාස්තුව" value={`රු. ${s.cost}`} />
            <Stat label="වේලාව" value={`මිනි. ${s.minutes}`} />
          </View>
          <ActionButton label="Charging නවත්වන්න" icon="⏹" variant="ghost" compact onPress={() => ev.stopSession(b.id)} />
        </>
      )}

      {b.status === 'done' && !!s && (
        <View style={styles.stats}>
          <Stat label="Battery" value={`${Math.round(b.session?.startPct ?? 0)} → ${Math.round(s.pct)}%`} />
          <Stat label="kWh" value={String(s.kwh)} />
          <Stat label="ඇස්තමේන්තු ගාස්තුව" value={`රු. ${s.cost}`} />
        </View>
      )}
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eef7' },
    chipOn: { backgroundColor: '#1a73e8' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slot: { minWidth: 70, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eef7' },
    empty: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    estimate: { padding: 14, borderRadius: 14, gap: 4, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9' },
    estimateTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    estimateText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 19 },
    estimateNote: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    problem: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: dark() ? '#f28b82' : '#b3261e' },
    card: { padding: 14, borderRadius: 14, gap: 10, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9' },
    cardTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    cardStatus: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    good: { color: '#16a34a' },
    bad: { color: '#dc2626' },
    bar: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.12)' : '#dbe3ee' },
    barFill: { height: 10, backgroundColor: '#16a34a' },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stat: { flexGrow: 1, minWidth: 80, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#ffffff' },
    statValue: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    statLabel: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
