import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { navIconTones } from '@ongarage/shared';

/** A calendar (like the Schedule's) with a coin on its page: the calendar of the money, in the same line style as the bottom bar. */
export const MoneyCalendarIcon: React.FC<{ size?: number }> = ({ size = 26 }) => {
  const t = navIconTones(true);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6h16v14H4z" />
      <Path d="M4 10.5h16" />
      <Path d="M8 3.5v4M16 3.5v4" />
      <Circle cx={12} cy={15.5} r={3} fill={t.accent} fillOpacity={0.3} />
      <Path d="M12 14.2v2.6" />
    </Svg>
  );
};
