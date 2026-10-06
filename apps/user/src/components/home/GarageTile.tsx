import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LEVELS, themedStyles, type Garage } from '@ongarage/shared';
import { GARAGE_COVERS, GARAGE_INFO } from '../../constants/home';

/**
 * A garage at a glance: one big photo, its name, and a single line of the details that
 * decide a tap (rating, distance, how fast it replies). Optional badge (an offer, or
 * "Ad" on paid placements) and a heart to save it.
 */
export const GarageTile: React.FC<{
  garage: Garage;
  width?: number | `${number}%`;
  ad?: boolean;
  onOpen: () => void;
  onSaveChange: (saved: boolean) => void;
}> = ({ garage: g, width = 236, ad, onOpen, onSaveChange }) => {
  const [saved, setSaved] = useState(false);
  const info = GARAGE_INFO[g.id];
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;
  const badge = ad ? 'දැන්වීම' : info?.offer;

  return (
    <Pressable style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]} onPress={onOpen} accessibilityLabel={`Garage ${g.name}`}>
      <View>
        <Image source={GARAGE_COVERS[g.id] ?? { uri: g.photos?.[0] }} style={styles.cover} resizeMode="cover" />
        {!!badge && (
          <View style={[styles.badge, ad && styles.badgeAd]}>
            <Text style={[styles.badgeText, ad && styles.badgeAdText]} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        )}
        <Pressable
          style={styles.heart}
          hitSlop={8}
          onPress={() => {
            const next = !saved;
            setSaved(next);
            onSaveChange(next);
          }}
          accessibilityLabel={`Save ${g.name}`}
        >
          <Text style={[styles.heartText, saved && styles.heartOn]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {level ? `${level.icon} ` : ''}
          {g.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.star}>★ {g.rating.toFixed(1)}</Text> ({g.reviews}) • කි.මී. {g.distance}
          {info ? ` • ~මිනි. ${info.replyMin}` : ''}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    tile: { borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden' },
    pressed: { opacity: 0.85 },
    cover: { width: '100%', height: 128 },
    // Badges and the heart sit on the photo: fixed light chips readable in both themes.
    badge: { position: 'absolute', top: 8, left: 8, maxWidth: '70%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
    badgeAd: { backgroundColor: 'rgba(15, 23, 42, 0.75)' },
    badgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#2563eb' },
    badgeAdText: { color: '#fff' },
    heart: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center' },
    heartText: { fontSize: 16, color: '#334155', marginTop: -1 },
    heartOn: { color: '#f43f5e' },
    body: { paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
    name: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
  })
);
