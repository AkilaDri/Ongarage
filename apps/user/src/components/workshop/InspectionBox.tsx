import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, INSPECTION_FEE, PhotoStrip, themedStyles } from '@ongarage/shared';
import { FlowButton } from '../FlowButton';
import { MOCK_GARAGES } from '../../constants/mockData';
import type { InspectionUpdateKind, OwnerWorkshop } from '../../context/WorkshopContext';
import { useChat } from '../../context/ChatContext';
import { formatDate, formatTime, money } from '../../utils/format';

export const INSPECTION_UPDATE_TEXT: Record<InspectionUpdateKind, string> = {
  started: 'පරීක්ෂාව ආරම්භ කළා',
  moreTests: 'තවත් පරීක්ෂා කිරීමක් අවශ්‍යයි',
  outsideTest: 'වෙනත් තැනක පරීක්ෂාවකට යැවීම අවශ්‍යයි',
};

const stamp = (t: number) => `${formatDate(t)} · ${formatTime(t)}`;

/**
 * The wait between handing the vehicle over and the garage's report (an hour to a day): when the report is expected, who is on it, the garage's short updates,
 * what the owner is protected by, and, only once the expected time has really passed, a way to reach the garage. Calm: nothing is asked of the owner.
 */
export const InspectionBox: React.FC<{ workshop: OwnerWorkshop; /** The details view: every update, not only the latest. */ detailed?: boolean }> = ({ workshop: w, detailed }) => {
  const chat = useChat();
  const [now, setNow] = useState(Date.now());
  const [photos, setPhotos] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const x = w.inspection;
  if (!x) return null;
  const late = now > x.etaAt;
  const updates = detailed ? [...x.updates].reverse() : x.updates.slice(-1);
  const shots = w.progress.checkInPhotos ?? [];
  const phone = MOCK_GARAGES.find((g) => g.name === w.garageName)?.phone;
  return (
    <View style={styles.box} accessibilityLabel="Inspection in progress">
      <View>
        <Text style={styles.label}>පරීක්ෂා වාර්තාව බලාපොරොත්තු වන වේලාව</Text>
        <Text style={styles.eta}>{stamp(x.etaAt)} ට පමණ</Text>
        {!!x.previousEtaAt && <Text style={styles.sub}>කලින්: {stamp(x.previousEtaAt)}{x.delayReason ? ` · ${x.delayReason}` : ''}</Text>}
      </View>

      {late && (
        <View style={styles.late} accessibilityLabel="Report is late">
          <Text style={styles.lateText}>වාර්තාව ප්‍රමාදයි. ගරාජයෙන් නව වේලාවක් ඉල්ලා ඇත.</Text>
          <View style={styles.row}>
            {!!phone && (
              <View style={styles.flex1}>
                <FlowButton label="කතා කරන්න" icon="📞" variant="ghost" onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} />
              </View>
            )}
            <View style={styles.flex1}>
              <FlowButton label="පණිවිඩයක්" icon="💬" variant="ghost" onPress={() => chat.open({ id: w.id, title: w.garageName, subtitle: w.garageName, phone })} />
            </View>
          </View>
        </View>
      )}

      <Text style={styles.line}>👷 {w.technician ? `${w.technician} · ` : ''}{stamp(x.startedAt)} ට ආරම්භ විය</Text>
      {updates.map((u) => (
        <Text key={u.at} style={styles.line}>
          💬 {INSPECTION_UPDATE_TEXT[u.kind]}
          {u.note ? ` — ${u.note}` : ''} <Text style={styles.sub}>{formatTime(u.at)}</Text>
        </Text>
      ))}
      {shots.length > 0 && (
        <>
          <Pressable style={styles.link} onPress={() => setPhotos((v) => !v)} accessibilityRole="button" accessibilityLabel="Check-in photos">
            <Text style={styles.linkText}>📷 භාර ගත් විට ඡායාරූප ({shots.length}) {photos ? '▴' : '›'}</Text>
          </Pressable>
          {photos && <PhotoStrip photos={shots} height={72} />}
        </>
      )}
      <Text style={styles.sub}>🛡️ ඔබේ අනුමැතිය නැතිව වැඩක් නොකෙරේ. වාර්තාව ප්‍රතික්ෂේප කළහොත් පමණක් පරීක්ෂා ගාස්තුව {money(INSPECTION_FEE)} අය වේ.</Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 10 },
    box: { gap: 10, padding: 12, borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f6f8fc' },
    label: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    eta: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.titleBold, color: Colors.textMain },
    line: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sub: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    late: { gap: 8, padding: 10, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    lateText: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    link: { minHeight: 44, justifyContent: 'center' },
    linkText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
  })
);
