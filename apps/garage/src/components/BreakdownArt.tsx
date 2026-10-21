import React from 'react';
import { Image } from 'react-native';
import { GlassIcon, breakdownInfo } from '@ongarage/shared';
import { BREAKDOWN_IMAGES } from '../constants/breakdownImages';

/** An SOS breakdown type's artwork (as in the owner app); a type without a picture keeps its emoji on a soft disc. */
export const BreakdownArt: React.FC<{ id: string; size?: number }> = ({ id, size = 40 }) => {
  const image = BREAKDOWN_IMAGES[id];
  if (!image) return <GlassIcon emoji={breakdownInfo(id).icon} small={size <= 44} />;
  return <Image source={image} style={{ width: size, height: size }} resizeMode="contain" />;
};
