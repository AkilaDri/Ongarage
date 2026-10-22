import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, PhotoStrip, themedStyles, workshopBill, type DiagnosisLine, getThemeMode } from '@ongarage/shared';
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
  const p = b.progress;
  if (!p) return null;
  const bill = p.handover?.bill ?? workshopBill(b.price, p, b.partsCost);
  // (The technician cannot be changed on a closed or cancelled job, or while a cancellation request holds the work.)
  const closed = p.stage === 'closed' || b.status === 'cancelled' || !!p.cancelRequest;

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>වැඩපළ ප්‍රගතිය</Text>
      <WorkshopStatus booking={b} />

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
                  {l.kind === 'part' ? ` · ${l.partType}${l.source === 'order' ? ' · ඇණවුම්' : l.source === 'owner' ? ' · පාරිභෝගිකයා මිලදී ගනී' : ' · තොගයේ'}` : ''}
                </Text>
                <Text style={[styles.linePrice, s === 'declined' && styles.struck]}>{money(l.price)}</Text>
              </View>
            );
          })}
          {!p.decision && <Text style={styles.wait}>⏳ අයිතිකරුගේ තීරණය බලාපොරොත්තුවෙන්</Text>}
        </View>
      )}

      {(p.extras ?? []).map((x) => (
        <View key={x.id} style={styles.box}>
          <Text style={styles.boxTitle}>➕ අමතර වැඩ · {x.decision ? (x.decision.via === 'deferred' ? '➡️ පසුවට තැබුවා' : x.decision.via === 'phone' ? '📞 දුරකථනයෙන් පිළිතුරු දුන්නා' : 'අයිතිකරු පිළිතුරු දුන්නා') : x.waitingSince ? '⏳ අයිතිකරු සම්බන්ධ නොවීය — රැඳී සිටී (නොමිලේ)' : '⏳ අනුමැතියට'}</Text>
          <Text style={styles.text}>{x.reason}</Text>
          {x.lines.map((l) => {
            const ok = x.decision?.approvedLineIds.includes(l.id);
            return (
              <View key={l.id} style={styles.lineRow}>
                <Text style={[styles.lineMark, { color: !x.decision ? Colors.textMuted : ok ? Colors.successText : Colors.errorText }]}>{!x.decision ? '•' : ok ? '✓' : '✕'}</Text>
                <Text style={[styles.lineName, x.decision && !ok && styles.struck]} numberOfLines={1}>
                  {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                </Text>
                <Text style={[styles.linePrice, x.decision && !ok && styles.struck]}>{money(l.price)}</Text>
              </View>
            );
          })}
        </View>
      ))}

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
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 8, letterSpacing: 0.2 },
    label: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    chipOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    off: { opacity: 0.6 },
    box: { padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', gap: 8, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 },
    boxWarn: { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#fef7e0' },
    boxTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20 },
    wait: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lineMark: { width: 14, fontSize: 12, fontWeight: '800' },
    lineName: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    linePrice: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    struck: { textDecorationLine: 'line-through', color: Colors.textMuted },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billValue: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    billTotalLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    billTotal: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
    warranty: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
  })
);
