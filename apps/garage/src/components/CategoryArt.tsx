import React from 'react';
import { Image, View } from 'react-native';
import { GlassIcon, SERVICE_CATEGORIES } from '@ongarage/shared';
import { CATEGORY_ICON_FIT, CATEGORY_IMAGES } from '../constants/categoryImages';

/**
 * A service category's artwork (the same pictures as the owner app's job categories), found from the category's emoji so any place that
 * only holds the emoji can show it. A job without a category picture (an SOS call, say) keeps its emoji on a soft disc.
 */
export const CategoryArt: React.FC<{ emoji: string; size?: number }> = ({ emoji, size = 40 }) => {
  const id = SERVICE_CATEGORIES.find((c) => c.icon === emoji)?.id;
  const image = id ? CATEGORY_IMAGES[id] : undefined;
  if (!id || !image) return <GlassIcon emoji={emoji} small={size <= 44} />;
  const fit = CATEGORY_ICON_FIT[id] ?? { scale: 1, dx: 0, dy: 0 };
  return (
    <View style={{ width: size, height: size }}>
      <Image source={image} style={{ width: size, height: size, transform: [{ translateX: fit.dx * size }, { translateY: fit.dy * size }, { scale: fit.scale }] }} resizeMode="contain" />
    </View>
  );
};
