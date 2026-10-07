import React from 'react';
import { Image } from 'react-native';
import { CATEGORY_ICON_FIT, CATEGORY_IMAGES } from '../../constants/home';

/**
 * A service category's artwork as supplied (a cut-out with its own shadow baked in, so no ring or extra
 * shadow), nudged and scaled by CATEGORY_ICON_FIT so every icon looks the same size and sits centred.
 */
export const CategoryPhoto: React.FC<{ categoryId: string; size?: number }> = ({ categoryId, size = 46 }) => {
  const image = CATEGORY_IMAGES[categoryId];
  const fit = CATEGORY_ICON_FIT[categoryId] ?? { scale: 1, dx: 0, dy: 0 };
  return image ? (
    <Image
      source={image}
      style={{ width: size, height: size, transform: [{ translateX: fit.dx * size }, { translateY: fit.dy * size }, { scale: fit.scale }] }}
      resizeMode="contain"
    />
  ) : null;
};
