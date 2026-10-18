import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { Sheet } from '../Sheet';
import { PhotoStrip } from '../PhotoStrip';
import { VoiceNotePlayer } from '../VoiceNotePlayer';
import { SERVICE_FLUIDS, SERVICE_KINDS } from '../../marketplace/service';
import { formatDate, formatTime, money } from '../../utils/format';
import type { DiagnosisLine, ExtraWorkRequest, OwnerDecision, WorkshopProgress } from '../../types';

export type ReportKind = 'diagnosis' | 'extra' | 'handover';

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');
const names = (l: DiagnosisLine) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name);

/** What the owner decided about the lines of a report, in words. */
const decisionText = (d?: OwnerDecision, lines: DiagnosisLine[] = []) => {
  if (!d) return '⏳ අයිතිකරුගේ අනුමැතිය බලාපොරොත්තුවෙන්';
  const approved = lines.filter((l) => d.approvedLineIds.includes(l.id));
  const how = d.via === 'phone' ? ' (දුරකථන ඇමතුමකින්)' : d.via === 'deferred' ? ' (පසෙක තැබුවා)' : '';
  return approved.length ? `✅ අනුමත කළා${how}: ${approved.map(names).join(', ')}` : `✖ කිසිවක් අනුමත නොකළා${how}`;
};

const Lines: React.FC<{ title: string; lines: DiagnosisLine[] }> = ({ title, lines }) =>
  lines.length === 0 ? null : (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupTotal}>{money(lines.reduce((s, l) => s + l.price, 0))}</Text>
      </View>
      {lines.map((l) => (
        <View key={l.id} style={styles.lineBlock}>
          <View style={styles.lineRow}>
            <Text style={styles.line}>{names(l)}</Text>
            <Text style={styles.price}>{money(l.price)}</Text>
          </View>
          {!!l.photos?.length && <PhotoStrip photos={l.photos} height={40} />}
        </View>
      ))}
    </View>
  );

/**
 * The reports of a job in one popup: the diagnosis (what was found, photos, parts and work with their prices, what the owner
 * decided), each extra-work request, and the handover (what was done, before and after photos, the bill and, for a routine
 * service, what was done, the mileage and the next service). Opened from a message in the chat and from the job's card.
 */
