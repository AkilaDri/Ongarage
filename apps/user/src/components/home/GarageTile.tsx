import { cardGlow, outline } from '../../utils/material';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, InfoChip, LEVELS, getThemeMode, marketPrice, themedStyles, type Garage } from '@ongarage/shared';
import { garageProfileContent } from '../../constants/garageProfile';
import { GARAGE_COVERS, GARAGE_INFO } from '../../constants/home';
import { MakeLogo } from '../MakeLogo';
import { BookedTag } from '../BookedTag';

/**
 * A garage at a glance: one big photo, its name, and a single line of the details that
 * decide a tap (rating, distance, how fast it replies). Optional badge (an offer, or
 * "Ad" on paid placements) and a heart to save it.
 */
export const GarageTile: React.FC<{
  garage: Garage;
  width?: number | `${number}%`;
  ad?: boolean;
  /** Shows whether the garage is online (open) right now, as a tag on its photo. */
  showStatus?: boolean;
  /** Shows what an owner needs to choose a garage on the card itself: today's hours, how fast it replies, an estimate for this service, the makes it works on, 24/7 help and the photo count. */
  showDetails?: boolean;
  /** The service being browsed (the estimate is for it). */
  categoryId?: string;
  onOpen: () => void;
  onSaveChange: (saved: boolean) => void;
}> = ({ garage: g, width = 236, ad, showStatus, showDetails, categoryId, onOpen, onSaveChange }) => {
  const [saved, setSaved] = useState(false);
  const info = GARAGE_INFO[g.id];
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;
  const badge = ad ? 'දැන්වීම' : info?.offer;
  const content = showDetails ? garageProfileContent(g) : undefined;
  // Today's opening hours: the list starts on Monday.
  const today = content?.hours[(new Date().getDay() + 6) % 7];
  // An estimate for the browsed service; each garage prices a little differently (about -10% to +10% of the market price).
  const estimate = categoryId ? Math.round((marketPrice(categoryId) * (0.9 + ((Number(g.id) * 7) % 5) * 0.05)) / 50) * 50 : undefined;

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
        {content && (
          <View style={styles.photoCount} accessibilityLabel={`${content.gallery.length} photos`}>
            <Text style={styles.photoCountText}>📷 {content.gallery.length}</Text>
          </View>
        )}
        <BookedTag garageId={g.id} style={[styles.booked, content && styles.bookedHigh]} />
        {showStatus && (
          <View style={styles.status} accessibilityLabel={g.status === 'open' ? 'Garage is online' : 'Garage is offline'}>
            <View style={[styles.statusDot, g.status === 'open' ? styles.dotOn : styles.dotOff]} />
            <Text style={[styles.statusText, g.status === 'open' ? styles.textOn : styles.textOff]}>{g.status === 'open' ? 'Online' : 'Offline'}</Text>
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
        {content && (
          <View style={styles.details}>
            <InfoChip text={today?.open ? `🕒 ${today.open}` : '🕒 අද වසා ඇත'} />
            {estimate !== undefined && <InfoChip text={`💰 ආසන්න මිල රු. ${estimate.toLocaleString()} සිට`} />}
            {/* The makes the garage works on as their logos (a round badge each), not as words. */}
            {content.brands.length > 0 && (
              <View style={styles.logos} accessibilityLabel={`Works on ${content.brands.slice(0, 4).join(', ')}`}>
                {content.brands.slice(0, 4).map((m) => (
                  <View key={m} style={styles.logoBadge}>
                    <MakeLogo make={m} size={18} />
                  </View>
                ))}
              </View>
            )}
            {content.emergency24 && <InfoChip text="🌙 24/7 හදිසි සේවාව" />}
          </View>
        )}
      </View>
    </Pressable>
  );
};

// A stronger, softer shadow than the usual card one, so the garage cards stand clearly off the page.
const cardShadow = cardGlow;

const styles = themedStyles(() =>
  StyleSheet.create({
    tile: { borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), overflow: 'hidden', ...cardShadow() },
    pressed: { opacity: 0.85 },
    cover: { width: '100%', height: 128 },
    // Badges and the heart sit on the photo: fixed light chips readable in both themes.
    badge: { position: 'absolute', top: 8, left: 8, maxWidth: '70%', paddingHorizontal: 8, height: 22, justifyContent: 'center', borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
    badgeAd: { backgroundColor: 'rgba(15, 23, 42, 0.75)' },
    badgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#2563eb' },
    badgeAdText: { color: '#fff' },
    // Online / Offline sits on the photo's top right (where the save heart used to be); the heart is at the lower right: a light chip with a coloured dot, readable in both themes.
    status: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    dotOn: { backgroundColor: '#16a34a' },
    dotOff: { backgroundColor: '#94a3b8' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodyBold },
    textOn: { color: '#137333' },
    textOff: { color: '#5f6368' },
    heart: { position: 'absolute', bottom: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center' },
    heartText: { fontSize: 16, color: '#334155', marginTop: -1 },
    heartOn: { color: '#f43f5e' },
    booked: { position: 'absolute', left: 8, bottom: 8 },
    bookedHigh: { bottom: 40 },
    photoCount: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.62)' },
    photoCountText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    logos: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logoBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    details: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    body: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
    name: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    star: { color: Colors.warning, fontFamily: FONTS.bodyBold },
  })
);
