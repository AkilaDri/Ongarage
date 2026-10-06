import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Colors, SERVICE_CATEGORIES, themedStyles } from '@ongarage/shared';
import { CATEGORY_IMAGES } from '../../constants/home';

/** A service category as a small round photo with a ring in the category's colour. */
export const CategoryPhoto: React.FC<{ categoryId: string; size?: number }> = ({ categoryId, size = 46 }) => {
  const cat = SERVICE_CATEGORIES.find((c) => c.id === categoryId);
  const image = CATEGORY_IMAGES[categoryId];
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: cat?.color ?? Colors.primary }]}>
      {image ? <Image source={image} style={[styles.photo, { borderRadius: size / 2 - 3 }]} /> : null}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    ring: { borderWidth: 2, padding: 2, backgroundColor: Colors.bgCard },
    photo: { width: '100%', height: '100%' },
  })
);
