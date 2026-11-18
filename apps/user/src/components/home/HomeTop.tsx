import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, Pulse } from '@ongarage/shared';
import { HomeHeader } from './HomeHeader';


/**
 * The top of Home, one piece with the rest of the page: the blue header, then the white action card (SOS and free quotes) that overlaps its bottom edge, then the search card.
 * Written with plain styles (the theme does not reshape or rescale them) so it matches the design exactly. It is the first thing inside Home's scroll, so the header, the
 * cards and the services all move together as one sheet.
 */

/** Height of each action button (circle + badge row, title, line). */
const BTN_H = 90; // each action is one row now (the two rows sit one under the other)

export const HomeTop: React.FC<{ onSOS: () => void; onPost: () => void; search: React.ReactNode; /** A notice between the action cards and the search bar (a late payment, rarely): the search bar moves down when it shows. */ notice?: React.ReactNode; /** A running (minimised) SOS job: the SOS card then shows where it is and takes the owner back to it, so a second SOS cannot be started. */ sosJob?: { label: string; needsAction: boolean }; /** The vehicle chosen right now: shown as a tag in the header. */ vehicleId?: string; /** Called when the owner picks another vehicle from the header. */ onSelectVehicle?: (id: string) => void; /** Tells the page where the action card starts (so it can show the sticky copy once the card has scrolled away). */ onCardY?: (y: number) => void }> = ({ onSOS, onPost, search, notice, onCardY, vehicleId, onSelectVehicle, sosJob }) => (
  <View>
    <HomeHeader vehicleId={vehicleId} onSelectVehicle={onSelectVehicle} />
    <View style={hs.below} onLayout={(e) => onCardY?.(e.nativeEvent.layout.y)}>
      <View style={hs.card}>
        <Pressable style={({ pressed }) => [hs.sosBtn, !!sosJob && hs.sosBtnLive, pressed && hs.pressed]} onPress={onSOS} accessibilityLabel={sosJob ? 'Back to the SOS job' : 'Open SOS'}>
          <View style={[hs.sosCircle, !!sosJob && hs.sosCircleLive]}>
            <Text style={[hs.sosCircleText, !!sosJob && { color: '#ffffff' }]}>SOS</Text>
          </View>
          {sosJob ? (
            <View style={hs.rowText}>
              <Text style={[hs.liveKicker, sosJob.needsAction && hs.liveAsk]} numberOfLines={1}>{sosJob.needsAction ? 'ඔබේ පිළිතුර අවශ්‍යයි' : 'ක්‍රියාත්මකයි'}</Text>
              <Text style={[hs.btnTitle, hs.liveTitle]} numberOfLines={2} accessibilityLiveRegion="polite">{sosJob.label || 'SOS ඉල්ලීම'}</Text>
            </View>
          ) : (
            <View style={hs.rowText}>
              <Text style={hs.btnTitle} numberOfLines={1}>Breakdown <Text style={hs.sinhala}>එකක්ද?</Text></Text>
              <Text style={hs.btnSub} numberOfLines={1}>Ongarage උදව් ඉල්ලන්න</Text>
            </View>
          )}
          {!!sosJob && <Text style={hs.liveChevron}>›</Text>}
          <View style={[hs.sosPill, !!sosJob?.needsAction && hs.sosPillAsk]}>
            <Pulse style={hs.pillDot} />
            <Text style={hs.sosPillText}>{sosJob ? (sosJob.needsAction ? 'පිළිතුරු' : 'සජීවී') : '24/7'}</Text>
          </View>
        </Pressable>
        <Pressable style={({ pressed }) => [hs.jobBtn, pressed && hs.pressed]} onPress={onPost} accessibilityLabel="Post a repair job">
          <View style={hs.jobCircle}>
            <Text style={hs.jobCircleText}>+</Text>
          </View>
          <View style={hs.rowText}>
            <Text style={hs.btnTitle} numberOfLines={1}>Repair <Text style={hs.sinhala}>එකක්ද?</Text></Text>
            <Text style={hs.btnSub} numberOfLines={1}>Ongarage Quotes ඉල්ලන්න</Text>
          </View>
          <View style={hs.freePill}>
            <Text style={hs.freePillText}>නොමිලේ</Text>
          </View>
        </Pressable>
      </View>
      {notice}
      <View style={hs.search}>{search}</View>
    </View>
  </View>
);

const hs = StyleSheet.create({
  // The cards start 56px above the header's bottom edge, so the white card overlaps the blue band.
  below: { paddingHorizontal: 16, marginTop: -56 },
  // One white card holds the two actions, which are separate cards inside it with a small gap between them.
  card: { flexDirection: 'column', gap: 8, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 6 },
  search: { marginTop: 20 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sosBtn: { height: BTN_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(254, 226, 226, 0.8)', backgroundColor: '#fef2f2' },
  jobBtn: { height: BTN_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(219, 234, 254, 0.8)', backgroundColor: '#eff6ff' },
  rowText: { flex: 1 },
  // A running SOS job: the same card, now a stronger red edge and a solid red disc.
  sosBtnLive: { borderColor: '#f87171', borderWidth: 1.5 },
  sosCircleLive: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  // The running job's lines: a bold status, and the way back as a navy link (the benchmark's detail-link style), not grey text.
  liveTitle: { fontFamily: FONTS.bodyBold, color: '#111827' },
  liveKicker: { fontSize: 13, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: '#6b7280', paddingRight: 80, marginBottom: 2 },
  liveAsk: { fontFamily: FONTS.bodyBold, color: '#b45309' },
  liveChevron: { position: 'absolute', right: 14, bottom: 10, fontSize: 24, lineHeight: 26, color: '#b91c1c' },
  sosPillAsk: { backgroundColor: '#f59e0b' },
  btnTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sosCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  sosCircleText: { fontSize: 16, fontWeight: '800', color: '#dc2626' },
  // The badges stand in the top right corner of their cards, out of the row, so the subtitles have the whole width.
  sosPill: { position: 'absolute', top: 8, right: 10, flexDirection: 'row', gap: 5, backgroundColor: '#ef4444', height: 26, minWidth: 74, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  sosPillText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  jobCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center' },
  jobCircleText: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: '#2563eb' },
  freePill: { position: 'absolute', top: 8, right: 10, backgroundColor: '#facc15', height: 26, minWidth: 74, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  freePillText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  btnTitle: { fontSize: 15, lineHeight: 21, fontFamily: FONTS.bodyMedium, color: '#000000' },
  // The Sinhala words of the titles are set in Noto Sans Sinhala (the same face as the line under them), not in whatever Sinhala face the system picks first.
  sinhala: { fontFamily: 'NotoSansSinhala_500Medium' },
  btnSub: { fontSize: 13.5, lineHeight: 18, marginTop: 6, fontFamily: FONTS.bodyRegular, color: '#6b7280' },
});
