import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../theme/fonts';

/**
 * The OnChat icon, the standard long form: a solid speech bubble with its tail at the bottom left and the word ONCHAT in white inside it.
 * `short`: the compact mark for a bar, a solid bubble (its fill, or `color`) with a big white ON in it.
 */
export const OnChatIcon: React.FC<{ width?: number; color: string; /** A colour to fill the bubble with; the word and outline are then `color` on it. */ fill?: string; short?: boolean; /** The compact mark's text in place of "ON" (an unread count). */ label?: string; /** The cards' contact button as a line icon: a phone handset (a call, the default) or a speech bubble (a message), drawn in `color`, with its count beside it. */ outline?: boolean; /** With `outline`: which glyph, a call (handset, the default) or a message (bubble). */ kind?: 'call' | 'message' }> = ({ width = 44, color, fill, short, label, outline, kind = 'call' }) => {
  // The cards' contact button as a line icon: a phone handset drawn in `color`, with the count of unread messages written beside it.
  if (outline) {
    const size = width * 0.95;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: width * 0.12 }}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={StyleSheet.absoluteFill}>
            {kind === 'message' ? (
              <Path d="M6.5 3.8h11A3.5 3.5 0 0 1 21 7.3v6.4a3.5 3.5 0 0 1-3.5 3.5h-6.3l-4.6 3.6a.6.6 0 0 1-1-.5v-3.1A3.5 3.5 0 0 1 3 13.7V7.3a3.5 3.5 0 0 1 3.5-3.5z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
            ) : (
            <Path d="M21 16.9v2.9a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 10.2 18.7a19.2 19.2 0 0 1-5.9-5.9A19.5 19.5 0 0 1 1.3 4.2 2 2 0 0 1 3.3 2h2.9a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
        </View>
        {!!label && <Text style={{ color, fontSize: width * 0.55, lineHeight: width * 0.66, fontFamily: FONTS.bodyBold, includeFontPadding: false }}>{label}</Text>}
      </View>
    );
  }
  if (short) {
    // The compact bubble: as tall as the full mark at the same display size, its body above a tail hanging below the left side.
    const height = Math.round((width * 40) / 46);
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={outline ? '-2 -2 50 44' : '0 0 46 40'} style={StyleSheet.absoluteFill}>
          <Path d="M8 0h30a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H18l-8 10v-10H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z" fill={outline ? 'none' : fill ?? color} stroke={outline ? color : undefined} strokeWidth={outline ? 2.6 : undefined} strokeLinejoin="round" />
        </Svg>
        <View style={{ height: (height * 30) / 40, alignItems: 'center', justifyContent: 'center' }}>
          {/* Written inline: a theme style would scale a size this small up. */}
          <Text style={{ color, fontSize: (13.4 * width) / 40, lineHeight: (16 * width) / 40, fontFamily: FONTS.bodyBold, includeFontPadding: false }}>{label ?? 'ON'}</Text>
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
