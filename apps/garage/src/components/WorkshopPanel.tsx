import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, PhotoStrip, themedStyles, workshopBill, type DiagnosisLine } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { WorkshopStatus } from './BookingActions';
import { formatDate, money } from '../utils/format';
import type { Booking } from '../types';

const lineState = (b: Booking, l: DiagnosisLine): 'approved' | 'declined' | 'pending' => {
  const d = b.progress?.decision;
  if (!d) return 'pending';
  return d.approvedLineIds.includes(l.id) ? 'approved' : 'declined';
};

/**
 * The workshop record inside a booking's details: who's doing it, check-in photos,
 * the diagnosis with the owner's decision per line, the bill, handover and warranty.
 */
export const WorkshopPanel: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { team, assignTech } = useGarage();
  const p = b.progress;
  if (!p) return null;
  const bill = p.handover?.bill ?? workshopBill(b.price, p, b.partsCost);
  const closed = p.stage === 'closed';

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>වැඩපළ ප්‍රගතිය</Text>
      <WorkshopStatus booking={b} />

      {/* Who does the work */}
      <Text style={styles.label}>වැඩ කරන්නා</Text>
      <View style={styles.chips}>
        {team.map((m) => {
          const on = b.assignedTechId === m.id;
          return (
            <Pressable
              key={m.id}
              style={[styles.chip, on && styles.chipOn, closed && styles.off]}
              disabled={closed}
              onPress={() => assignTech(b.id, m.id)}
              accessibilityLabel={`Assign ${m.name}`}
            >
              <Text style={[styles.chipText, on && { color: Colors.primary }]}>
                {on ? '✓ ' : ''}
                {m.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!!p.checkInPhotos?.length && (
        <>
          <Text style={styles.label}>ලැබුණු විට තත්ත්වය</Text>
          <PhotoStrip photos={p.checkInPhotos} height={70} />
        </>
      )}

      {p.diagnosis && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>🔍 පරීක්ෂා වාර්තාව</Text>
          <Text style={styles.text}>{p.diagnosis.findings}</Text>
          {p.diagnosis.lines.map((l) => {
            const s = lineState(b, l);
            return (
              <View key={l.id} style={styles.lineRow}>
                <Text style={[styles.lineMark, { color: s === 'approved' ? Colors.successText : s === 'declined' ? Colors.errorText : Colors.textMuted }]}>
                  {s === 'approved' ? '✓' : s === 'declined' ? '✕' : '•'}
                </Text>
                <Text style={[styles.lineName, s === 'declined' && styles.struck]} numberOfLines={1}>
                  {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                  {l.kind === 'part' ? ` · ${l.partType}${l.source === 'order' ? ' · ඇණවුම්' : ' · තොගයේ'}` : ''}
                </Text>
                <Text style={[styles.linePrice, s === 'declined' && styles.struck]}>{money(l.price)}</Text>
              </View>
            );
          })}
          {!p.decision && <Text style={styles.wait}>⏳ අයිතිකරුගේ තීරණය බලාපොරොත්තුවෙන්</Text>}
        </View>
      )}

      {(p.decision || closed) && (
        <View style={styles.box}>
          <View style={styles.billRow}>
            <Text style={styles.text}>🔧 වැඩ ගාස්තුව</Text>
            <Text style={styles.billValue}>{money(bill.labour)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.text}>🔩 කොටස් (වෙනම)</Text>
            <Text style={styles.billValue}>{money(bill.parts)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billTotalLabel}>{closed ? 'අයිතිකරු ගෙවූ මුළු මුදල' : 'අයිතිකරු ගෙවන මුළු මුදල'}</Text>
            <Text style={styles.billTotal}>{money(bill.total)}</Text>
          </View>
        </View>
      )}

      {p.handover && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>🔑 භාරදීම</Text>
          <Text style={styles.text}>
            ✓ පරීක්ෂා ලැයිස්තුව {p.handover.checklist.filter((c) => c.done).length}/{p.handover.checklist.length} · {p.handover.oldPartsKept ? '♻️ පැරණි කොටස් තබා ඇත' : 'පැරණි කොටස් නැත'}
          </Text>
          {!!p.handover.afterPhotos?.length && <PhotoStrip photos={p.handover.afterPhotos} height={70} />}
        </View>
      )}

      {p.dispute && (
        <View style={[styles.box, p.dispute.status !== 'resolved' && styles.boxWarn]}>
          <Text style={styles.boxTitle}>
            {p.dispute.status === 'resolved' ? '✓ විසඳූ ගැටලුව' : p.dispute.status === 'rework' ? '🔧 නැවත හදමින්' : p.dispute.status === 'escalated' ? '⚖️ OnGarage වෙත යොමු කළා' : '⚠️ අයිතිකරු ගැටලුවක් වාර්තා කළා'}
          </Text>
          <Text style={styles.text}>“{p.dispute.text}”</Text>
        </View>
      )}

      {p.warrantyUntil && (
        <Text style={styles.warranty}>
          🛡️ මාස {b.warrantyMonths} වගකීම · {formatDate(p.warrantyUntil)} දක්වා
        </Text>
      )}
      {p.warrantyClaim && (
        <View style={[styles.box, styles.boxWarn]}>
          <Text style={styles.boxTitle}>🛡️ වගකීම් ඉල්ලීම</Text>
          <Text style={styles.text}>“{p.warrantyClaim.text}”</Text>
        </View>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    section: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: 'rgba(56, 189, 248, 0.6)', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    off: { opacity: 0.6 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6 },
    boxWarn: { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.08)' },
    boxTitle: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    wait: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lineMark: { width: 14, fontSize: 12, fontWeight: '800' },
    lineName: { flex: 1, fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    linePrice: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    struck: { textDecorationLine: 'line-through', color: Colors.textMuted },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    billTotalLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    billTotal: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    warranty: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
  })
);
