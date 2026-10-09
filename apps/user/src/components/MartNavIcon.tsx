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

type IconProps = { active: boolean; size?: number };

// The OnMart tab icons: the same two-tone style as MartIcon and the main tab bar (ink body, accent details).

/** Shops: a storefront with an awning and a door. */
export const ShopsIcon: React.FC<IconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.2 10.2h15.6v9.3a1.8 1.8 0 0 1-1.8 1.8H6a1.8 1.8 0 0 1-1.8-1.8z" fill={c.ink} />
      <Path d="M3.2 3.2h17.6l1.2 5a2.6 2.6 0 0 1-4.6 1.9 2.6 2.6 0 0 1-4.4 0 2.6 2.6 0 0 1-4.4 0A2.6 2.6 0 0 1 2 8.2z" fill={c.accent} />
      <Rect x={9.6} y={13.6} width={4.8} height={7.7} rx={1} fill={c.accent} />
    </Svg>
  );
};

/** My requests: a clipboard with lines and a tick. */
export const RequestsIcon: React.FC<IconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4.2} y={3.6} width={15.6} height={18.2} rx={2.4} fill={c.ink} />
      <Rect x={8.2} y={2} width={7.6} height={4} rx={1.6} fill={c.accent} />
      <Path d="M8 11h8M8 14.6h5" stroke={c.accent} strokeWidth={1.9} strokeLinecap="round" fill="none" />
      <Path d="M8 18.2l1.4 1.4 2.6-2.8" stroke={c.accent} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
};

/** Open wall: a megaphone calling out to every shop. */
export const WallIcon: React.FC<IconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 9.6h4.2l8.2-4.6a1 1 0 0 1 1.5.9v12.2a1 1 0 0 1-1.5.9l-8.2-4.6H3a1.2 1.2 0 0 1-1.2-1.2v-2.4A1.2 1.2 0 0 1 3 9.6z" fill={c.ink} />
      <Path d="M7.6 15.2l1.2 4.4a1.4 1.4 0 0 0 1.4 1h.8a1 1 0 0 0 1-1.3l-1.3-3.9z" fill={c.accent} />
      <Path d="M19.4 9.2a4.2 4.2 0 0 1 0 5.6M21.6 6.8a7.4 7.4 0 0 1 0 10.4" stroke={c.accent} strokeWidth={1.9} strokeLinecap="round" fill="none" />
    </Svg>
  );
};

/** Orders: a parcel box with tape. */
export const OrdersIcon: React.FC<IconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.2l8.6 4.3v10.9L12 21.8l-8.6-4.4V6.5z" fill={c.ink} />
      <Path d="M3.4 6.5L12 10.8l8.6-4.3" stroke={c.accent} strokeWidth={1.7} strokeLinejoin="round" fill="none" />
      <Path d="M12 10.8v11" stroke={c.accent} strokeWidth={1.7} fill="none" />
      <Path d="M7.6 4.3l8.6 4.4v3.2" stroke={c.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
};
