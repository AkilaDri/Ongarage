import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

/** The Bids tab icon: a bill / quotation sheet with a torn zig-zag edge, a price line and a total, two-tone like the other tab icons. */
export const BidsBillIcon: React.FC<{ active: boolean; size?: number }> = ({ active, size = 26 }) => {
  const c = tones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* the paper, with a zig-zag torn bottom edge */}
      <Path d="M5.2 2.4h13.6a1.4 1.4 0 0 1 1.4 1.4v17.9l-2.3-1.6-2.3 1.6-2.3-1.6-2.3 1.6-2.3-1.6-2.3 1.6-2.3-1.6-1.2.8V3.8a1.4 1.4 0 0 1 1.4-1.4z" fill={c.ink} />
      {/* header line, item lines and the total */}
      <Rect x={7.6} y={5.6} width={5.2} height={1.8} rx={0.9} fill={c.accent} />
      <Rect x={7.6} y={9.6} width={8.8} height={1.4} rx={0.7} fill={c.accent} opacity={0.75} />
      <Rect x={7.6} y={12.4} width={8.8} height={1.4} rx={0.7} fill={c.accent} opacity={0.75} />
      <Rect x={7.6} y={16} width={4} height={2} rx={1} fill={c.accent} />
      <Rect x={13.2} y={16} width={3.2} height={2} rx={1} fill={c.accent} />
    </Svg>
  );
};
