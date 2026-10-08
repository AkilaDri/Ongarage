import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

// Two-tone tab icons in the owner app's style: a filled "ink" body with "accent" details, on a 24×24 grid.
export type NavIconProps = { active: boolean; size?: number };

/** Requests: a clipboard with lines. */
export const RequestsIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.6} y={3.8} width={16.8} height={18} rx={2.8} fill={c.ink} />
      <Rect x={8.2} y={1.8} width={7.6} height={4.4} rx={1.6} fill={c.accent} />
      <Rect x={7} y={10} width={10} height={1.9} rx={0.95} fill={c.accent} />
      <Rect x={7} y={13.8} width={10} height={1.9} rx={0.95} fill={c.accent} />
      <Rect x={7} y={17.6} width={6} height={1.9} rx={0.95} fill={c.accent} />
    </Svg>
  );
};

/** Orders: a delivery van. */
export const OrdersIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M1.6 5.6a2 2 0 0 1 2-2h9.6v12.8H1.6z" fill={c.ink} />
      <Path d="M14.8 7.4h3.7l3.9 4.4v4.6h-7.6z" fill={c.ink} />
      <Path d="M16.4 9.2v2.6h3.1z" fill={c.accent} />
      <Circle cx={7} cy={17.6} r={2.7} fill={c.accent} />
      <Circle cx={17.4} cy={17.6} r={2.7} fill={c.accent} />
    </Svg>
  );
};

/** Stock: stacked boxes. */
export const StockIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={1.8} y={2.6} width={20.4} height={5.4} rx={1.6} fill={c.ink} />
      <Path d="M3.4 9.4h17.2v10a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4z" fill={c.ink} />
      <Rect x={8.6} y={12} width={6.8} height={2.2} rx={1.1} fill={c.accent} />
    </Svg>
  );
};

/** Shop: the storefront with its awning. */
export const ShopIcon: React.FC<NavIconProps> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.2 8.2L4.4 3h15.2l2.2 5.2z" fill={c.accent} />
      <Path d="M3.2 9.8h17.6v11.6H3.2z" fill={c.ink} />
      <Rect x={9.2} y={13.4} width={5.6} height={8} rx={0.8} fill={c.accent} />
    </Svg>
  );
};
