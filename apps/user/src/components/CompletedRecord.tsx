import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { elevation1, outline } from '../utils/material';
import { useWorkshops } from '../context/WorkshopContext';
import { JobTimelineSheet } from './JobTimelineSheet';
import { formatDate, formatTime, money } from '../utils/format';

/**
 * The record of a job that was carried right through: when each step happened, what the bill was made of, what was paid, how long the
 * warranty runs, the routine-service record and what the owner said about it. It shows only what the job really has.
 */
export const CompletedRecord: React.FC<{ id: string }> = ({ id }) => {
  const { workshops } = useWorkshops();
  const [timeline, setTimeline] = React.useState(false);
  const w = workshops[id];
  if (!w || w.progress.stage !== 'closed') return null;
  const p = w.progress;
  const bill = p.handover?.bill;
  const approvedLines = p.diagnosis ? p.diagnosis.lines.filter((l) => !p.decision || p.decision.approvedLineIds.includes(l.id)).length : 0;
  const extras = p.extras ?? [];
  const checklist = p.handover?.checklist ?? [];
  const service = p.handover?.service;
  const pay = p.payment;
  const stamp = (t?: number) => (t ? `${formatDate(t)} · ${formatTime(t)}` : '');

  const steps = [
    { icon: '📅', label: 'වෙන් කළා', at: w.scheduledAt },
    { icon: '🚗', label: 'වාහනය භාර ගත්තා', at: p.receivedAt },
    { icon: '🔍', label: `විනිශ්චය වාර්තාව${p.diagnosis ? ` · රේඛා ${p.diagnosis.lines.length}` : ''}`, at: p.diagnosis?.sentAt },
    { icon: '✅', label: `ඔබ අනුමත කළා${p.decision ? ` · රේඛා ${approvedLines}` : ''}`, at: p.decision?.decidedAt },
    ...extras.map((x, i) => ({ icon: '➕', label: `අමතර වැඩ ${i + 1}: ${x.reason}`, at: x.sentAt })),
    { icon: '🔧', label: 'අලුත්වැඩියා අවසන්, භාර දීමට සූදානම්', at: p.handover?.readyAt },
    { icon: '🔑', label: 'ඔබගේ කේතයෙන් වසා දැමුවා', at: p.closedAt },
  ].filter((s) => !!s.at);

  const rows: { label: string; value: string; strong?: boolean }[] = [];
  if (bill) {
    rows.push({ label: 'වැඩ ගාස්තුව', value: money(bill.labour) }, { label: 'කොටස්', value: money(bill.parts) }, { label: 'මුළු බිල', value: money(bill.total), strong: true });
  }

  return (
    <>
      <Text style={styles.section}>සම්පූර්ණ කළ වාර්තාව</Text>
      <Pressable style={styles.card} onPress={() => setTimeline(true)} accessibilityLabel="Open full job timeline">
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <Text style={styles.stepIcon}>{s.icon}</Text>
              {i < steps.length - 1 && <View style={styles.railLine} />}
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepLabel}>{s.label}</Text>
              <Text style={styles.sub}>{stamp(s.at)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.line} />
        <Text style={styles.more}>සම්පූර්ණ කාල රේඛාව, ඉල්ලූ කොටස් සහ කාර්මික වාර්තාව බලන්න ›</Text>
      </Pressable>
      <JobTimelineSheet id={timeline ? id : null} onClose={() => setTimeline(false)} />

      {rows.length > 0 && (
        <>
          <Text style={styles.section}>බිල සහ ගෙවීම</Text>
          <View style={styles.card}>
            {rows.map((r, i) => (
              <React.Fragment key={r.label}>
                {i > 0 && <View style={styles.line} />}
                <View style={styles.rowBetween}>
                  <Text style={[styles.sub, r.strong && styles.strong]}>{r.label}</Text>
                  <Text style={[styles.sub, r.strong && styles.strong]}>{r.value}</Text>
                </View>
              </React.Fragment>
            ))}
            {!!pay && (
              <>
                <View style={styles.line} />
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>ගෙවා ඇත</Text>
                  <Text style={[styles.sub, { color: Colors.successText }]}>{money(pay.received)}</Text>
                </View>
                {pay.balance > 0 && (
                  <>
                    <View style={styles.line} />
                    <View style={styles.rowBetween}>
                      <Text style={styles.sub}>ඉතිරි{pay.promisedAt ? ` · ${formatDate(pay.promisedAt)} දක්වා` : ''}</Text>
                      <Text style={[styles.sub, { color: Colors.warning }]}>{money(pay.balance)}</Text>
                    </View>
                  </>
                )}
                {!!pay.installments?.length && (
                  <>
                    <View style={styles.line} />
                    <Text style={styles.sub}>ඉතිරි ගෙවීම්: {pay.installments.map((x) => `${money(x.amount)} (${formatDate(x.at)})`).join(' · ')}</Text>
                  </>
                )}
              </>
            )}
          </View>
        </>
      )}

      <Text style={styles.section}>වගකීම සහ භාර දීම</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sub}>🛡️ වගකීම</Text>
          <Text style={styles.sub}>
            මාස {w.warrantyMonths}
            {p.warrantyUntil ? ` · ${formatDate(p.warrantyUntil)} දක්වා` : ''}
          </Text>
        </View>
        {checklist.length > 0 && (
          <>
            <View style={styles.line} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>📋 භාර දීමේ පරීක්ෂා ලැයිස්තුව</Text>
              <Text style={styles.sub}>
                {checklist.filter((c) => c.done).length} / {checklist.length}
              </Text>
            </View>
          </>
        )}
        {p.handover && (
          <>
            <View style={styles.line} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>🔩 ගැලවූ පරණ කොටස්</Text>
              <Text style={styles.sub}>{p.handover.oldPartsKept ? 'ඔබට ලබා දුන්නා' : 'තබා නැත'}</Text>
            </View>
          </>
        )}
        {!!w.receiptNo && (
          <>
            <View style={styles.line} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>🧾 රිසිට්පත</Text>
              <Text style={styles.sub}>{w.receiptNo}</Text>
            </View>
          </>
        )}
        {!!p.warrantyClaim && (
          <>
            <View style={styles.line} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>⚠️ වගකීම් ඉල්ලීම</Text>
              <Text style={styles.sub}>{{ open: 'විවෘතයි', accepted: 'පිළිගත්තා', rejected: 'ප්‍රතික්ෂේප විය', escalated: 'OnGarage වෙත' }[p.warrantyClaim.status]}</Text>
            </View>
          </>
        )}
      </View>

      {!!service && (
        <>
          <Text style={styles.section}>සේවා වාර්තාව</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>සේවා වර්ගය</Text>
              <Text style={styles.sub}>{{ full: 'සම්පූර්ණ සේවාව', oil: 'ඔයිල් මාරු කිරීම', fluids: 'ද්‍රව මාරු කිරීම' }[service.kind]}</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>ඔඩෝමීටරය</Text>
              <Text style={styles.sub}>{service.mileageKm.toLocaleString('en-US')} km</Text>
            </View>
            {(!!service.nextServiceKm || !!service.nextServiceAt) && (
              <>
                <View style={styles.line} />
                <View style={styles.rowBetween}>
                  <Text style={styles.sub}>ඊළඟ සේවාව</Text>
                  <Text style={styles.sub}>
                    {[service.nextServiceKm ? `${service.nextServiceKm.toLocaleString('en-US')} km` : '', service.nextServiceAt ? formatDate(service.nextServiceAt) : ''].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </>
            )}
            {!!service.notes && (
              <>
                <View style={styles.line} />
                <Text style={styles.sub}>{service.notes}</Text>
              </>
            )}
          </View>
        </>
      )}

      {!!w.review && (
        <>
          <Text style={styles.section}>ඔබගේ සමාලෝචනය</Text>
          <View style={styles.card}>
            <Text style={[styles.stepLabel, { color: Colors.warning }]}>
              {'★'.repeat(Math.round(w.review.rating))}
              {'☆'.repeat(5 - Math.round(w.review.rating))}
            </Text>
            {!!w.review.text && <Text style={styles.sub}>“{w.review.text}”</Text>}
            {!!w.review.technician && (
              <Text style={styles.sub}>
                👷 {w.review.technician.name} · {'★'.repeat(Math.round(w.review.technician.rating))}
              </Text>
            )}
            {!!w.review.reply && (
              <>
                <View style={styles.line} />
                <Text style={styles.sub}>ගරාජයේ පිළිතුර: {w.review.reply.text}</Text>
              </>
            )}
          </View>
        </>
      )}
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 12, padding: 16, gap: 10, ...elevation1() },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    line: { height: 1, backgroundColor: outline() },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17, flexShrink: 1 },
    strong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    step: { flexDirection: 'row', gap: 12 },
    rail: { alignItems: 'center', width: 24 },
    stepIcon: { fontSize: 15 },
    railLine: { flex: 1, width: 2, marginTop: 2, borderRadius: 1, backgroundColor: outline() },
    more: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.primary },
    stepLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
