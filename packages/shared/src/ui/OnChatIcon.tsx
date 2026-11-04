import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../theme/fonts';

/**
 * The OnChat icon, the standard long form: a solid speech bubble with its tail at the bottom left and the word ONCHAT in white inside it.
 * `short`: the compact mark for a bar, a solid bubble (its fill, or `color`) with a big white ON in it.
 */
export const OnChatIcon: React.FC<{ width?: number; color: string; /** A colour to fill the bubble with; the word and outline are then `color` on it. */ fill?: string; short?: boolean; /** The compact mark's text in place of "ON" (an unread count). */ label?: string }> = ({ width = 44, color, fill, short, label }) => {
  if (short) {
    // The compact bubble: as tall as the full mark at the same display size, its body above a tail hanging below the left side.
    const height = Math.round((width * 40) / 46);
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox="0 0 46 40" style={StyleSheet.absoluteFill}>
          <Path d="M8 0h30a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H18l-8 10v-10H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z" fill={fill ?? color} />
        </Svg>
        <View style={{ height: (height * 30) / 40, alignItems: 'center', justifyContent: 'center' }}>
          {/* Written inline: a theme style would scale a size this small up. */}
          <Text style={{ color, fontSize: 13.4, lineHeight: 16, fontFamily: FONTS.bodyBold, includeFontPadding: false }}>{label ?? 'ON'}</Text>
        </View>
      </View>
    );
  }
  const height = Math.round((width * 26) / 44);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 68 40" style={StyleSheet.absoluteFill}>
        <Path d="M10 2h48a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8H26l-10 7v-7h-6a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8z" fill={fill ?? color} />
      </Svg>
      {/* Written inline: a theme style would scale a size this small up. */}
      <Text style={{ color: '#ffffff', fontSize: (width * 8.5) / 44, lineHeight: (width * 10) / 44, fontFamily: FONTS.bodyBold, letterSpacing: 0.1, marginTop: -(width * 2) / 44 }}>ONCHAT</Text>
    </View>
  );
};