export const JobReportSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  subject: { title: string; vehicle?: string };
  progress?: WorkshopProgress;
  /** Which report to show first. */
  focus?: ReportKind;
}> = ({ visible, onClose, overlay, subject, progress: p, focus }) => {
  const tabs: { id: ReportKind; label: string; icon: string }[] = [];
  if (p?.diagnosis) tabs.push({ id: 'diagnosis', label: 'පරීක්ෂා වාර්තාව', icon: '📋' });
  if (p?.extras?.length) tabs.push({ id: 'extra', label: `අමතර වැඩ${p.extras.length > 1 ? ` (${p.extras.length})` : ''}`, icon: '➕' });
  if (p?.handover) tabs.push({ id: 'handover', label: 'භාරදීම', icon: '🔑' });
  const [tab, setTab] = useState<ReportKind | undefined>(focus);
  useEffect(() => {
    if (visible) setTab(focus && tabs.some((t) => t.id === focus) ? focus : tabs[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, focus]);
  const shown = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <Sheet visible={visible} title="වාර්තාව" subtitle={[subject.title, subject.vehicle].filter(Boolean).join(' · ')} onClose={onClose} overlay={overlay}>
      {tabs.length === 0 && <Text style={styles.empty}>තවම වාර්තාවක් නැත. පරීක්ෂා වාර්තාවක් එවූ විට මෙහි පෙන්වයි.</Text>}
      {tabs.length > 1 && (
        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Pressable key={t.id} style={[styles.tab, shown === t.id && styles.tabOn]} onPress={() => setTab(t.id)} accessibilityLabel={`Report ${t.label}`}>
              <Text style={[styles.tabText, shown === t.id && styles.tabTextOn]}>
                {t.icon} {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {p && shown === 'diagnosis' && p.diagnosis && (
        <>
          <Text style={styles.stamp}>එවූ වේලාව: {formatDate(p.diagnosis.sentAt)} · {formatTime(p.diagnosis.sentAt)}</Text>
          <Text style={styles.heading}>සොයා ගත් දේ:</Text>
          <Text style={styles.body}>{p.diagnosis.findings || '—'}</Text>
          {!!p.diagnosis.photos?.length && <PhotoStrip photos={p.diagnosis.photos} height={60} />}
          {p.diagnosis.voiceNotes?.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} compact />)}
          <Lines title="🔩 අවශ්‍ය කොටස්" lines={p.diagnosis.lines.filter((l) => l.kind === 'part')} />
          <Lines title="🔧 අවශ්‍ය වැඩ" lines={p.diagnosis.lines.filter((l) => l.kind === 'labour')} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>මුළු අගය (එකඟ වූ මිල ඇතුළුව)</Text>
            <Text style={styles.totalValue}>{money(p.diagnosis.revisedTotal)}</Text>
          </View>
          <Text style={styles.decision}>{decisionText(p.decision, p.diagnosis.lines)}</Text>
        </>
      )}

      {p && shown === 'extra' &&
        (p.extras ?? []).map((x: ExtraWorkRequest, i) => (
          <View key={x.id} style={styles.extraBlock}>
            <Text style={styles.stamp}>අමතර වැඩ {i + 1} · {formatDate(x.sentAt)} · {formatTime(x.sentAt)}</Text>
            <Text style={styles.heading}>හේතුව:</Text>
            <Text style={styles.body}>{x.reason}</Text>
            {!!x.photos?.length && <PhotoStrip photos={x.photos} height={60} />}
            {x.voiceNotes?.map((n, i) => <VoiceNotePlayer key={n.id} note={n} index={i} compact />)}
            <Lines title="🔩 අමතර කොටස්" lines={x.lines.filter((l) => l.kind === 'part')} />
            <Lines title="🔧 අමතර වැඩ" lines={x.lines.filter((l) => l.kind === 'labour')} />
            <Text style={styles.decision}>{x.waitingSince && !x.decision ? '⏳ අයිතිකරුට පිළිතුරු දිය නොහැකි නිසා රැඳී සිටී' : decisionText(x.decision, x.lines)}</Text>
          </View>
        ))}

      {p && shown === 'handover' && p.handover && (
        <>
          <Text style={styles.stamp}>සූදානම් වූ වේලාව: {formatDate(p.handover.readyAt)} · {formatTime(p.handover.readyAt)}</Text>
          {p.handover.service && (
            <View style={styles.serviceBox}>
              <Text style={styles.serviceTitle}>🛠️ {SERVICE_KINDS.find((k) => k.id === p.handover!.service!.kind)?.label}</Text>
              {p.handover.service.fluids.length > 0 && <Text style={styles.body}>වෙනස් කළ තරල: {p.handover.service.fluids.map((f) => SERVICE_FLUIDS.find((x) => x.id === f)?.label).join(' · ')}</Text>}
              <Text style={styles.body}>📏 මීටර් කියවීම: {p.handover.service.mileageKm.toLocaleString('en-US')} km</Text>
              {(p.handover.service.nextServiceKm || p.handover.service.nextServiceAt) && (
                <Text style={styles.bodyStrong}>
                  🔔 ඊළඟ සේවාව: {[p.handover.service.nextServiceAt ? formatDate(p.handover.service.nextServiceAt) : '', p.handover.service.nextServiceKm ? `${p.handover.service.nextServiceKm.toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ')}
                </Text>
              )}
              {!!p.handover.service.notes && <Text style={styles.body}>📝 {p.handover.service.notes}</Text>}
            </View>
          )}
          <Text style={styles.heading}>කළ වැඩ:</Text>
          {p.handover.checklist.map((c) => (
            <Text key={c.label} style={[styles.body, !c.done && styles.undone]}>
              {c.done ? '✓' : '○'} {c.label}
            </Text>
          ))}
          {!!p.handover.beforePhotos?.length && (
            <>
              <Text style={styles.heading}>පෙර (පැමිණි විට):</Text>
              <PhotoStrip photos={p.handover.beforePhotos} height={60} />
            </>
          )}
          {!!p.handover.afterPhotos?.length && (
            <>
              <Text style={styles.heading}>පසු (අවසන් කළ පසු):</Text>
              <PhotoStrip photos={p.handover.afterPhotos} height={60} />
            </>
          )}
          {p.handover.oldPartsKept && <Text style={styles.body}>♻️ ඉවත් කළ පැරණි කොටස් අයිතිකරුට පෙන්වීමට තබා ඇත.</Text>}
          <View style={styles.group}>
            <View style={styles.lineRow}>
              <Text style={styles.line}>🔧 වැඩ ගාස්තුව</Text>
              <Text style={styles.price}>{money(p.handover.bill.labour)}</Text>
            </View>
            <View style={styles.lineRow}>
              <Text style={styles.line}>🔩 කොටස් (වෙනම බිල්පත)</Text>
              <Text style={styles.price}>{money(p.handover.bill.parts)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>අයිතිකරු ගෙවන මුළු මුදල</Text>
              <Text style={styles.totalValue}>{money(p.handover.bill.total)}</Text>
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    empty: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tab: { paddingHorizontal: 12, height: 34, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    tabOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    tabText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: BLUE() },
    stamp: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    heading: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 4 },
    body: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    bodyStrong: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 19 },
    undone: { color: Colors.textMuted },
    group: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupTitle: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE() },
    groupTotal: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE() },
    lineBlock: { gap: 4 },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    line: { flex: 1, fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    price: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 6 },
    totalLabel: { flex: 1, fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    totalValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    decision: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 18, padding: 10, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f8fafd' },
    extraBlock: { gap: 8, paddingBottom: 10 },
    serviceBox: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f8fafd', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    serviceTitle: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE() },
  })
);
