import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

// Two-tone tab icons in the owner app's style (assets/updated_icons there): a filled "ink"
// body with "accent" details, on a 24×24 grid.
export type NavIconProps = { active: boolean; size?: number };

/** SOS: a breakdown beacon. */
export const SOSIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1.3v2.2M4.4 4.5l1.5 1.5M19.6 4.5l-1.5 1.5M1.7 11.2h2.1M20.2 11.2h2.1"
        stroke={c.accent}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M5.5 18.6V13.2a6.5 6.5 0 0 1 13 0v5.4z" fill={c.ink} />
      <Path d="M9.2 13.4a2.9 2.9 0 0 1 2.8-2.9" stroke={c.accent} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      <Rect x={3.4} y={19.3} width={17.2} height={3.3} rx={1.2} fill={c.accent} />
    </Svg>
  );
};

/** Jobs: a work briefcase (bid jobs and direct requests). */
export const JobsIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.6 6.6V5a2 2 0 0 1 2-2h2.8a2 2 0 0 1 2 2v1.6" stroke={c.accent} strokeWidth={2} fill="none" />
      <Rect x={1.8} y={6.6} width={20.4} height={14.6} rx={2.6} fill={c.ink} />
      <Rect x={1.8} y={12.2} width={20.4} height={1.9} fill={c.accent} />
      <Rect x={9.9} y={10.7} width={4.2} height={4.9} rx={1.1} fill={c.accent} />
    </Svg>
  );
};

/** Schedule: a calendar with booked days. */
export const ScheduleIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.3} y={4.2} width={19.4} height={17.6} rx={2.8} fill={c.ink} />
      <Rect x={6.3} y={1.8} width={2.5} height={4.8} rx={1.25} fill={c.accent} />
      <Rect x={15.2} y={1.8} width={2.5} height={4.8} rx={1.25} fill={c.accent} />
      <Rect x={5.6} y={11} width={3} height={3} rx={0.8} fill={c.accent} />
      <Rect x={10.5} y={11} width={3} height={3} rx={0.8} fill={c.accent} />
      <Rect x={15.4} y={11} width={3} height={3} rx={0.8} fill={c.accent} />
      <Rect x={5.6} y={15.9} width={3} height={3} rx={0.8} fill={c.accent} />
      <Rect x={10.5} y={15.9} width={3} height={3} rx={0.8} fill={c.accent} />
    </Svg>
  );
};

/** Parts: a gear with its hub. */
export const PartsIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fillRule="evenodd"
        d="M9.41 3.8L9.64 1.26L14.36 1.26L14.59 3.8L15.96 4.37L17.93 2.74L21.26 6.07L19.63 8.04L20.2 9.41L22.74 9.64L22.74 14.36L20.2 14.59L19.63 15.96L21.26 17.93L17.93 21.26L15.96 19.63L14.59 20.2L14.36 22.74L9.64 22.74L9.41 20.2L8.04 19.63L6.07 21.26L2.74 17.93L4.37 15.96L3.8 14.59L1.26 14.36L1.26 9.64L3.8 9.41L4.37 8.04L2.74 6.07L6.07 2.74L8.04 4.37Z M16.2 12a4.2 4.2 0 1 1-8.4 0a4.2 4.2 0 1 1 8.4 0Z"
        fill={c.ink}
      />
      <Rect x={9.5} y={9.5} width={5} height={5} rx={2.5} fill={c.accent} />
    </Svg>
  );
};

/** Garage: the workshop with its roller shutter. */
export const GarageIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
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

/** Profile: the garage owner's account. */
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
