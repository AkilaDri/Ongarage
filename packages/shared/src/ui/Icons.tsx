import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

// Minimal stroke icons (Feather geometry) so status icons share one weight and tint.
export type IconName = 'check-circle' | 'clock' | 'alert-triangle' | 'chevron-down' | 'x' | 'inbox' | 'tag' | 'calendar' | 'trash' | 'phone' | 'camera' | 'send' | 'search' | 'arrow-left' | 'message-circle' | 'check-check' | 'paperclip' | 'mic' | 'smile' | 'image' | 'plus-circle';

export const Icon: React.FC<{ name: IconName; size?: number; color: string; strokeWidth?: number }> = ({
  name,
  size = 16,
  color,
  strokeWidth = 1.8,
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
    {name === 'trash' && (
      <>
        <Polyline points="3 6 5 6 21 6" />
        <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <Line x1="10" y1="11" x2="10" y2="17" />
        <Line x1="14" y1="11" x2="14" y2="17" />
      </>
    )}
    {name === 'phone' && <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />}
    {name === 'camera' && (
      <>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <Circle cx="12" cy="13" r="4" />
      </>
    )}
    {name === 'send' && (
      <>
        <Line x1="22" y1="2" x2="11" y2="13" />
        <Path d="M22 2L15 22l-4-9-9-4z" />
      </>
    )}
    {name === 'paperclip' && <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />}
    {name === 'mic' && (
      <>
        <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <Line x1="12" y1="19" x2="12" y2="23" />
      </>
    )}
    {name === 'smile' && (
      <>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <Line x1="9" y1="9" x2="9.01" y2="9" />
        <Line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    )}
    {name === 'search' && (
      <>
        <Circle cx="11" cy="11" r="8" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    )}
    {name === 'arrow-left' && (
      <>
        <Line x1="19" y1="12" x2="5" y2="12" />
        <Polyline points="12 19 5 12 12 5" />
      </>
    )}
    {name === 'message-circle' && <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />}
    {name === 'check-check' && (
      <>
        <Polyline points="2 13 7 18 17 7" />
        <Polyline points="12 16 14 18 22 7" />
      </>
    )}
    {name === 'image' && (
      <>
        <Path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <Circle cx="8.5" cy="8.5" r="1.5" />
        <Polyline points="21 15 16 10 5 21" />
      </>
    )}
    {name === 'plus-circle' && (
      <>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="8" x2="12" y2="16" />
        <Line x1="8" y1="12" x2="16" y2="12" />
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
