import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** A calendar in a dark outline: two rings on top, a header line and a grid of dots (the page's calendar button). */
export const CalendarGridIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#1e293b' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} stroke={color} strokeWidth={1.9} />
    <Path d="M8 3v4M16 3v4M3.5 10h17" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    <Circle cx={8.5} cy={14} r={1.05} fill={color} />
    <Circle cx={12} cy={14} r={1.05} fill={color} />
    <Circle cx={15.5} cy={14} r={1.05} fill={color} />
    <Circle cx={8.5} cy={17.2} r={1.05} fill={color} />
    <Circle cx={12} cy={17.2} r={1.05} fill={color} />
  </Svg>
);
