import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { outline } from '../utils/material';
import { MAKE_LOGOS } from '../constants/makeLogos';

/** A vehicle make as its logo (drawn from its outline path, in the page's ink colour); a make without a logo shows its first letter. */
export const MakeLogo: React.FC<{ make: string; size?: number; color?: string }> = ({ make, size = 26, color = Colors.textMain }) => {
  const d = MAKE_LOGOS[make];
  if (!d) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.6, fontFamily: FONTS.titleBold, color }}>{make.slice(0, 1)}</Text>
      </View>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={color} />
    </Svg>
  );
};

/** The makes a garage works on: each a round tile with the logo and the name under it. */
export const MakeLogoRow: React.FC<{ makes: string[] }> = ({ makes }) => (
  <View style={styles.row}>
    {makes.map((m) => (
      <View key={m} style={styles.item} accessibilityLabel={`Works on ${m}`}>
        <View style={styles.tile}>
          <MakeLogo make={m} size={28} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {m === 'Mercedes-Benz' ? 'Mercedes' : m}
        </Text>
      </View>
    ))}
  </View>
);

/** The makes a garage works on as one slim row of round logo badges (no names: each has its name as an accessibility label), for under the garage's name. */
export const MakeLogoStrip: React.FC<{ makes: string[] }> = ({ makes }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} accessibilityLabel="Makes this garage works on">
    {makes.map((m) => (
      <View key={m} style={styles.badge} accessibilityLabel={`Works on ${m}`}>
        <MakeLogo make={m} size={20} />
      </View>
    ))}
  </ScrollView>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    strip: { gap: 8, paddingTop: 4, paddingBottom: 0 },
    badge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    item: { width: 62, alignItems: 'center', gap: 5 },
    tile: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    name: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft, textAlign: 'center' },
  })
);
