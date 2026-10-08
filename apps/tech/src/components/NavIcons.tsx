import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

// Two-tone tab icons in the owner app's style: a filled "ink" body with "accent" details, on a 24×24 grid.
export type NavIconProps = { active: boolean; size?: number };

/** Jobs: a spanner crossed with a screwdriver. */
export const JobsIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20.4 4.2l-3 3 .5 2.2 2.2.5 3-3a5.3 5.3 0 0 0-5.7-6.3L14 2.7l2 2z" fill={c.accent} />
      <Path d="M13.7 8.6L3.3 19a1.9 1.9 0 0 0 2.7 2.7l10.4-10.4a5.3 5.3 0 0 1-2.7-2.7z" fill={c.ink} />
      <Circle cx={5.4} cy={19.6} r={1} fill={c.accent} />
    </Svg>
  );
};

/** Garages: the workshop with its roller shutter. */
export const GaragesIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M1.4 9.3L12 2.4l10.6 6.9v12.3h-3.6V12H5v9.6H1.4z" fill={c.ink} />
      <Rect x={6.3} y={13.3} width={11.4} height={2.2} rx={0.6} fill={c.accent} />
      <Rect x={6.3} y={16.5} width={11.4} height={2.2} rx={0.6} fill={c.accent} />
      <Rect x={6.3} y={19.7} width={11.4} height={1.9} rx={0.6} fill={c.accent} />
    </Svg>
  );
};

/** Earnings: a coin with a stack behind it. */
export const EarningsIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2} y={15.6} width={20} height={5.2} rx={2.6} fill={c.accent} />
      <Circle cx={12} cy={9.6} r={8} fill={c.ink} />
      <Path d="M12 5.2v8.8M14.6 7.6c-.5-.7-1.4-1-2.6-1-1.5 0-2.4.6-2.4 1.6 0 2.3 5.2 1 5.2 3.4 0 1-.9 1.7-2.6 1.7-1.2 0-2.2-.4-2.7-1.2" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
};

/** Profile: the technician's account. */
export const ProfileIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.6a4.9 4.9 0 1 1 0 9.8a4.9 4.9 0 0 1 0-9.8z" fill={c.ink} />
      <Path d="M3.2 21.4c0-4.3 3.9-7.1 8.8-7.1s8.8 2.8 8.8 7.1z" fill={c.ink} />
      <Rect x={9} y={17.6} width={6} height={2.2} rx={1.1} fill={c.accent} />
    </Svg>
  );
};
