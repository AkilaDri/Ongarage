import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Colors, FONTS, Gradient, LkPlate, themedStyles } from '@ongarage/shared';
import type { TowTruck } from '../constants/towOperators';

/**
 * The truck that is coming, shown on its own once the operator has accepted: its picture, its number plate (big, to match it against the truck that arrives), the
 * kind of truck and its driver. Operators have no real truck photos yet, so the picture is a drawing of a flatbed in the truck's colour.
 */
export const TowTruckCard: React.FC<{ truck: TowTruck; body: string }> = ({ truck, body }) => (
  <View style={styles.card}>
    <View style={styles.photo}>
      <Gradient stops={[{ offset: '0', color: '#e8f0fe' }, { offset: '1', color: '#c9dcf7' }]} />
      <View style={styles.drawing}>
      <Svg width={230} height={118} viewBox="0 0 230 118">
        {/* the road */}
        <Rect x={0} y={98} width={230} height={6} rx={3} fill="#9fb4d6" opacity={0.6} />
        {/* the flatbed with a car on it */}
        <Rect x={14} y={62} width={128} height={12} rx={3} fill="#475569" />
        <Path d="M30 62 l10 -16 h46 l14 16 z" fill="#94a3b8" />
        <Rect x={22} y={56} width={104} height={8} rx={3} fill="#cbd5e1" />
        {/* the cab */}
        <Path d="M148 74 V40 a6 6 0 0 1 6 -6 h26 a8 8 0 0 1 6 3 l16 20 a8 8 0 0 1 2 5 V74 z" fill={truck.body} />
        <Path d="M160 42 h16 l12 16 h-28 z" fill="#e0f2fe" />
        {/* the beacon */}
        <Rect x={160} y={28} width={14} height={6} rx={2} fill="#f59e0b" />
        {/* wheels */}
        <Circle cx={44} cy={88} r={13} fill="#1f2937" />
        <Circle cx={44} cy={88} r={5} fill="#9ca3af" />
        <Circle cx={112} cy={88} r={13} fill="#1f2937" />
        <Circle cx={112} cy={88} r={5} fill="#9ca3af" />
        <Circle cx={184} cy={88} r={13} fill="#1f2937" />
        <Circle cx={184} cy={88} r={5} fill="#9ca3af" />
      </Svg>
      </View>
    </View>
    <View style={styles.body}>
      <Text style={styles.label}>ඔබ වෙත එන Truck එක</Text>
      <View style={styles.plateRow}>
        <LkPlate plate={truck.plate} fontSize={22} />
      </View>
      <Text style={styles.line}>{truck.model} · {truck.color}</Text>
      <Text style={styles.line}>රියදුරු: {truck.driver}</Text>
      <Text style={styles.note}>{body}</Text>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard },
    photo: { height: 150, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    drawing: { zIndex: 1 },
    body: { padding: 14, gap: 6 },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    plateRow: { flexDirection: 'row' },
    line: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    note: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
  })
);
