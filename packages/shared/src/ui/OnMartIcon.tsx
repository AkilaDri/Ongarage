import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** The OnMart mark as a one-colour glyph (a shopping bag with a cog on it), for buttons and labels where the two-tone tab icon is too much. */
export const OnMartIcon: React.FC<{ size?: number; color: string }> = ({ size = 16, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6.2 7.4h11.6l1.1 12.4a1.4 1.4 0 0 1-1.4 1.5H6.5a1.4 1.4 0 0 1-1.4-1.5z" />
    <Path d="M8.8 9.8V7.2a3.2 3.2 0 0 1 6.4 0v2.6" />
    <Circle cx={12} cy={15} r={2.1} />
  </Svg>
);

/** The OnMart glyph followed by a label, in the colour of the label's own text style (the buttons that ask a shop something). */
export const OnMartAsk: React.FC<{ label: string; textStyle?: StyleProp<TextStyle>; size?: number }> = ({ label, textStyle, size = 16 }) => {
  const color = ((StyleSheet.flatten(textStyle) as TextStyle | undefined)?.color as string | undefined) ?? '#ffffff';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <OnMartIcon size={size} color={color} />
      <Text style={textStyle}>{label}</Text>
    </View>
  );
};
