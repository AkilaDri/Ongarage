import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

// Minimal stroke icons (Feather geometry) so status icons share one weight and tint.
export type IconName = 'check-circle' | 'clock' | 'alert-triangle' | 'chevron-down' | 'x' | 'inbox' | 'tag' | 'calendar';

export const Icon: React.FC<{ name: IconName; size?: number; color: string; strokeWidth?: number }> = ({
  name,
  size = 16,
  color,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {name === 'check-circle' && (
      <>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <Polyline points="22 4 12 14.01 9 11.01" />
      </>
    )}
    {name === 'clock' && (
      <>
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
      </>
    )}
    {name === 'chevron-down' && <Polyline points="6 9 12 15 18 9" />}
    {name === 'inbox' && (
      <>
        <Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </>
    )}
    {name === 'tag' && (
      <>
        <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <Line x1="7" y1="7" x2="7.01" y2="7" />
      </>
    )}
    {name === 'calendar' && (
      <>
        <Path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <Line x1="16" y1="2" x2="16" y2="6" />
        <Line x1="8" y1="2" x2="8" y2="6" />
        <Line x1="3" y1="10" x2="21" y2="10" />
      </>
    )}
    {name === 'x' && (
      <>
        <Line x1="18" y1="6" x2="6" y2="18" />
        <Line x1="6" y1="6" x2="18" y2="18" />
      </>
    )}
    {name === 'alert-triangle' && (
      <>
        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <Line x1="12" y1="9" x2="12" y2="13" />
        <Line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    )}
  </Svg>
);
