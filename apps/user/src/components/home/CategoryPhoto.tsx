import React from 'react';
import { Image, Text, View } from 'react-native';
import { categoryInfo } from '@ongarage/shared';
import { CATEGORY_ICON_FIT, CATEGORY_IMAGES } from '../../constants/home';

/**
 * A service category's artwork as supplied (a cut-out with its own shadow baked in, so no ring or extra
 * shadow), nudged and scaled by CATEGORY_ICON_FIT so every icon looks the same size and sits centred.
 * A category without artwork falls back to its emoji.
 */
export const CategoryPhoto: React.FC<{ categoryId: string; size?: number }> = ({ categoryId, size = 46 }) => {
  const image = CATEGORY_IMAGES[categoryId];
  const fit = CATEGORY_ICON_FIT[categoryId] ?? { scale: 1, dx: 0, dy: 0 };
  if (!image) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.6 }}>{categoryInfo(categoryId).icon}</Text>
      </View>
    );
  }
  return (
    <Image
      source={image}
      style={{ width: size, height: size, transform: [{ translateX: fit.dx * size }, { translateY: fit.dy * size }, { scale: fit.scale }] }}
      resizeMode="contain"
    />
  );
};
