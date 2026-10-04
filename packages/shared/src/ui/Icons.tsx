import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

// Minimal stroke icons (Feather geometry) so status icons share one weight and tint.
export type IconName = 'check-circle' | 'clock' | 'alert-triangle' | 'chevron-down' | 'x';

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
