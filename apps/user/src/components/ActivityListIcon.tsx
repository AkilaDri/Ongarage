import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

/**
 * The Activity tab icon: a clipboard with a ticked job list. Drawn as bold outlines on the bar's own background (not a
 * filled shape), so it reads clearly at tab size; two-tone like the other tab icons.
 */
export const ActivityListIcon: React.FC<{ active: boolean; size?: number }> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* the board */}
      <Rect x={4.2} y={4.4} width={15.6} height={17.4} rx={2.8} stroke={c.ink} strokeWidth={2.2} fill="none" />
      {/* the clip */}
      <Rect x={8.2} y={1.8} width={7.6} height={4.6} rx={1.6} fill={c.accent} />
      {/* two ticked jobs */}
      <Path d="M7.6 11.2l1.5 1.5 2.5-2.9" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M13.4 11.4h3" stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7.6 16.6l1.5 1.5 2.5-2.9" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M13.4 16.8h3" stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};
