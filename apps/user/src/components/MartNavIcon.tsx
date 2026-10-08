import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

// Hand-drawn two-tone OnMart icon (a shopping bag), in the style of the other tab icons.
// NavIcons.tsx is generated from the designer's SVGs, so this one lives on its own.
export const MartIcon: React.FC<{ active: boolean; size?: number }> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.4 8.2V6.6a3.6 3.6 0 0 1 7.2 0v1.6" stroke={c.accent} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M3.6 8.2h16.8l-1.3 11.7a2.2 2.2 0 0 1-2.2 1.9H7.1a2.2 2.2 0 0 1-2.2-1.9z" fill={c.ink} />
      <Rect x={9.2} y={12.6} width={5.6} height={2.3} rx={1.15} fill={c.accent} />
    </Svg>
  );
};
