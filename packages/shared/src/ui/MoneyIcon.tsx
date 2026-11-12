import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

/** Two green banknotes (one behind the other) with a dollar coin on the front one: the sign for a price. */
export const MoneyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size * 1.25} height={size} viewBox="0 0 30 24" fill="none">
    <Path d="M7 3h21v15h-2V5H7z" fill="#3f7d2c" />
    <Rect x={1} y={7} width={24} height={15} rx={1} fill="#3f7d2c" />
    <Path d="M5 10h16v9H5z" fill="#86c96f" />
    <Circle cx={13} cy={14.5} r={4.2} fill="#3f7d2c" />
    <SvgText x={13} y={17.2} fontSize={7.5} fontWeight="bold" fill="#ffffff" textAnchor="middle">
      $
    </SvgText>
  </Svg>
);

/** A price with the money icon after it (the text keeps whatever style it had). */
export const MoneyText: React.FC<{ style?: StyleProp<TextStyle>; iconSize?: number; children: React.ReactNode }> = ({ style, iconSize = 18, children }) => (
  <View style={styles.row}>
    <Text style={style}>{children}</Text>
    <MoneyIcon size={iconSize} />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
