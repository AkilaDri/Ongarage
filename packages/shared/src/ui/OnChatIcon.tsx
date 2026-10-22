import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../theme/fonts';

/** The OnChat icon: a speech bubble outline with its tail at the bottom left and the word ONCHAT inside it. */
export const OnChatIcon: React.FC<{ width?: number; color: string; /** A colour to fill the bubble with; the word and outline are then `color` on it. */ fill?: string }> = ({ width = 44, color, fill }) => {
  const height = Math.round((width * 26) / 44);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 68 40" style={StyleSheet.absoluteFill}>
        <Path d="M10 2h48a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8H26l-10 7v-7h-6a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8z" stroke={fill ?? color} strokeWidth={2} strokeLinejoin="round" fill={fill ?? 'none'} />
      </Svg>
      {/* Written inline: a theme style would scale a size this small up. */}
      <Text style={{ color, fontSize: (width * 8.5) / 44, lineHeight: (width * 10) / 44, fontFamily: FONTS.bodyBold, letterSpacing: 0.1, marginTop: -(width * 2) / 44 }}>ONCHAT</Text>
    </View>
  );
};
