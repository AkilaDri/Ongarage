import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, Pulse } from '@ongarage/shared';
import { Header } from '../Header';

/**
 * The top of Home, one piece with the rest of the page: the blue header, then the white action card (SOS and free quotes) that overlaps its bottom edge, then the search card.
 * Written with plain styles (the theme does not reshape or rescale them) so it matches the design exactly. It is the first thing inside Home's scroll, so the header, the
 * cards and the services all move together as one sheet.
 */

/** Height of each action button (circle + badge row, title, line). */
const BTN_H = 90; // each action is one row now (the two rows sit one under the other)

export const HomeTop: React.FC<{ onSOS: () => void; onPost: () => void; search: React.ReactNode; /** The vehicle chosen right now: shown as a tag in the header. */ vehicleId?: string; /** Called when the owner picks another vehicle from the header. */ onSelectVehicle?: (id: string) => void; /** Tells the page where the action card starts (so it can show the sticky copy once the card has scrolled away). */ onCardY?: (y: number) => void }> = ({ onSOS, onPost, search, onCardY, vehicleId, onSelectVehicle }) => (
  <View>
    <Header vehicleId={vehicleId} onSelectVehicle={onSelectVehicle} />
    <View style={hs.below} onLayout={(e) => onCardY?.(e.nativeEvent.layout.y)}>
      <View style={hs.card}>
        <Pressable style={({ pressed }) => [hs.sosBtn, pressed && hs.pressed]} onPress={onSOS} accessibilityLabel="Open SOS">
          <View style={hs.sosCircle}>
            <Text style={hs.sosCircleText}>SOS</Text>
          </View>
          <View style={hs.rowText}>
            <Text style={hs.btnTitle} numberOfLines={1}>Breakdown එකක්ද?</Text>
            <Text style={hs.btnSub} numberOfLines={1}>ළඟම උදව් ඉල්ලන්න</Text>
          </View>
          <View style={hs.sosPill}>
            <Pulse style={hs.pillDot} />
            <Text style={hs.sosPillText}>24/7</Text>
          </View>
        </Pressable>
        <Pressable style={({ pressed }) => [hs.jobBtn, pressed && hs.pressed]} onPress={onPost} accessibilityLabel="Post a repair job">
          <View style={hs.jobCircle}>
            <Text style={hs.jobCircleText}>+</Text>
          </View>
          <View style={hs.rowText}>
            <Text style={hs.btnTitle} numberOfLines={1}>Repair එකක්ද?</Text>
            <Text style={hs.btnSub} numberOfLines={1}>ගරාජ් මිල ගණන් ඉල්ලන්න</Text>
          </View>
          <View style={hs.freePill}>
            <Text style={hs.freePillText}>නොමිලේ</Text>
          </View>
        </Pressable>
      </View>
      <View style={hs.search}>{search}</View>
    </View>
  </View>
);

const hs = StyleSheet.create({
  // The cards start 56px above the header's bottom edge, so the white card overlaps the blue band.
  below: { paddingHorizontal: 16, marginTop: -56 },
  // One white card holds the two actions, which are separate cards inside it with a small gap between them.
  card: { flexDirection: 'column', gap: 8, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#ffffff', borderRadius: 26, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 6 },
  search: { marginTop: 20 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sosBtn: { height: BTN_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(254, 226, 226, 0.8)', backgroundColor: '#fef2f2' },
  jobBtn: { height: BTN_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(219, 234, 254, 0.8)', backgroundColor: '#eff6ff' },
  rowText: { flex: 1 },
  btnTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sosCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  sosCircleText: { fontSize: 16, fontWeight: '800', color: '#dc2626' },
  sosPill: { flexDirection: 'row', gap: 5, backgroundColor: '#ef4444', height: 26, minWidth: 74, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  sosPillText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  jobCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center' },
  jobCircleText: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: '#2563eb' },
  freePill: { backgroundColor: '#facc15', height: 26, minWidth: 74, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  freePillText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  btnTitle: { fontSize: 15, lineHeight: 21, fontFamily: FONTS.bodyMedium, color: '#000000' },
  btnSub: { fontSize: 13.5, lineHeight: 18, marginTop: 6, fontFamily: FONTS.bodyRegular, color: '#6b7280' },
});
